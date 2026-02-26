package repository

import (
	"context"
	"errors"

	"github.com/feels/feels/internal/domain/user"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailExists       = errors.New("email already exists")
	ErrTokenNotFound     = errors.New("refresh token not found")
	ErrTokenExpired      = errors.New("refresh token expired")
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, u *user.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, email_verified, phone, phone_verified, device_id, totp_enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(ctx, query, u.ID, u.Email, u.PasswordHash, u.EmailVerified, u.Phone, u.PhoneVerified, u.DeviceID, u.TOTPEnabled, u.CreatedAt, u.UpdatedAt)
	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrEmailExists
		}
		return err
	}
	return nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*user.User, error) {
	query := `
		SELECT id, email, password_hash, email_verified, phone, phone_verified,
		       phone_verified_at, device_id, totp_secret, totp_enabled, totp_backup_codes,
		       created_at, updated_at
		FROM users WHERE id = $1
	`
	var u user.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerified, &u.Phone, &u.PhoneVerified,
		&u.PhoneVerifiedAt, &u.DeviceID, &u.TOTPSecret, &u.TOTPEnabled, &u.TOTPBackupCodes,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetEmail(ctx context.Context, userID uuid.UUID) (string, error) {
	query := `SELECT email FROM users WHERE id = $1`
	var email string
	err := r.db.QueryRow(ctx, query, userID).Scan(&email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrUserNotFound
		}
		return "", err
	}
	return email, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	query := `
		SELECT id, email, password_hash, email_verified, phone, phone_verified,
		       phone_verified_at, device_id, totp_secret, totp_enabled, totp_backup_codes,
		       created_at, updated_at
		FROM users WHERE email = $1
	`
	var u user.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerified, &u.Phone, &u.PhoneVerified,
		&u.PhoneVerifiedAt, &u.DeviceID, &u.TOTPSecret, &u.TOTPEnabled, &u.TOTPBackupCodes,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) CreateRefreshToken(ctx context.Context, token *user.RefreshToken) error {
	query := `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.Exec(ctx, query, token.ID, token.UserID, token.TokenHash, token.ExpiresAt, token.CreatedAt)
	return err
}

func (r *UserRepository) GetRefreshToken(ctx context.Context, tokenHash string) (*user.RefreshToken, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, created_at
		FROM refresh_tokens WHERE token_hash = $1
	`
	var token user.RefreshToken
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID, &token.UserID, &token.TokenHash, &token.ExpiresAt, &token.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, err
	}
	return &token, nil
}

func (r *UserRepository) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	query := `DELETE FROM refresh_tokens WHERE token_hash = $1`
	_, err := r.db.Exec(ctx, query, tokenHash)
	return err
}

func (r *UserRepository) DeleteUserRefreshTokens(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM refresh_tokens WHERE user_id = $1`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *UserRepository) GetByPhone(ctx context.Context, phone string) (*user.User, error) {
	query := `
		SELECT id, email, password_hash, email_verified, phone, phone_verified,
		       phone_verified_at, device_id, totp_secret, totp_enabled, totp_backup_codes,
		       created_at, updated_at
		FROM users WHERE phone = $1
	`
	var u user.User
	err := r.db.QueryRow(ctx, query, phone).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerified, &u.Phone, &u.PhoneVerified,
		&u.PhoneVerifiedAt, &u.DeviceID, &u.TOTPSecret, &u.TOTPEnabled, &u.TOTPBackupCodes,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) Update(ctx context.Context, u *user.User) error {
	query := `
		UPDATE users SET
			email = $2, password_hash = $3, email_verified = $4,
			phone = $5, phone_verified = $6, phone_verified_at = $7,
			device_id = $8, totp_secret = $9, totp_enabled = $10, totp_backup_codes = $11,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query,
		u.ID, u.Email, u.PasswordHash, u.EmailVerified,
		u.Phone, u.PhoneVerified, u.PhoneVerifiedAt,
		u.DeviceID, u.TOTPSecret, u.TOTPEnabled, u.TOTPBackupCodes,
	)
	return err
}

