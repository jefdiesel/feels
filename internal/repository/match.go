package repository

import (
	"context"
	"errors"

	"github.com/feels/feels/internal/domain/match"
	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrMatchNotFound = errors.New("match not found")
	ErrNotInMatch    = errors.New("user not in match")
)

type MatchRepository struct {
	db *pgxpool.Pool
}

func NewMatchRepository(db *pgxpool.Pool) *MatchRepository {
	return &MatchRepository{db: db}
}

// Create creates a new match
func (r *MatchRepository) Create(ctx context.Context, m *match.Match) error {
	query := `
		INSERT INTO matches (id, user1_id, user2_id, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user1_id, user2_id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, m.ID, m.User1ID, m.User2ID, m.CreatedAt)
	return err
}

// GetByID gets a match by ID
func (r *MatchRepository) GetByID(ctx context.Context, matchID uuid.UUID) (*match.Match, error) {
	query := `SELECT id, user1_id, user2_id, created_at FROM matches WHERE id = $1`
	var m match.Match
	err := r.db.QueryRow(ctx, query, matchID).Scan(&m.ID, &m.User1ID, &m.User2ID, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMatchNotFound
		}
		return nil, err
	}
	return &m, nil
}

// GetByUsers gets a match between two users
func (r *MatchRepository) GetByUsers(ctx context.Context, user1ID, user2ID uuid.UUID) (*match.Match, error) {
	// Ensure consistent ordering
	u1, u2 := match.OrderedUserIDs(user1ID, user2ID)
	query := `SELECT id, user1_id, user2_id, created_at FROM matches WHERE user1_id = $1 AND user2_id = $2`
	var m match.Match
	err := r.db.QueryRow(ctx, query, u1, u2).Scan(&m.ID, &m.User1ID, &m.User2ID, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMatchNotFound
		}
		return nil, err
	}
	return &m, nil
}

// GetUserMatches gets all matches for a user with other user's profile
func (r *MatchRepository) GetUserMatches(ctx context.Context, userID uuid.UUID) ([]match.MatchWithProfile, error) {
	query := `
		SELECT
			m.id,
			m.created_at,
			p.user_id, p.name, p.dob, p.gender, p.zip_code, p.neighborhood, p.bio,
			p.kink_level, p.looking_for, p.zodiac, p.religion, p.has_kids, p.wants_kids,
			p.alcohol, p.weed, p.lat, p.lng, p.is_verified, p.last_active, p.created_at,
			(SELECT content FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) AS last_message,
			(SELECT sender_id FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) AS last_sender,
			(SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) AS last_msg_time,
			COALESCE(ip.enabled, false) AS image_enabled,
			(SELECT COUNT(*) FROM messages WHERE match_id = m.id AND sender_id != $1 AND read_at IS NULL) AS unread_count
		FROM matches m
		JOIN profiles p ON p.user_id = CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END
		LEFT JOIN image_permissions ip ON ip.match_id = m.id AND ip.user_id = $1
		WHERE m.user1_id = $1 OR m.user2_id = $1
		ORDER BY COALESCE(
			(SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1),
			m.created_at
		) DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var matches []match.MatchWithProfile
	for rows.Next() {
		var mwp match.MatchWithProfile
		var lastMsgContent *string
		var lastMsgSender *uuid.UUID
		var lastMsgTime *interface{}

		err := rows.Scan(
			&mwp.ID, &mwp.CreatedAt,
			&mwp.OtherUser.UserID, &mwp.OtherUser.Name, &mwp.OtherUser.DOB, &mwp.OtherUser.Gender,
			&mwp.OtherUser.ZipCode, &mwp.OtherUser.Neighborhood, &mwp.OtherUser.Bio,
			&mwp.OtherUser.KinkLevel, &mwp.OtherUser.LookingFor, &mwp.OtherUser.Zodiac,
			&mwp.OtherUser.Religion, &mwp.OtherUser.HasKids, &mwp.OtherUser.WantsKids,
			&mwp.OtherUser.Alcohol, &mwp.OtherUser.Weed, &mwp.OtherUser.Lat, &mwp.OtherUser.Lng,
			&mwp.OtherUser.IsVerified, &mwp.OtherUser.LastActive, &mwp.OtherUser.CreatedAt,
			&lastMsgContent, &lastMsgSender, &lastMsgTime,
			&mwp.ImageEnabled,
			&mwp.UnreadCount,
		)
		if err != nil {
			return nil, err
		}

		if lastMsgContent != nil && lastMsgSender != nil {
			mwp.LastMessage = &match.MessagePreview{
				Content:  *lastMsgContent,
				SenderID: *lastMsgSender,
			}
		}

		// Get photos for other user
		photos, err := r.getPhotos(ctx, mwp.OtherUser.UserID)
		if err != nil {
			return nil, err
		}
		mwp.OtherUser.Photos = photos

		matches = append(matches, mwp)
	}

	return matches, rows.Err()
}

func (r *MatchRepository) getPhotos(ctx context.Context, userID uuid.UUID) ([]profile.Photo, error) {
	query := `SELECT id, user_id, url, position, created_at FROM photos WHERE user_id = $1 ORDER BY position`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photos []profile.Photo
	for rows.Next() {
		var p profile.Photo
		if err := rows.Scan(&p.ID, &p.UserID, &p.URL, &p.Position, &p.CreatedAt); err != nil {
			return nil, err
		}
		photos = append(photos, p)
	}
	return photos, rows.Err()
}

// Delete removes a match (unmatch)
func (r *MatchRepository) Delete(ctx context.Context, matchID, userID uuid.UUID) error {
	// Verify user is in the match
	query := `DELETE FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`
	result, err := r.db.Exec(ctx, query, matchID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotInMatch
	}
	return nil
}

// IsUserInMatch checks if a user is part of a match
func (r *MatchRepository) IsUserInMatch(ctx context.Context, matchID, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2))`
	var exists bool
	err := r.db.QueryRow(ctx, query, matchID, userID).Scan(&exists)
	return exists, err
}

// GetOtherUserID returns the other user's ID in a match
func (r *MatchRepository) GetOtherUserID(ctx context.Context, matchID, userID uuid.UUID) (uuid.UUID, error) {
	query := `SELECT CASE WHEN user1_id = $2 THEN user2_id ELSE user1_id END FROM matches WHERE id = $1`
	var otherID uuid.UUID
	err := r.db.QueryRow(ctx, query, matchID, userID).Scan(&otherID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, ErrMatchNotFound
		}
		return uuid.Nil, err
	}
	return otherID, nil
}
