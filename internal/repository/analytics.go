package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnalyticsRepository struct {
	db *pgxpool.Pool
}

func NewAnalyticsRepository(db *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// RecordView records that a user viewed another user's profile
func (r *AnalyticsRepository) RecordView(ctx context.Context, viewerID, viewedID uuid.UUID) error {
	query := `
		INSERT INTO profile_views (viewer_id, viewed_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (viewer_id, viewed_id) DO UPDATE SET created_at = NOW()
	`
	_, err := r.db.Exec(ctx, query, viewerID, viewedID)
	return err
}

// GetViewCount returns the number of profile views since a given time
func (r *AnalyticsRepository) GetViewCount(ctx context.Context, userID uuid.UUID, since time.Time) (int, error) {
	query := `SELECT COUNT(*) FROM profile_views WHERE viewed_id = $1 AND created_at >= $2`
	var count int
	err := r.db.QueryRow(ctx, query, userID, since).Scan(&count)
	return count, err
}

// GetTotalViewCount returns the total number of profile views
func (r *AnalyticsRepository) GetTotalViewCount(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM profile_views WHERE viewed_id = $1`
	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

// GetRecentViewers returns recent viewers (premium feature)
func (r *AnalyticsRepository) GetRecentViewers(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error) {
	query := `
		SELECT viewer_id FROM profile_views
		WHERE viewed_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.db.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var viewers []uuid.UUID
	for rows.Next() {
		var viewerID uuid.UUID
		if err := rows.Scan(&viewerID); err != nil {
			return nil, err
		}
		viewers = append(viewers, viewerID)
	}
	return viewers, rows.Err()
}

// ProfileAnalytics contains analytics data for a profile
type ProfileAnalytics struct {
	TotalViews     int         `json:"total_views"`
	ViewsThisWeek  int         `json:"views_this_week"`
	ViewsToday     int         `json:"views_today"`
	RecentViewers  []uuid.UUID `json:"recent_viewers,omitempty"` // Only for premium
}

// GetProfileAnalytics returns analytics for a user's profile
func (r *AnalyticsRepository) GetProfileAnalytics(ctx context.Context, userID uuid.UUID, includePremium bool) (*ProfileAnalytics, error) {
	analytics := &ProfileAnalytics{}

	// Get total views
	total, err := r.GetTotalViewCount(ctx, userID)
	if err != nil {
		return nil, err
	}
	analytics.TotalViews = total

	// Get views this week
	weekAgo := time.Now().AddDate(0, 0, -7)
	weekViews, err := r.GetViewCount(ctx, userID, weekAgo)
	if err != nil {
		return nil, err
	}
	analytics.ViewsThisWeek = weekViews

	// Get views today (use UTC for consistent timezone)
	today := time.Now().UTC().Truncate(24 * time.Hour)
	todayViews, err := r.GetViewCount(ctx, userID, today)
	if err != nil {
		return nil, err
	}
	analytics.ViewsToday = todayViews

	// Get recent viewers (premium only)
	if includePremium {
		viewers, err := r.GetRecentViewers(ctx, userID, 10)
		if err != nil {
			return nil, err
		}
		analytics.RecentViewers = viewers
	}

	return analytics, nil
}
