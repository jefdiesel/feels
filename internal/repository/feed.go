package repository

import (
	"context"

	"github.com/feels/feels/internal/domain/feed"
	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FeedRepository struct {
	db *pgxpool.Pool
}

func NewFeedRepository(db *pgxpool.Pool) *FeedRepository {
	return &FeedRepository{db: db}
}

// GetFeedProfiles returns profiles for the feed based on the algorithm
func (r *FeedRepository) GetFeedProfiles(ctx context.Context, userID uuid.UUID, prefs *profile.Preferences, limit int) ([]feed.FeedProfile, error) {
	// Complex query implementing the feed algorithm
	// Priority: qualified_superlike > qualified_like > gap_superlike > browse
	query := `
		WITH user_profile AS (
			SELECT lat, lng, gender FROM profiles WHERE user_id = $1
		),
		blocked_users AS (
			SELECT blocked_id FROM blocks WHERE blocker_id = $1
			UNION
			SELECT blocker_id FROM blocks WHERE blocked_id = $1
		),
		already_seen AS (
			SELECT liked_id FROM likes WHERE liker_id = $1
			UNION
			SELECT passed_id FROM passes WHERE passer_id = $1
		),
		matched_users AS (
			SELECT user1_id FROM matches WHERE user2_id = $1
			UNION
			SELECT user2_id FROM matches WHERE user1_id = $1
		),
		candidates AS (
			SELECT
				p.*,
				EXTRACT(YEAR FROM AGE(p.dob)) AS age,
				CASE
					WHEN up.lat IS NOT NULL AND up.lng IS NOT NULL AND p.lat IS NOT NULL AND p.lng IS NOT NULL
					THEN ROUND((3959 * acos(cos(radians(up.lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(up.lng)) + sin(radians(up.lat)) * sin(radians(p.lat))))::numeric, 0)::int
					ELSE NULL
				END AS distance,
				CASE
					WHEN l.is_superlike = true AND
						 p.gender = ANY($2) AND
						 EXTRACT(YEAR FROM AGE(p.dob)) BETWEEN $3 AND $4
					THEN 1  -- qualified_superlike
					WHEN l.id IS NOT NULL AND
						 p.gender = ANY($2) AND
						 EXTRACT(YEAR FROM AGE(p.dob)) BETWEEN $3 AND $4
					THEN 2  -- qualified_like
					WHEN l.is_superlike = true
					THEN 3  -- gap_superlike
					ELSE 4  -- browse
				END AS priority,
				l.is_superlike,
				l.created_at AS liked_at
			FROM profiles p
			CROSS JOIN user_profile up
			LEFT JOIN likes l ON l.liker_id = p.user_id AND l.liked_id = $1
			LEFT JOIN preferences target_prefs ON target_prefs.user_id = p.user_id
			WHERE p.user_id != $1
				AND p.user_id NOT IN (SELECT * FROM blocked_users)
				AND p.user_id NOT IN (SELECT * FROM already_seen)
				AND p.user_id NOT IN (SELECT * FROM matched_users)
				-- Visibility: user must be visible to our gender
				AND (target_prefs.visible_to_genders IS NULL OR up.gender = ANY(target_prefs.visible_to_genders))
				-- Hard blocks: user hasn't hard-blocked our gender
				AND (target_prefs.hard_block_genders IS NULL OR NOT up.gender = ANY(target_prefs.hard_block_genders))
		)
		SELECT
			user_id, name, dob, gender, zip_code, neighborhood, bio,
			kink_level, looking_for, zodiac, religion, has_kids, wants_kids,
			alcohol, weed, lat, lng, is_verified, last_active, created_at,
			age, distance, priority
		FROM candidates
		WHERE (priority <= 3) OR (
			-- For browse, apply all search criteria
			priority = 4 AND
			gender = ANY($2) AND
			age BETWEEN $3 AND $4 AND
			(distance IS NULL OR distance <= $5)
		)
		ORDER BY priority, liked_at DESC NULLS LAST, last_active DESC
		LIMIT $6
	`

	rows, err := r.db.Query(ctx, query,
		userID,
		prefs.GendersSeeking,
		prefs.AgeMin,
		prefs.AgeMax,
		prefs.DistanceMiles,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []feed.FeedProfile
	for rows.Next() {
		var fp feed.FeedProfile
		var priority int
		err := rows.Scan(
			&fp.UserID, &fp.Name, &fp.DOB, &fp.Gender, &fp.ZipCode, &fp.Neighborhood, &fp.Bio,
			&fp.KinkLevel, &fp.LookingFor, &fp.Zodiac, &fp.Religion, &fp.HasKids, &fp.WantsKids,
			&fp.Alcohol, &fp.Weed, &fp.Lat, &fp.Lng, &fp.IsVerified, &fp.LastActive, &fp.CreatedAt,
			&fp.Age, &fp.Distance, &priority,
		)
		if err != nil {
			return nil, err
		}

		switch priority {
		case 1:
			fp.Priority = feed.PriorityQualifiedSuperlike
		case 2:
			fp.Priority = feed.PriorityQualifiedLike
		case 3:
			fp.Priority = feed.PriorityGapSuperlike
		default:
			fp.Priority = feed.PriorityBrowse
		}

		profiles = append(profiles, fp)
	}

	// Fetch photos for each profile
	for i := range profiles {
		photos, err := r.getPhotos(ctx, profiles[i].UserID)
		if err != nil {
			return nil, err
		}
		profiles[i].Photos = photos
	}

	return profiles, rows.Err()
}

func (r *FeedRepository) getPhotos(ctx context.Context, userID uuid.UUID) ([]profile.Photo, error) {
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

// CountQueuedLikes returns the number of qualified likes waiting to be processed
func (r *FeedRepository) CountQueuedLikes(ctx context.Context, userID uuid.UUID, prefs *profile.Preferences) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM likes l
		JOIN profiles p ON p.user_id = l.liker_id
		WHERE l.liked_id = $1
			AND l.liker_id NOT IN (SELECT liked_id FROM likes WHERE liker_id = $1)
			AND l.liker_id NOT IN (SELECT passed_id FROM passes WHERE passer_id = $1)
			AND p.gender = ANY($2)
			AND EXTRACT(YEAR FROM AGE(p.dob)) BETWEEN $3 AND $4
	`
	var count int
	err := r.db.QueryRow(ctx, query, userID, prefs.GendersSeeking, prefs.AgeMin, prefs.AgeMax).Scan(&count)
	return count, err
}

// CreateLike creates a like record
func (r *FeedRepository) CreateLike(ctx context.Context, like *feed.Like) error {
	query := `
		INSERT INTO likes (id, liker_id, liked_id, is_superlike, created_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (liker_id, liked_id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, like.ID, like.LikerID, like.LikedID, like.IsSuperlike, like.CreatedAt)
	return err
}

// GetLike checks if a like exists
func (r *FeedRepository) GetLike(ctx context.Context, likerID, likedID uuid.UUID) (*feed.Like, error) {
	query := `SELECT id, liker_id, liked_id, is_superlike, created_at FROM likes WHERE liker_id = $1 AND liked_id = $2`
	var like feed.Like
	err := r.db.QueryRow(ctx, query, likerID, likedID).Scan(&like.ID, &like.LikerID, &like.LikedID, &like.IsSuperlike, &like.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &like, nil
}

// HasMutualLike checks if there's a mutual like (the other user liked us)
func (r *FeedRepository) HasMutualLike(ctx context.Context, userID, otherUserID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = $2)`
	var exists bool
	err := r.db.QueryRow(ctx, query, otherUserID, userID).Scan(&exists)
	return exists, err
}

// CreatePass creates a pass record
func (r *FeedRepository) CreatePass(ctx context.Context, pass *feed.Pass) error {
	query := `
		INSERT INTO passes (passer_id, passed_id, created_at)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, pass.PasserID, pass.PassedID, pass.CreatedAt)
	return err
}

// We need a passes table - let me create it in migration
// For now, use a simple table structure
func (r *FeedRepository) EnsurePassesTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS passes (
			passer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			passed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (passer_id, passed_id)
		)
	`
	_, err := r.db.Exec(ctx, query)
	return err
}

// GetDailyLikeCount gets the user's like count for today
func (r *FeedRepository) GetDailyLikeCount(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COALESCE(count, 0) FROM daily_likes WHERE user_id = $1 AND date = CURRENT_DATE`
	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, nil // No record means 0 likes today
	}
	return count, nil
}

// IncrementDailyLikeCount increments the daily like count
func (r *FeedRepository) IncrementDailyLikeCount(ctx context.Context, userID uuid.UUID) error {
	query := `
		INSERT INTO daily_likes (user_id, date, count)
		VALUES ($1, CURRENT_DATE, 1)
		ON CONFLICT (user_id, date) DO UPDATE SET count = daily_likes.count + 1
	`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// DeleteLikesForMatch removes the like records when a match is created
func (r *FeedRepository) DeleteLikesForMatch(ctx context.Context, user1ID, user2ID uuid.UUID) error {
	query := `DELETE FROM likes WHERE (liker_id = $1 AND liked_id = $2) OR (liker_id = $2 AND liked_id = $1)`
	_, err := r.db.Exec(ctx, query, user1ID, user2ID)
	return err
}

// CreatePassesTableMigration returns SQL for creating passes table
func CreatePassesTableMigration() string {
	return `
		CREATE TABLE IF NOT EXISTS passes (
			passer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			passed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (passer_id, passed_id)
		);
		CREATE INDEX IF NOT EXISTS idx_passes_passer_id ON passes(passer_id);
	`
}

func init() {
	// Register migration need - this would be better handled by a proper migration
	_ = CreatePassesTableMigration()
}
