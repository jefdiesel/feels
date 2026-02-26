package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminReport represents a user report for admin view
type AdminReport struct {
	ID          uuid.UUID  `json:"id"`
	ReporterID  uuid.UUID  `json:"reporter_id"`
	ReportedID  uuid.UUID  `json:"reported_id"`
	Reason      string     `json:"reason"`
	Description *string    `json:"description,omitempty"`
	Status      string     `json:"status"`
	ReviewedBy  *uuid.UUID `json:"reviewed_by,omitempty"`
	ReviewedAt  *time.Time `json:"reviewed_at,omitempty"`
	ActionTaken *string    `json:"action_taken,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// AdminUserDetails contains detailed user info for admin view
type AdminUserDetails struct {
	ID               uuid.UUID  `json:"id"`
	Email            string     `json:"email"`
	Name             string     `json:"name"`
	ModerationStatus string     `json:"moderation_status"`
	ShadowbanReason  *string    `json:"shadowban_reason,omitempty"`
	ShadowbannedAt   *time.Time `json:"shadowbanned_at,omitempty"`
	IsAdmin          bool       `json:"is_admin"`
	CreatedAt        time.Time  `json:"created_at"`
	ReportCount      int        `json:"report_count"`
	WarningCount     int        `json:"warning_count"`
}

// AdminVerificationRequest represents a pending verification for admin review
type AdminVerificationRequest struct {
	UserID               uuid.UUID `json:"user_id"`
	Name                 string    `json:"name"`
	VerificationPhotoURL string    `json:"verification_photo_url"`
	ProfilePhotoURL      string    `json:"profile_photo_url"`
	SubmittedAt          time.Time `json:"submitted_at"`
}

// AdminModerationEntry represents a flagged content entry
type AdminModerationEntry struct {
	ID             uuid.UUID  `json:"id"`
	MessageID      *uuid.UUID `json:"message_id,omitempty"`
	UserID         uuid.UUID  `json:"user_id"`
	FlaggedContent string     `json:"flagged_content"`
	FlagType       string     `json:"flag_type"`
	Confidence     float64    `json:"confidence"`
	ActionTaken    string     `json:"action_taken"`
	CreatedAt      time.Time  `json:"created_at"`
}

type AdminRepository struct {
	db *pgxpool.Pool
}

func NewAdminRepository(db *pgxpool.Pool) *AdminRepository {
	return &AdminRepository{db: db}
}

// GetPendingReports returns reports pending review
func (r *AdminRepository) GetPendingReports(ctx context.Context, limit int) ([]AdminReport, error) {
	query := `
		SELECT id, reporter_id, reported_id, reason, description,
		       COALESCE(status, 'pending') as status, reviewed_by, reviewed_at, action_taken, created_at
		FROM reports
		WHERE status IS NULL OR status = 'pending'
		ORDER BY created_at DESC
		LIMIT $1
	`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []AdminReport
	for rows.Next() {
		var report AdminReport
		if err := rows.Scan(
			&report.ID, &report.ReporterID, &report.ReportedID,
			&report.Reason, &report.Description, &report.Status,
			&report.ReviewedBy, &report.ReviewedAt, &report.ActionTaken, &report.CreatedAt,
		); err != nil {
			return nil, err
		}
		reports = append(reports, report)
	}
	return reports, rows.Err()
}

// GetReportByID returns a specific report
func (r *AdminRepository) GetReportByID(ctx context.Context, id uuid.UUID) (*AdminReport, error) {
	query := `
		SELECT id, reporter_id, reported_id, reason, description,
		       COALESCE(status, 'pending') as status, reviewed_by, reviewed_at, action_taken, created_at
		FROM reports WHERE id = $1
	`
	var report AdminReport
	err := r.db.QueryRow(ctx, query, id).Scan(
		&report.ID, &report.ReporterID, &report.ReportedID,
		&report.Reason, &report.Description, &report.Status,
		&report.ReviewedBy, &report.ReviewedAt, &report.ActionTaken, &report.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &report, nil
}

// UpdateReportStatus updates a report's status
func (r *AdminRepository) UpdateReportStatus(ctx context.Context, id uuid.UUID, status, actionTaken string, reviewerID uuid.UUID) error {
	query := `
		UPDATE reports SET
			status = $2,
			action_taken = $3,
			reviewed_by = $4,
			reviewed_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, id, status, actionTaken, reviewerID)
	return err
}

// GetUserDetailsForAdmin returns detailed user info including moderation history
func (r *AdminRepository) GetUserDetailsForAdmin(ctx context.Context, userID uuid.UUID) (*AdminUserDetails, error) {
	query := `
		SELECT
			u.id, u.email, COALESCE(p.name, '') as name,
			COALESCE(u.moderation_status, 'active') as moderation_status,
			u.shadowban_reason, u.shadowbanned_at,
			COALESCE(u.is_admin, false) as is_admin,
			u.created_at,
			(SELECT COUNT(*) FROM reports WHERE reported_id = u.id) as report_count,
			0 as warning_count
		FROM users u
		LEFT JOIN profiles p ON p.user_id = u.id
		WHERE u.id = $1
	`
	var details AdminUserDetails
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&details.ID, &details.Email, &details.Name,
		&details.ModerationStatus, &details.ShadowbanReason, &details.ShadowbannedAt,
		&details.IsAdmin, &details.CreatedAt, &details.ReportCount, &details.WarningCount,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &details, nil
}

// GetVerificationQueue returns pending verification requests
func (r *AdminRepository) GetVerificationQueue(ctx context.Context, limit int) ([]AdminVerificationRequest, error) {
	query := `
		SELECT p.user_id, p.name, p.verification_photo_url,
		       COALESCE((SELECT photo_url FROM profile_photos WHERE profile_id = p.id ORDER BY position LIMIT 1), '') as profile_photo_url,
		       COALESCE(p.verification_submitted_at, p.updated_at) as submitted_at
		FROM profiles p
		WHERE p.verification_status = 'pending'
		ORDER BY p.verification_submitted_at ASC
		LIMIT $1
	`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []AdminVerificationRequest
	for rows.Next() {
		var req AdminVerificationRequest
		if err := rows.Scan(
			&req.UserID, &req.Name, &req.VerificationPhotoURL,
			&req.ProfilePhotoURL, &req.SubmittedAt,
		); err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}
	return requests, rows.Err()
}

// UpdateVerificationStatus approves or rejects a verification
func (r *AdminRepository) UpdateVerificationStatus(ctx context.Context, userID uuid.UUID, status string) error {
	query := `
		UPDATE profiles SET
			verification_status = $2
		WHERE user_id = $1
	`
	_, err := r.db.Exec(ctx, query, userID, status)
	return err
}

// GetModerationQueue returns content flagged for manual review
func (r *AdminRepository) GetModerationQueue(ctx context.Context, limit int) ([]AdminModerationEntry, error) {
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

	var entries []AdminModerationEntry
	for rows.Next() {
		var entry AdminModerationEntry
		if err := rows.Scan(
			&entry.ID, &entry.MessageID, &entry.UserID, &entry.FlaggedContent,
			&entry.FlagType, &entry.Confidence, &entry.ActionTaken, &entry.CreatedAt,
		); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

// UpdateModerationAction updates the action taken on a flagged item
func (r *AdminRepository) UpdateModerationAction(ctx context.Context, id uuid.UUID, action string) error {
	query := `UPDATE moderation_logs SET action_taken = $2 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id, action)
	return err
}
