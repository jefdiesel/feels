package user

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email"`
	PasswordHash    string     `json:"-"`
	EmailVerified   bool       `json:"email_verified"`
	Phone           *string    `json:"phone,omitempty"`
	PhoneVerified   bool       `json:"phone_verified"`
	PhoneVerifiedAt *time.Time `json:"phone_verified_at,omitempty"`
	DeviceID        *string    `json:"-"`
	TOTPSecret      *string    `json:"-"`
	TOTPEnabled     bool       `json:"totp_enabled"`
	TOTPBackupCodes []string   `json:"-"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone"`
	DeviceID string `json:"device_id"`
	Platform string `json:"platform,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	DeviceID string `json:"device_id"`
	Platform string `json:"platform,omitempty"`
	TOTPCode string `json:"totp_code,omitempty"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
	CreatedAt time.Time
}

type PhoneVerification struct {
	ID        uuid.UUID
	UserID    *uuid.UUID
	Phone     string
	CodeHash  string
	Attempts  int
	ExpiresAt time.Time
	CreatedAt time.Time
}

type DeviceSession struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	DeviceID   string    `json:"device_id"`
	DeviceName string    `json:"device_name,omitempty"`
	Platform   string    `json:"platform,omitempty"`
	LastIP     string    `json:"last_ip,omitempty"`
	LastActive time.Time `json:"last_active"`
	CreatedAt  time.Time `json:"created_at"`
}

type SendPhoneCodeRequest struct {
	Phone string `json:"phone"`
}

type VerifyPhoneRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

type Setup2FAResponse struct {
	Secret      string   `json:"secret"`
	QRCode      string   `json:"qr_code"`
	BackupCodes []string `json:"backup_codes"`
}

type Verify2FARequest struct {
	Code string `json:"code"`
}
