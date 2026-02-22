package user

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
	ErrWeakPassword       = errors.New("password must be at least 8 characters")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrInvalidPhone       = errors.New("invalid US phone number")
	ErrPhoneBlocked       = errors.New("phone number is blocked")
	ErrPhoneExists        = errors.New("phone number already registered")
	ErrInvalidCode        = errors.New("invalid verification code")
	ErrCodeExpired        = errors.New("verification code expired")
	ErrTooManyAttempts    = errors.New("too many verification attempts")
	ErrDeviceRequired     = errors.New("device_id is required")
	ErrTOTPRequired       = errors.New("2FA code required")
	ErrInvalidTOTP        = errors.New("invalid 2FA code")
)

type Repository interface {
	Create(ctx context.Context, u *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByPhone(ctx context.Context, phone string) (*User, error)
	Update(ctx context.Context, u *User) error
	CreateRefreshToken(ctx context.Context, token *RefreshToken) error
	GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error)
	DeleteRefreshToken(ctx context.Context, tokenHash string) error
	DeleteUserRefreshTokens(ctx context.Context, userID uuid.UUID) error

	// Phone verification
	CreatePhoneVerification(ctx context.Context, v *PhoneVerification) error
	GetPhoneVerification(ctx context.Context, phone string) (*PhoneVerification, error)
	IncrementPhoneAttempts(ctx context.Context, id uuid.UUID) error
	DeletePhoneVerification(ctx context.Context, phone string) error
	IsPhoneBlocked(ctx context.Context, phone string) (bool, error)

	// Device sessions
	UpsertDeviceSession(ctx context.Context, s *DeviceSession) error
	GetDeviceSessions(ctx context.Context, userID uuid.UUID) ([]*DeviceSession, error)
	DeleteDeviceSession(ctx context.Context, userID uuid.UUID, deviceID string) error
}

