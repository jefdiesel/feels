package repository

import (
	"context"
	"errors"

	"github.com/feels/feels/internal/domain/notification"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationRepository struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// EnsureTables creates the push_tokens table if it doesn't exist
func (r *NotificationRepository) EnsureTables(ctx context.Context) error {
	query := `CREATE TABLE IF NOT EXISTS push_tokens (
		id UUID PRIMARY KEY,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		token TEXT NOT NULL UNIQUE,
		platform TEXT NOT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`

	_, err := r.db.Exec(ctx, query)
	if err != nil {
		return err
	}

	// Create index on user_id for faster lookups
	_, err = r.db.Exec(ctx, `CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id)`)
	return err
}

func (r *NotificationRepository) SaveToken(ctx context.Context, token *notification.PushToken) error {
	query := `INSERT INTO push_tokens (id, user_id, token, platform, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (token) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			platform = EXCLUDED.platform,
			updated_at = EXCLUDED.updated_at`

	_, err := r.db.Exec(ctx, query,
		token.ID, token.UserID, token.Token, token.Platform, token.CreatedAt, token.UpdatedAt,
	)
	return err
}

func (r *NotificationRepository) GetTokensByUserID(ctx context.Context, userID uuid.UUID) ([]notification.PushToken, error) {
	query := `SELECT id, user_id, token, platform, created_at, updated_at
		FROM push_tokens WHERE user_id = $1`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []notification.PushToken
	for rows.Next() {
		var t notification.PushToken
		if err := rows.Scan(&t.ID, &t.UserID, &t.Token, &t.Platform, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tokens = append(tokens, t)
	}

	return tokens, rows.Err()
}

func (r *NotificationRepository) DeleteToken(ctx context.Context, token string) error {
	query := `DELETE FROM push_tokens WHERE token = $1`
	_, err := r.db.Exec(ctx, query, token)
	return err
}

func (r *NotificationRepository) DeleteUserTokens(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM push_tokens WHERE user_id = $1`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// NotificationSettingsRepository wraps the settings repo to provide notification-specific checks
type NotificationSettingsRepository struct {
	db *pgxpool.Pool
}

func NewNotificationSettingsRepository(db *pgxpool.Pool) *NotificationSettingsRepository {
	return &NotificationSettingsRepository{db: db}
}

func (r *NotificationSettingsRepository) GetNotificationSettings(ctx context.Context, userID uuid.UUID) (enabled bool, err error) {
	query := `SELECT push_enabled FROM notification_settings WHERE user_id = $1`

	err = r.db.QueryRow(ctx, query, userID).Scan(&enabled)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return true, nil // Default to enabled if no settings exist
		}
		return false, err
	}
	return enabled, nil
}

// UpdateLastNotificationTime updates the last notification time for a user (for rate limiting)
func (r *NotificationRepository) UpdateLastNotificationTime(ctx context.Context, userID uuid.UUID) error {
	// Could be used for rate limiting notifications
	return nil
}
