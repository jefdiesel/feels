package repository

import (
	"context"
	"time"

	"github.com/feels/feels/internal/domain/match"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BlockRepository struct {
	db *pgxpool.Pool
}

func NewBlockRepository(db *pgxpool.Pool) *BlockRepository {
	return &BlockRepository{db: db}
}

// Block creates a block between users
func (r *BlockRepository) Block(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	query := `
		INSERT INTO blocks (blocker_id, blocked_id, created_at)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, blockerID, blockedID, time.Now())
	return err
}

// Unblock removes a block
func (r *BlockRepository) Unblock(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	query := `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`
	_, err := r.db.Exec(ctx, query, blockerID, blockedID)
	return err
}

// IsBlocked checks if either user has blocked the other
func (r *BlockRepository) IsBlocked(ctx context.Context, user1ID, user2ID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM blocks
			WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
		)
	`
	var exists bool
	err := r.db.QueryRow(ctx, query, user1ID, user2ID).Scan(&exists)
	return exists, err
}

// GetBlockedByUser returns all users blocked by a user
func (r *BlockRepository) GetBlockedByUser(ctx context.Context, blockerID uuid.UUID) ([]uuid.UUID, error) {
	query := `SELECT blocked_id FROM blocks WHERE blocker_id = $1`
	rows, err := r.db.Query(ctx, query, blockerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocked []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		blocked = append(blocked, id)
	}
	return blocked, rows.Err()
}

// CreateReport creates a report
func (r *BlockRepository) CreateReport(ctx context.Context, report *match.Report) error {
	query := `
		INSERT INTO reports (id, reporter_id, reported_id, reason, details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(ctx, query,
		report.ID, report.ReporterID, report.ReportedID,
		report.Reason, report.Details, report.CreatedAt,
	)
	return err
}

// DeleteMatchBetweenUsers removes any match between two users (used when blocking)
func (r *BlockRepository) DeleteMatchBetweenUsers(ctx context.Context, user1ID, user2ID uuid.UUID) error {
	// Ensure consistent ordering for the query
	u1, u2 := match.OrderedUserIDs(user1ID, user2ID)
	query := `DELETE FROM matches WHERE user1_id = $1 AND user2_id = $2`
	_, err := r.db.Exec(ctx, query, u1, u2)
	return err
}

// DeleteLikesBetweenUsers removes any likes between two users (used when blocking)
func (r *BlockRepository) DeleteLikesBetweenUsers(ctx context.Context, user1ID, user2ID uuid.UUID) error {
	query := `DELETE FROM likes WHERE (liker_id = $1 AND liked_id = $2) OR (liker_id = $2 AND liked_id = $1)`
	_, err := r.db.Exec(ctx, query, user1ID, user2ID)
	return err
}