type Service struct {
	repo          Repository
	jwtSecret     []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

func NewService(repo Repository, jwtSecret string, accessExpiry, refreshExpiry time.Duration) *Service {
	return &Service{
		repo:          repo,
		jwtSecret:     []byte(jwtSecret),
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

func (s *Service) Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if !isValidEmail(email) {
		return nil, ErrInvalidEmail
	}

	if len(req.Password) < 8 {
		return nil, ErrWeakPassword
	}

	if req.DeviceID == "" {
		return nil, ErrDeviceRequired
	}

	// Validate and normalize phone
	normalizedPhone, err := normalizeUSPhone(req.Phone)
	if err != nil {
		return nil, err
	}

	// Check if phone is blocked
	blocked, err := s.repo.IsPhoneBlocked(ctx, normalizedPhone)
	if err != nil {
		return nil, err
	}
	if blocked {
		return nil, ErrPhoneBlocked
	}

	// Check if phone already exists
	existing, err := s.repo.GetByPhone(ctx, normalizedPhone)
	if err == nil && existing != nil {
		return nil, ErrPhoneExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := &User{
		ID:            uuid.New(),
		Email:         email,
		PasswordHash:  string(hash),
		EmailVerified: false,
		Phone:         &normalizedPhone,
		PhoneVerified: false,
		DeviceID:      &req.DeviceID,
		TOTPEnabled:   false,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Create device session
	session := &DeviceSession{
		ID:         uuid.New(),
		UserID:     user.ID,
		DeviceID:   req.DeviceID,
		Platform:   req.Platform,
		LastActive: now,
		CreatedAt:  now,
	}
	_ = s.repo.UpsertDeviceSession(ctx, session)

	return s.generateTokens(ctx, user.ID)
}

func (s *Service) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if req.DeviceID == "" {
		return nil, ErrDeviceRequired
	}

	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Check 2FA if enabled
	if user.TOTPEnabled {
		if req.TOTPCode == "" {
			return nil, ErrTOTPRequired
		}
		// TODO: Validate TOTP code against user.TOTPSecret
		// For now, also check backup codes
		validCode := false
		for _, code := range user.TOTPBackupCodes {
			if code == req.TOTPCode {
				validCode = true
				break
			}
		}
		if !validCode {
			// TODO: Implement actual TOTP validation
			return nil, ErrInvalidTOTP
		}
	}

	// Update device session
	now := time.Now()
	session := &DeviceSession{
		ID:         uuid.New(),
		UserID:     user.ID,
		DeviceID:   req.DeviceID,
		Platform:   req.Platform,
		LastActive: now,
		CreatedAt:  now,
	}
	_ = s.repo.UpsertDeviceSession(ctx, session)

	return s.generateTokens(ctx, user.ID)
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (*AuthResponse, error) {
	tokenHash := hashToken(refreshToken)

	stored, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, ErrInvalidToken
	}

	if time.Now().After(stored.ExpiresAt) {
		s.repo.DeleteRefreshToken(ctx, tokenHash)
		return nil, ErrInvalidToken
	}

	// Delete old token (rotation)
	if err := s.repo.DeleteRefreshToken(ctx, tokenHash); err != nil {
		return nil, err
	}

	return s.generateTokens(ctx, stored.UserID)
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	tokenHash := hashToken(refreshToken)
	return s.repo.DeleteRefreshToken(ctx, tokenHash)
}

func (s *Service) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (s *Service) GetUser(ctx context.Context, id uuid.UUID) (*User, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) generateTokens(ctx context.Context, userID uuid.UUID) (*AuthResponse, error) {
	now := time.Now()

	// Generate access token
	accessClaims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshTokenID := uuid.New()
	refreshTokenString := refreshTokenID.String()
	refreshTokenHash := hashToken(refreshTokenString)

	refreshToken := &RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: refreshTokenHash,
		ExpiresAt: now.Add(s.refreshExpiry),
		CreatedAt: now,
	}

	if err := s.repo.CreateRefreshToken(ctx, refreshToken); err != nil {
		return nil, err
	}

	return &AuthResponse{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(s.accessExpiry.Seconds()),
	}, nil
}

func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func isValidEmail(email string) bool {
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	at := strings.LastIndex(email, "@")
	if at < 1 || at >= len(email)-1 {
		return false
	}
	domain := email[at+1:]
	if !strings.Contains(domain, ".") {
		return false
	}
	return true
}

// normalizeUSPhone normalizes a US phone number to +1XXXXXXXXXX format
func normalizeUSPhone(phone string) (string, error) {
	// Remove all non-digit characters
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	// Handle different formats
	switch len(digits) {
	case 10:
		// Format: XXXXXXXXXX -> +1XXXXXXXXXX
		return "+1" + digits, nil
	case 11:
		// Format: 1XXXXXXXXXX -> +1XXXXXXXXXX
		if digits[0] == '1' {
			return "+" + digits, nil
		}
		return "", ErrInvalidPhone
	default:
		return "", ErrInvalidPhone
	}
}

// SendPhoneCode sends a verification code to the phone number
func (s *Service) SendPhoneCode(ctx context.Context, userID *uuid.UUID, phone string) error {
	normalized, err := normalizeUSPhone(phone)
	if err != nil {
		return err
	}

	// Check if phone is blocked
	blocked, err := s.repo.IsPhoneBlocked(ctx, normalized)
	if err != nil {
		return err
	}
	if blocked {
		return ErrPhoneBlocked
	}

	// Check if phone already registered to another user
	existing, err := s.repo.GetByPhone(ctx, normalized)
	if err == nil && existing != nil {
		if userID == nil || existing.ID != *userID {
			return ErrPhoneExists
		}
	}

	// Delete any existing verification for this phone
	_ = s.repo.DeletePhoneVerification(ctx, normalized)

	// Generate 6-digit code
	code := generateVerificationCode()
	codeHash := hashToken(code)

	verification := &PhoneVerification{
		ID:        uuid.New(),
		UserID:    userID,
		Phone:     normalized,
		CodeHash:  codeHash,
		Attempts:  0,
		ExpiresAt: time.Now().Add(10 * time.Minute),
		CreatedAt: time.Now(),
	}

	if err := s.repo.CreatePhoneVerification(ctx, verification); err != nil {
		return err
	}

	// TODO: Send SMS via Twilio/SNS
	// For now, log the code (remove in production!)
	_ = code // In production: smsService.Send(normalized, code)

	return nil
}

// VerifyPhone verifies the phone code and marks the phone as verified
func (s *Service) VerifyPhone(ctx context.Context, userID uuid.UUID, phone, code string) error {
	normalized, err := normalizeUSPhone(phone)
	if err != nil {
		return err
	}

	verification, err := s.repo.GetPhoneVerification(ctx, normalized)
	if err != nil {
		return ErrInvalidCode
	}

	if time.Now().After(verification.ExpiresAt) {
		_ = s.repo.DeletePhoneVerification(ctx, normalized)
		return ErrCodeExpired
	}

	if verification.Attempts >= 5 {
		_ = s.repo.DeletePhoneVerification(ctx, normalized)
		return ErrTooManyAttempts
	}

	codeHash := hashToken(code)
	if codeHash != verification.CodeHash {
		_ = s.repo.IncrementPhoneAttempts(ctx, verification.ID)
		return ErrInvalidCode
	}

	// Code is valid, update user
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	now := time.Now()
	user.Phone = &normalized
	user.PhoneVerified = true
	user.PhoneVerifiedAt = &now

	if err := s.repo.Update(ctx, user); err != nil {
		return err
	}

	// Clean up verification
	_ = s.repo.DeletePhoneVerification(ctx, normalized)

	return nil
}

// Setup2FA generates a TOTP secret for the user (not enabled yet)
func (s *Service) Setup2FA(ctx context.Context, userID uuid.UUID) (*Setup2FAResponse, error) {
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Generate secret (32 bytes base32 encoded)
	secret := generateTOTPSecret()
	backupCodes := generateBackupCodes(8)

	user.TOTPSecret = &secret
	user.TOTPBackupCodes = backupCodes
	// Note: TOTPEnabled stays false until explicitly enabled

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, err
	}

	// Generate QR code URL (otpauth:// format)
	qrCode := "otpauth://totp/Feels:" + user.Email + "?secret=" + secret + "&issuer=Feels"

	return &Setup2FAResponse{
		Secret:      secret,
		QRCode:      qrCode,
		BackupCodes: backupCodes,
	}, nil
}

func generateVerificationCode() string {
	// Generate 6-digit numeric code
	b := make([]byte, 3)
	_, _ = uuid.New().MarshalBinary()
	copy(b, uuid.New().String()[:3])
	code := 0
	for _, c := range b {
		code = code*256 + int(c)
	}
	code = code % 1000000
	codeStr := strconv.Itoa(code)
	return strings.Repeat("0", 6-len(codeStr)) + codeStr
}

func generateTOTPSecret() string {
	// Generate 20 random bytes, base32 encode
	b := make([]byte, 20)
	for i := range b {
		b[i] = byte(uuid.New().ID() % 256)
	}
	const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
	result := make([]byte, 32)
	for i := range result {
		result[i] = base32Chars[int(b[i%20])%32]
	}
	return string(result)
}

func generateBackupCodes(n int) []string {
	codes := make([]string, n)
	for i := 0; i < n; i++ {
		codes[i] = strings.ToUpper(uuid.New().String()[:8])
	}
	return codes
}