func (r *UserRepository) CreatePhoneVerification(ctx context.Context, v *user.PhoneVerification) error {
	query := `
		INSERT INTO phone_verifications (id, user_id, phone, code_hash, attempts, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.Exec(ctx, query, v.ID, v.UserID, v.Phone, v.CodeHash, v.Attempts, v.ExpiresAt, v.CreatedAt)
	return err
}

func (r *UserRepository) GetPhoneVerification(ctx context.Context, phone string) (*user.PhoneVerification, error) {
	query := `
		SELECT id, user_id, phone, code_hash, attempts, expires_at, created_at
		FROM phone_verifications WHERE phone = $1
		ORDER BY created_at DESC LIMIT 1
	`
	var v user.PhoneVerification
	err := r.db.QueryRow(ctx, query, phone).Scan(
		&v.ID, &v.UserID, &v.Phone, &v.CodeHash, &v.Attempts, &v.ExpiresAt, &v.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("verification not found")
		}
		return nil, err
	}
	return &v, nil
}

func (r *UserRepository) IncrementPhoneAttempts(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *UserRepository) DeletePhoneVerification(ctx context.Context, phone string) error {
	query := `DELETE FROM phone_verifications WHERE phone = $1`
	_, err := r.db.Exec(ctx, query, phone)
	return err
}

func (r *UserRepository) IsPhoneBlocked(ctx context.Context, phone string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM blocked_phones WHERE phone = $1)`
	var exists bool
	err := r.db.QueryRow(ctx, query, phone).Scan(&exists)
	return exists, err
}

func (r *UserRepository) UpsertDeviceSession(ctx context.Context, s *user.DeviceSession) error {
	query := `
		INSERT INTO device_sessions (id, user_id, device_id, device_name, platform, last_ip, last_active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, device_id) DO UPDATE SET
			device_name = EXCLUDED.device_name,
			platform = EXCLUDED.platform,
			last_ip = EXCLUDED.last_ip,
			last_active = EXCLUDED.last_active
	`
	_, err := r.db.Exec(ctx, query,
		s.ID, s.UserID, s.DeviceID, s.DeviceName, s.Platform, s.LastIP, s.LastActive, s.CreatedAt,
	)
	return err
}

func (r *UserRepository) GetDeviceSessions(ctx context.Context, userID uuid.UUID) ([]*user.DeviceSession, error) {
	query := `
		SELECT id, user_id, device_id, device_name, platform, last_ip, last_active, created_at
		FROM device_sessions WHERE user_id = $1
		ORDER BY last_active DESC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*user.DeviceSession
	for rows.Next() {
		var s user.DeviceSession
		if err := rows.Scan(&s.ID, &s.UserID, &s.DeviceID, &s.DeviceName, &s.Platform, &s.LastIP, &s.LastActive, &s.CreatedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, &s)
	}
	return sessions, nil
}

func (r *UserRepository) DeleteDeviceSession(ctx context.Context, userID uuid.UUID, deviceID string) error {
	query := `DELETE FROM device_sessions WHERE user_id = $1 AND device_id = $2`
	_, err := r.db.Exec(ctx, query, userID, deviceID)
	return err
}

func isDuplicateKeyError(err error) bool {
	return err != nil && (contains(err.Error(), "duplicate key") || contains(err.Error(), "unique constraint"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsImpl(s, substr))
}

func containsImpl(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Magic Link methods

func (r *UserRepository) CreateMagicLink(ctx context.Context, link *user.MagicLink) error {
	query := `
		INSERT INTO magic_links (id, user_id, email, token_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(ctx, query, link.ID, link.UserID, link.Email, link.TokenHash, link.ExpiresAt, link.CreatedAt)
	return err
}

func (r *UserRepository) GetMagicLinkByToken(ctx context.Context, tokenHash string) (*user.MagicLink, error) {
	query := `
		SELECT id, user_id, email, token_hash, expires_at, used_at, created_at
		FROM magic_links WHERE token_hash = $1
	`
	var link user.MagicLink
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&link.ID, &link.UserID, &link.Email, &link.TokenHash, &link.ExpiresAt, &link.UsedAt, &link.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("magic link not found")
		}
		return nil, err
	}
	return &link, nil
}

