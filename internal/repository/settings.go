package repository

import (
	"context"
	"errors"
	"time"

	"github.com/feels/feels/internal/domain/settings"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrSettingsNotFound = errors.New("settings not found")

type SettingsRepository struct {
	db *pgxpool.Pool
}

func NewSettingsRepository(db *pgxpool.Pool) *SettingsRepository {
	return &SettingsRepository{db: db}
}

// EnsureTables creates the settings tables if they don't exist
func (r *SettingsRepository) EnsureTables(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS notification_settings (
			user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			push_enabled BOOLEAN NOT NULL DEFAULT true,
			new_matches BOOLEAN NOT NULL DEFAULT true,
			new_messages BOOLEAN NOT NULL DEFAULT true,
			likes_received BOOLEAN NOT NULL DEFAULT true,
			super_likes BOOLEAN NOT NULL DEFAULT true,
			promotions BOOLEAN NOT NULL DEFAULT false,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS privacy_settings (
			user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			show_online_status BOOLEAN NOT NULL DEFAULT true,
			show_read_receipts BOOLEAN NOT NULL DEFAULT true,
			show_distance BOOLEAN NOT NULL DEFAULT true,
			hide_age BOOLEAN NOT NULL DEFAULT false,
			incognito_mode BOOLEAN NOT NULL DEFAULT false,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
	}

	for _, query := range queries {
		if _, err := r.db.Exec(ctx, query); err != nil {
			return err
		}
	}
	return nil
}

func (r *SettingsRepository) GetNotificationSettings(ctx context.Context, userID uuid.UUID) (*settings.NotificationSettings, error) {
	query := `SELECT user_id, push_enabled, new_matches, new_messages, likes_received, super_likes, promotions, updated_at
		FROM notification_settings WHERE user_id = $1`

	var s settings.NotificationSettings
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&s.UserID, &s.PushEnabled, &s.NewMatches, &s.NewMessages,
		&s.LikesReceived, &s.SuperLikes, &s.Promotions, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSettingsNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (r *SettingsRepository) UpsertNotificationSettings(ctx context.Context, s *settings.NotificationSettings) error {
	s.UpdatedAt = time.Now()
	query := `INSERT INTO notification_settings (user_id, push_enabled, new_matches, new_messages, likes_received, super_likes, promotions, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id) DO UPDATE SET
			push_enabled = EXCLUDED.push_enabled,
			new_matches = EXCLUDED.new_matches,
			new_messages = EXCLUDED.new_messages,
			likes_received = EXCLUDED.likes_received,
			super_likes = EXCLUDED.super_likes,
			promotions = EXCLUDED.promotions,
			updated_at = EXCLUDED.updated_at`

	_, err := r.db.Exec(ctx, query, s.UserID, s.PushEnabled, s.NewMatches, s.NewMessages, s.LikesReceived, s.SuperLikes, s.Promotions, s.UpdatedAt)
	return err
}

func (r *SettingsRepository) GetPrivacySettings(ctx context.Context, userID uuid.UUID) (*settings.PrivacySettings, error) {
	query := `SELECT user_id, show_online_status, show_read_receipts, show_distance, hide_age, incognito_mode, updated_at
		FROM privacy_settings WHERE user_id = $1`

	var s settings.PrivacySettings
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&s.UserID, &s.ShowOnlineStatus, &s.ShowReadReceipts, &s.ShowDistance,
		&s.HideAge, &s.IncognitoMode, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSettingsNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (r *SettingsRepository) UpsertPrivacySettings(ctx context.Context, s *settings.PrivacySettings) error {
	s.UpdatedAt = time.Now()
	query := `INSERT INTO privacy_settings (user_id, show_online_status, show_read_receipts, show_distance, hide_age, incognito_mode, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id) DO UPDATE SET
			show_online_status = EXCLUDED.show_online_status,
			show_read_receipts = EXCLUDED.show_read_receipts,
			show_distance = EXCLUDED.show_distance,
			hide_age = EXCLUDED.hide_age,
			incognito_mode = EXCLUDED.incognito_mode,
			updated_at = EXCLUDED.updated_at`

	_, err := r.db.Exec(ctx, query, s.UserID, s.ShowOnlineStatus, s.ShowReadReceipts, s.ShowDistance, s.HideAge, s.IncognitoMode, s.UpdatedAt)
	return err
}
