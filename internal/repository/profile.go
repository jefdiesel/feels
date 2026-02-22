package repository

import (
	"context"
	"errors"

	"github.com/feels/feels/internal/domain/profile"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrProfileNotFound     = errors.New("profile not found")
	ErrProfileExists       = errors.New("profile already exists")
	ErrPreferencesNotFound = errors.New("preferences not found")
	ErrPhotoNotFound       = errors.New("photo not found")
	ErrMaxPhotos           = errors.New("maximum 5 photos allowed")
)

type ProfileRepository struct {
	db *pgxpool.Pool
}

func NewProfileRepository(db *pgxpool.Pool) *ProfileRepository {
	return &ProfileRepository{db: db}
}

func (r *ProfileRepository) Create(ctx context.Context, p *profile.Profile) error {
	query := `
		INSERT INTO profiles (
			user_id, name, dob, gender, zip_code, neighborhood, bio,
			kink_level, looking_for, zodiac, religion, has_kids, wants_kids,
			alcohol, weed, lat, lng, is_verified, last_active, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
		)
	`
	_, err := r.db.Exec(ctx, query,
		p.UserID, p.Name, p.DOB, p.Gender, p.ZipCode, p.Neighborhood, p.Bio,
		p.KinkLevel, p.LookingFor, p.Zodiac, p.Religion, p.HasKids, p.WantsKids,
		p.Alcohol, p.Weed, p.Lat, p.Lng, p.IsVerified, p.LastActive, p.CreatedAt,
	)
	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrProfileExists
		}
		return err
	}
	return nil
}

func (r *ProfileRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*profile.Profile, error) {
	query := `
		SELECT user_id, name, dob, gender, zip_code, neighborhood, bio,
			kink_level, looking_for, zodiac, religion, has_kids, wants_kids,
			alcohol, weed, lat, lng, is_verified, last_active, created_at
		FROM profiles WHERE user_id = $1
	`
	var p profile.Profile
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.Name, &p.DOB, &p.Gender, &p.ZipCode, &p.Neighborhood, &p.Bio,
		&p.KinkLevel, &p.LookingFor, &p.Zodiac, &p.Religion, &p.HasKids, &p.WantsKids,
		&p.Alcohol, &p.Weed, &p.Lat, &p.Lng, &p.IsVerified, &p.LastActive, &p.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, err
	}

	photos, err := r.GetPhotos(ctx, userID)
	if err != nil {
		return nil, err
	}
	p.Photos = photos

	return &p, nil
}

func (r *ProfileRepository) Update(ctx context.Context, p *profile.Profile) error {
	query := `
		UPDATE profiles SET
			name = $2, neighborhood = $3, bio = $4, kink_level = $5,
			looking_for = $6, zodiac = $7, religion = $8, has_kids = $9,
			wants_kids = $10, alcohol = $11, weed = $12, lat = $13, lng = $14,
			last_active = NOW()
		WHERE user_id = $1
	`
	result, err := r.db.Exec(ctx, query,
		p.UserID, p.Name, p.Neighborhood, p.Bio, p.KinkLevel,
		p.LookingFor, p.Zodiac, p.Religion, p.HasKids,
		p.WantsKids, p.Alcohol, p.Weed, p.Lat, p.Lng,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrProfileNotFound
	}
	return nil
}

func (r *ProfileRepository) UpdateLastActive(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE profiles SET last_active = NOW() WHERE user_id = $1`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// Photos

func (r *ProfileRepository) GetPhotos(ctx context.Context, userID uuid.UUID) ([]profile.Photo, error) {
	query := `
		SELECT id, user_id, url, position, created_at
		FROM photos WHERE user_id = $1 ORDER BY position
	`
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

func (r *ProfileRepository) AddPhoto(ctx context.Context, photo *profile.Photo) error {
	// Check photo count
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM photos WHERE user_id = $1`, photo.UserID).Scan(&count)
	if err != nil {
		return err
	}
	if count >= 5 {
		return ErrMaxPhotos
	}

	// Get next position
	var maxPos int
	err = r.db.QueryRow(ctx, `SELECT COALESCE(MAX(position), 0) FROM photos WHERE user_id = $1`, photo.UserID).Scan(&maxPos)
	if err != nil {
		return err
	}
	photo.Position = maxPos + 1

	query := `
		INSERT INTO photos (id, user_id, url, position, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err = r.db.Exec(ctx, query, photo.ID, photo.UserID, photo.URL, photo.Position, photo.CreatedAt)
	return err
}

func (r *ProfileRepository) DeletePhoto(ctx context.Context, userID, photoID uuid.UUID) error {
	query := `DELETE FROM photos WHERE id = $1 AND user_id = $2`
	result, err := r.db.Exec(ctx, query, photoID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPhotoNotFound
	}
	return nil
}

func (r *ProfileRepository) ReorderPhotos(ctx context.Context, userID uuid.UUID, photoIDs []uuid.UUID) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, photoID := range photoIDs {
		_, err := tx.Exec(ctx,
			`UPDATE photos SET position = $1 WHERE id = $2 AND user_id = $3`,
			i+1, photoID, userID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// Preferences

func (r *ProfileRepository) CreatePreferences(ctx context.Context, p *profile.Preferences) error {
	query := `
		INSERT INTO preferences (
			user_id, genders_seeking, age_min, age_max, distance_miles,
			include_trans, visible_to_genders, hard_block_genders,
			hard_block_age_min, hard_block_age_max
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(ctx, query,
		p.UserID, p.GendersSeeking, p.AgeMin, p.AgeMax, p.DistanceMiles,
		p.IncludeTrans, p.VisibleToGenders, p.HardBlockGenders,
		p.HardBlockAgeMin, p.HardBlockAgeMax,
	)
	return err
}

func (r *ProfileRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*profile.Preferences, error) {
	query := `
		SELECT user_id, genders_seeking, age_min, age_max, distance_miles,
			include_trans, visible_to_genders, hard_block_genders,
			hard_block_age_min, hard_block_age_max
		FROM preferences WHERE user_id = $1
	`
	var p profile.Preferences
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.GendersSeeking, &p.AgeMin, &p.AgeMax, &p.DistanceMiles,
		&p.IncludeTrans, &p.VisibleToGenders, &p.HardBlockGenders,
		&p.HardBlockAgeMin, &p.HardBlockAgeMax,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPreferencesNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProfileRepository) UpdatePreferences(ctx context.Context, p *profile.Preferences) error {
	query := `
		UPDATE preferences SET
			genders_seeking = $2, age_min = $3, age_max = $4, distance_miles = $5,
			include_trans = $6, visible_to_genders = $7, hard_block_genders = $8,
			hard_block_age_min = $9, hard_block_age_max = $10
		WHERE user_id = $1
	`
	result, err := r.db.Exec(ctx, query,
		p.UserID, p.GendersSeeking, p.AgeMin, p.AgeMax, p.DistanceMiles,
		p.IncludeTrans, p.VisibleToGenders, p.HardBlockGenders,
		p.HardBlockAgeMin, p.HardBlockAgeMax,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrPreferencesNotFound
	}
	return nil
}
