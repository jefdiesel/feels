package repository

import (
	"context"
	"errors"
	"time"

	"github.com/feels/feels/internal/domain/message"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrMessageNotFound = errors.New("message not found")
)

type MessageRepository struct {
	db *pgxpool.Pool
}

func NewMessageRepository(db *pgxpool.Pool) *MessageRepository {
	return &MessageRepository{db: db}
}

// Create creates a new message
func (r *MessageRepository) Create(ctx context.Context, msg *message.Message) error {
	query := `
		INSERT INTO messages (id, match_id, sender_id, content, encrypted_content, image_url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(ctx, query,
		msg.ID, msg.MatchID, msg.SenderID, msg.Content, msg.EncryptedContent, msg.ImageURL, msg.CreatedAt,
	)
	return err
}

// GetByID gets a message by ID
func (r *MessageRepository) GetByID(ctx context.Context, msgID uuid.UUID) (*message.Message, error) {
	query := `
		SELECT id, match_id, sender_id, content, encrypted_content, image_url, created_at, read_at
		FROM messages WHERE id = $1
	`
	var msg message.Message
	err := r.db.QueryRow(ctx, query, msgID).Scan(
		&msg.ID, &msg.MatchID, &msg.SenderID, &msg.Content, &msg.EncryptedContent, &msg.ImageURL, &msg.CreatedAt, &msg.ReadAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMessageNotFound
		}
		return nil, err
	}
	return &msg, nil
}

// GetByMatch gets messages for a match with pagination
func (r *MessageRepository) GetByMatch(ctx context.Context, matchID uuid.UUID, limit, offset int) ([]message.Message, error) {
	query := `
		SELECT id, match_id, sender_id, content, encrypted_content, image_url, created_at, read_at
		FROM messages
		WHERE match_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, matchID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []message.Message
	for rows.Next() {
		var msg message.Message
		if err := rows.Scan(&msg.ID, &msg.MatchID, &msg.SenderID, &msg.Content, &msg.EncryptedContent, &msg.ImageURL, &msg.CreatedAt, &msg.ReadAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, rows.Err()
}

// GetLastMessage gets the last message in a match
func (r *MessageRepository) GetLastMessage(ctx context.Context, matchID uuid.UUID) (*message.Message, error) {
	query := `
		SELECT id, match_id, sender_id, content, encrypted_content, image_url, created_at, read_at
		FROM messages
		WHERE match_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	var msg message.Message
	err := r.db.QueryRow(ctx, query, matchID).Scan(
		&msg.ID, &msg.MatchID, &msg.SenderID, &msg.Content, &msg.EncryptedContent, &msg.ImageURL, &msg.CreatedAt, &msg.ReadAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &msg, nil
}

// CountMessages counts messages in a match
func (r *MessageRepository) CountMessages(ctx context.Context, matchID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM messages WHERE match_id = $1`
	var count int
	err := r.db.QueryRow(ctx, query, matchID).Scan(&count)
	return count, err
}

// HasMessages returns true if a match has any messages
func (r *MessageRepository) HasMessages(ctx context.Context, matchID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM messages WHERE match_id = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, matchID).Scan(&exists)
	return exists, err
}

// Image Permissions

// GetImagePermission gets image permission for a user in a match
func (r *MessageRepository) GetImagePermission(ctx context.Context, matchID, userID uuid.UUID) (*message.ImagePermission, error) {
	query := `
		SELECT match_id, user_id, enabled, enabled_at
		FROM image_permissions
		WHERE match_id = $1 AND user_id = $2
	`
	var perm message.ImagePermission
	err := r.db.QueryRow(ctx, query, matchID, userID).Scan(
		&perm.MatchID, &perm.UserID, &perm.Enabled, &perm.EnabledAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &message.ImagePermission{
				MatchID: matchID,
				UserID:  userID,
				Enabled: false,
			}, nil
		}
		return nil, err
	}
	return &perm, nil
}

// GetBothImagePermissions gets image permissions for both users in a match
func (r *MessageRepository) GetBothImagePermissions(ctx context.Context, matchID, userID, otherUserID uuid.UUID) (youEnabled, theyEnabled bool, err error) {
	query := `
		SELECT user_id, enabled
		FROM image_permissions
		WHERE match_id = $1 AND user_id IN ($2, $3)
	`
	rows, err := r.db.Query(ctx, query, matchID, userID, otherUserID)
	if err != nil {
		return false, false, err
	}
	defer rows.Close()

	for rows.Next() {
		var uid uuid.UUID
		var enabled bool
		if err := rows.Scan(&uid, &enabled); err != nil {
			return false, false, err
		}
		if uid == userID {
			youEnabled = enabled
		} else {
			theyEnabled = enabled
		}
	}

	return youEnabled, theyEnabled, rows.Err()
}

// SetImagePermission sets image permission for a user in a match
func (r *MessageRepository) SetImagePermission(ctx context.Context, matchID, userID uuid.UUID, enabled bool) error {
	var enabledAt *time.Time
	if enabled {
		now := time.Now()
		enabledAt = &now
	}

	query := `
		INSERT INTO image_permissions (match_id, user_id, enabled, enabled_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (match_id, user_id) DO UPDATE SET
			enabled = $3,
			enabled_at = CASE WHEN $3 THEN COALESCE(image_permissions.enabled_at, $4) ELSE NULL END
	`
	_, err := r.db.Exec(ctx, query, matchID, userID, enabled, enabledAt)
	return err
}

// MarkMessagesRead marks all messages from a sender as read in a match
func (r *MessageRepository) MarkMessagesRead(ctx context.Context, matchID, readerID uuid.UUID) (int, error) {
	// Mark messages as read where the reader is NOT the sender (i.e., messages sent TO them)
	query := `
		UPDATE messages
		SET read_at = NOW()
		WHERE match_id = $1 AND sender_id != $2 AND read_at IS NULL
	`
	result, err := r.db.Exec(ctx, query, matchID, readerID)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

// CountUnreadMessages counts unread messages for a user in a match
func (r *MessageRepository) CountUnreadMessages(ctx context.Context, matchID, userID uuid.UUID) (int, error) {
	// Count messages where user is NOT the sender and read_at is NULL
	query := `
		SELECT COUNT(*) FROM messages
		WHERE match_id = $1 AND sender_id != $2 AND read_at IS NULL
	`
	var count int
	err := r.db.QueryRow(ctx, query, matchID, userID).Scan(&count)
	return count, err
}

// GetUnreadCountsForUser gets unread message counts for all of a user's matches
func (r *MessageRepository) GetUnreadCountsForUser(ctx context.Context, userID uuid.UUID) (map[uuid.UUID]int, error) {
	query := `
		SELECT m.match_id, COUNT(*)
		FROM messages m
		JOIN matches ma ON ma.id = m.match_id
		WHERE (ma.user1_id = $1 OR ma.user2_id = $1)
			AND m.sender_id != $1
			AND m.read_at IS NULL
		GROUP BY m.match_id
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[uuid.UUID]int)
	for rows.Next() {
		var matchID uuid.UUID
		var count int
		if err := rows.Scan(&matchID, &count); err != nil {
			return nil, err
		}
		counts[matchID] = count
	}
	return counts, rows.Err()
}

// DeleteByMatch deletes all messages for a match (used when unmatching)
func (r *MessageRepository) DeleteByMatch(ctx context.Context, matchID uuid.UUID) error {
	query := `DELETE FROM messages WHERE match_id = $1`
	_, err := r.db.Exec(ctx, query, matchID)
	return err
}