func (r *UserRepository) MarkMagicLinkUsed(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE magic_links SET used_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *UserRepository) DeleteExpiredMagicLinks(ctx context.Context) error {
	query := `DELETE FROM magic_links WHERE expires_at < NOW()`
	_, err := r.db.Exec(ctx, query)
	return err
}

// Public Key methods for E2E encryption

func (r *UserRepository) UpsertPublicKey(ctx context.Context, key *user.UserPublicKey) error {
	query := `
		INSERT INTO user_public_keys (id, user_id, public_key, key_type, created_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, key_type) DO UPDATE SET
			public_key = EXCLUDED.public_key,
			created_at = EXCLUDED.created_at
	`
	_, err := r.db.Exec(ctx, query, key.ID, key.UserID, key.PublicKey, key.KeyType, key.CreatedAt)
	return err
}

func (r *UserRepository) GetPublicKey(ctx context.Context, userID uuid.UUID, keyType string) (*user.UserPublicKey, error) {
	query := `
		SELECT id, user_id, public_key, key_type, created_at
		FROM user_public_keys WHERE user_id = $1 AND key_type = $2
	`
	var key user.UserPublicKey
	err := r.db.QueryRow(ctx, query, userID, keyType).Scan(
		&key.ID, &key.UserID, &key.PublicKey, &key.KeyType, &key.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("public key not found")
		}
		return nil, err
	}
	return &key, nil
}

func (r *UserRepository) GetPublicKeysByUserIDs(ctx context.Context, userIDs []uuid.UUID, keyType string) (map[uuid.UUID]*user.UserPublicKey, error) {
	if len(userIDs) == 0 {
		return make(map[uuid.UUID]*user.UserPublicKey), nil
	}

	query := `
		SELECT id, user_id, public_key, key_type, created_at
		FROM user_public_keys WHERE user_id = ANY($1) AND key_type = $2
	`
	rows, err := r.db.Query(ctx, query, userIDs, keyType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*user.UserPublicKey)
	for rows.Next() {
		var key user.UserPublicKey
		if err := rows.Scan(&key.ID, &key.UserID, &key.PublicKey, &key.KeyType, &key.CreatedAt); err != nil {
			return nil, err
		}
		result[key.UserID] = &key
	}
	return result, nil
}

// Moderation methods

// IsShadowbanned checks if a user is shadowbanned
func (r *UserRepository) IsShadowbanned(ctx context.Context, userID uuid.UUID) (bool, error) {
	query := `SELECT COALESCE(moderation_status = 'shadowbanned', false) FROM users WHERE id = $1`
	var isShadowbanned bool
	err := r.db.QueryRow(ctx, query, userID).Scan(&isShadowbanned)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return isShadowbanned, nil
}

// GetModerationStatus returns the moderation status of a user
func (r *UserRepository) GetModerationStatus(ctx context.Context, userID uuid.UUID) (string, error) {
	query := `SELECT COALESCE(moderation_status, 'active') FROM users WHERE id = $1`
	var status string
	err := r.db.QueryRow(ctx, query, userID).Scan(&status)
	return status, err
}

// SetModerationStatus updates a user's moderation status
func (r *UserRepository) SetModerationStatus(ctx context.Context, userID uuid.UUID, status, reason string) error {
	query := `
		UPDATE users SET
			moderation_status = $2,
			shadowban_reason = CASE WHEN $2 = 'shadowbanned' THEN $3 ELSE NULL END,
			shadowbanned_at = CASE WHEN $2 = 'shadowbanned' THEN NOW() ELSE NULL END
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, userID, status, reason)
	return err
}

// IsAdmin checks if a user is an admin
func (r *UserRepository) IsAdmin(ctx context.Context, userID uuid.UUID) (bool, error) {
	query := `SELECT COALESCE(is_admin, false) FROM users WHERE id = $1`
	var isAdmin bool
	err := r.db.QueryRow(ctx, query, userID).Scan(&isAdmin)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return isAdmin, nil
}
