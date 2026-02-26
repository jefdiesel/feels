package repository

import (
	"context"

	"github.com/feels/feels/internal/domain/moderation"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ModerationRepository struct {
	db *pgxpool.Pool
}

func NewModerationRepository(db *pgxpool.Pool) *ModerationRepository {
	return &ModerationRepository{db: db}
}

// LogModeration logs a moderation event
func (r *ModerationRepository) LogModeration(ctx context.Context, log *moderation.ModerationLog) error {
	query := `
		INSERT INTO moderation_logs (id, message_id, user_id, flagged_content, flag_type, confidence, action_taken, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(ctx, query,
		log.ID, log.MessageID, log.UserID, log.FlaggedContent,
		log.FlagType, log.Confidence, log.ActionTaken, log.CreatedAt,
	)
	return err
}

// GetModerationLogs returns moderation logs for a user
func (r *ModerationRepository) GetModerationLogs(ctx context.Context, userID uuid.UUID, limit int) ([]moderation.ModerationLog, error) {
	query := `
		SELECT id, message_id, user_id, flagged_content, flag_type, confidence, action_taken, created_at
		FROM moderation_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.db.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []moderation.ModerationLog
	for rows.Next() {
		var log moderation.ModerationLog
		if err := rows.Scan(
			&log.ID, &log.MessageID, &log.UserID, &log.FlaggedContent,
			&log.FlagType, &log.Confidence, &log.ActionTaken, &log.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, rows.Err()
}

// GetPendingReviews returns moderation logs pending review
func (r *ModerationRepository) GetPendingReviews(ctx context.Context, limit int) ([]moderation.ModerationLog, error) {
	query := `
		SELECT id, message_id, user_id, flagged_content, flag_type, confidence, action_taken, created_at
		FROM moderation_logs
		WHERE action_taken = 'flagged_for_review'
		ORDER BY created_at DESC
		LIMIT $1
	`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []moderation.ModerationLog
	for rows.Next() {
		var log moderation.ModerationLog
		if err := rows.Scan(
			&log.ID, &log.MessageID, &log.UserID, &log.FlaggedContent,
			&log.FlagType, &log.Confidence, &log.ActionTaken, &log.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, rows.Err()
}
