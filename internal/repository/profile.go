package repository

import (
	"context"
	"encoding/json"
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
	promptsJSON, err := json.Marshal(p.Prompts)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO profiles (
			user_id, name, dob, gender, zip_code, neighborhood, bio, prompts,
			kink_level, looking_for, zodiac, religion, has_kids, wants_kids,
			alcohol, weed, lat, lng, is_verified, last_active, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
		)
	`
	_, err = r.db.Exec(ctx, query,
		p.UserID, p.Name, p.DOB, p.Gender, p.ZipCode, p.Neighborhood, p.Bio, promptsJSON,
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
		SELECT user_id, name, dob, gender, zip_code, neighborhood, bio, COALESCE(prompts, '[]'::jsonb),
			kink_level, looking_for, zodiac, religion, has_kids, wants_kids,
			alcohol, weed, lat, lng, is_verified, last_active, created_at, share_code
		FROM profiles WHERE user_id = $1
	`
	var p profile.Profile
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.Name, &p.DOB, &p.Gender, &p.ZipCode, &p.Neighborhood, &p.Bio, &p.Prompts,
		&p.KinkLevel, &p.LookingFor, &p.Zodiac, &p.Religion, &p.HasKids, &p.WantsKids,
		&p.Alcohol, &p.Weed, &p.Lat, &p.Lng, &p.IsVerified, &p.LastActive, &p.CreatedAt, &p.ShareCode,
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
	promptsJSON, err := json.Marshal(p.Prompts)
	if err != nil {
		return err
	}

	query := `
		UPDATE profiles SET
			name = $2, neighborhood = $3, bio = $4, prompts = $5, kink_level = $6,
			looking_for = $7, zodiac = $8, religion = $9, has_kids = $10,
			wants_kids = $11, alcohol = $12, weed = $13, lat = $14, lng = $15,
			last_active = NOW()
		WHERE user_id = $1
	`
	result, err := r.db.Exec(ctx, query,
		p.UserID, p.Name, p.Neighborhood, p.Bio, promptsJSON, p.KinkLevel,
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

func (r *ProfileRepository) GetNameByUserID(ctx context.Context, userID uuid.UUID) (string, error) {
	query := `SELECT COALESCE(name, '') FROM profiles WHERE user_id = $1`
	var name string
	err := r.db.QueryRow(ctx, query, userID).Scan(&name)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return name, nil
}

func (r *ProfileRepository) SetVerified(ctx context.Context, userID uuid.UUID, verified bool) error {
	query := `UPDATE profiles SET is_verified = $2 WHERE user_id = $1`
	result, err := r.db.Exec(ctx, query, userID, verified)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrProfileNotFound
	}
	return nil
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

// Photo Verification Methods

func (r *ProfileRepository) SetVerificationPhoto(ctx context.Context, userID uuid.UUID, photoURL, status string) error {
	query := `
		UPDATE profiles SET
			verification_photo_url = $2,
			verification_status = $3,
			verification_submitted_at = NOW()
		WHERE user_id = $1
	`
	_, err := r.db.Exec(ctx, query, userID, photoURL, status)
	return err
}

func (r *ProfileRepository) GetVerificationStatus(ctx context.Context, userID uuid.UUID) (string, error) {
	query := `SELECT COALESCE(verification_status, 'none') FROM profiles WHERE user_id = $1`
	var status string
	err := r.db.QueryRow(ctx, query, userID).Scan(&status)
	return status, err
}

func (r *ProfileRepository) GetPendingVerifications(ctx context.Context, limit int) ([]profile.VerificationRequest, error) {
	query := `
		SELECT p.user_id, p.name, (SELECT url FROM photos WHERE user_id = p.user_id ORDER BY position LIMIT 1) as photo_url,
			p.verification_photo_url, p.verification_submitted_at
		FROM profiles p
		WHERE p.verification_status = 'pending'
		ORDER BY p.verification_submitted_at
		LIMIT $1
	`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []profile.VerificationRequest
	for rows.Next() {
		var req profile.VerificationRequest
		var photoURL, verifyURL *string
		if err := rows.Scan(&req.UserID, &req.Name, &photoURL, &verifyURL, &req.SubmittedAt); err != nil {
			return nil, err
		}
		if photoURL != nil {
			req.PhotoURL = *photoURL
		}
		if verifyURL != nil {
			req.VerifyURL = *verifyURL
		}
		requests = append(requests, req)
	}
	return requests, rows.Err()
}

func (r *ProfileRepository) ApproveVerification(ctx context.Context, userID, adminID uuid.UUID) error {
	query := `
		UPDATE profiles SET
			verification_status = 'approved',
			is_verified = true
		WHERE user_id = $1
	`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *ProfileRepository) RejectVerification(ctx context.Context, userID, adminID uuid.UUID) error {
	query := `
		UPDATE profiles SET
			verification_status = 'rejected',
			verification_photo_url = NULL
		WHERE user_id = $1
	`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// Share Code Methods

// GetByShareCode returns a profile by its share code (for public profile viewing)
func (r *ProfileRepository) GetByShareCode(ctx context.Context, code string) (*profile.Profile, error) {
	query := `
		SELECT user_id, name, dob, gender, zip_code, neighborhood, bio, COALESCE(prompts, '[]'::jsonb),
			kink_level, looking_for, zodiac, religion, has_kids, wants_kids,
			alcohol, weed, lat, lng, is_verified, last_active, created_at, share_code
		FROM profiles WHERE share_code = $1
	`
	var p profile.Profile
	err := r.db.QueryRow(ctx, query, code).Scan(
		&p.UserID, &p.Name, &p.DOB, &p.Gender, &p.ZipCode, &p.Neighborhood, &p.Bio, &p.Prompts,
		&p.KinkLevel, &p.LookingFor, &p.Zodiac, &p.Religion, &p.HasKids, &p.WantsKids,
		&p.Alcohol, &p.Weed, &p.Lat, &p.Lng, &p.IsVerified, &p.LastActive, &p.CreatedAt, &p.ShareCode,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, err
	}

	photos, err := r.GetPhotos(ctx, p.UserID)
	if err != nil {
		return nil, err
	}
	p.Photos = photos

	return &p, nil
}

// GetOrCreateShareCode gets the share code for a user, creating one if it doesn't exist
func (r *ProfileRepository) GetOrCreateShareCode(ctx context.Context, userID uuid.UUID) (string, error) {
	// First check if share code exists
	var code *string
	err := r.db.QueryRow(ctx, `SELECT share_code FROM profiles WHERE user_id = $1`, userID).Scan(&code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrProfileNotFound
		}
		return "", err
	}

	if code != nil && *code != "" {
		return *code, nil
	}

	// Generate a cryptographically random share code using PostgreSQL's gen_random_bytes
	// Encode as base36 (alphanumeric) and take 8 characters for URL-friendly codes
	newCode := ""
	err = r.db.QueryRow(ctx, `
		UPDATE profiles
		SET share_code = UPPER(SUBSTRING(REPLACE(REPLACE(ENCODE(gen_random_bytes(6), 'base64'), '/', ''), '+', '') FROM 1 FOR 8))
		WHERE user_id = $1
		RETURNING share_code
	`, userID).Scan(&newCode)
	if err != nil {
		return "", err
	}

	return newCode, nil
}
