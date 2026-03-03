package otp

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidCode  = errors.New("invalid or expired code")
	ErrSendFailed   = errors.New("failed to send SMS")
	ErrInvalidPhone = errors.New("invalid phone number")
)

// Config holds the OTP service configuration
type Config struct {
	TelnyxAPIKey    string
	TelnyxFromNumber string
}

// HTTPClient interface for mocking in tests
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// Service handles OTP generation, storage, and verification
type Service struct {
	db     *pgxpool.Pool
	config Config
	client HTTPClient
}

// NewService creates a new OTP service
func NewService(db *pgxpool.Pool, config Config) *Service {
	return &Service{
		db:     db,
		config: config,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// NewServiceWithClient creates a new OTP service with a custom HTTP client (for testing)
func NewServiceWithClient(db *pgxpool.Pool, config Config, client HTTPClient) *Service {
	return &Service{
		db:     db,
		config: config,
		client: client,
	}
}

// generateCode generates a cryptographically secure 6-digit code
func generateCode() (string, error) {
	// Generate a number between 0 and 999999
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("failed to generate random code: %w", err)
	}
	// Format as 6 digits with leading zeros
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// SendOTP generates a 6-digit code, stores it with 10-minute expiry, and sends via SMS
func (s *Service) SendOTP(ctx context.Context, phone string) error {
	if phone == "" {
		return ErrInvalidPhone
	}

	// Generate secure 6-digit code
	code, err := generateCode()
	if err != nil {
		return err
	}

	// Store in database with 10-minute expiry (upsert to handle resends)
	expiresAt := time.Now().Add(10 * time.Minute)
	_, err = s.db.Exec(ctx, `
		INSERT INTO otp_codes (phone, code, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (phone) DO UPDATE SET
			code = EXCLUDED.code,
			expires_at = EXCLUDED.expires_at
	`, phone, code, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to store OTP: %w", err)
	}

	// Send SMS via Telnyx
	if err := s.sendSMS(ctx, phone, code); err != nil {
		return err
	}

	return nil
}

// sendSMS sends the OTP code via Telnyx raw API
func (s *Service) sendSMS(ctx context.Context, to, code string) error {
	// If not configured, log and return (for development)
	if s.config.TelnyxAPIKey == "" || s.config.TelnyxFromNumber == "" {
		fmt.Printf("[OTP] Not configured, would send to %s: Your Feels code is %s\n", to, code)
		return nil
	}

	payload := map[string]interface{}{
		"from": s.config.TelnyxFromNumber,
		"to":   to,
		"text": fmt.Sprintf("Your Feels verification code is: %s. It expires in 10 minutes.", code),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal SMS payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.telnyx.com/v2/messages", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.config.TelnyxAPIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrSendFailed, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("%w: status %d, body: %s", ErrSendFailed, resp.StatusCode, string(respBody))
	}

	return nil
}

// VerifyOTP checks if the code matches and hasn't expired, deletes it after use
func (s *Service) VerifyOTP(ctx context.Context, phone, code string) (bool, error) {
	if phone == "" || code == "" {
		return false, ErrInvalidCode
	}

	// Look up the code and check expiry in a single query
	var storedCode string
	var expiresAt time.Time
	err := s.db.QueryRow(ctx, `
		SELECT code, expires_at FROM otp_codes WHERE phone = $1
	`, phone).Scan(&storedCode, &expiresAt)

	if err != nil {
		return false, ErrInvalidCode
	}

	// Check if expired
	if time.Now().After(expiresAt) {
		// Delete expired code
		s.db.Exec(ctx, `DELETE FROM otp_codes WHERE phone = $1`, phone)
		return false, ErrInvalidCode
	}

	// Check if code matches
	if storedCode != code {
		return false, ErrInvalidCode
	}

	// Delete the code after successful verification (one-time use)
	_, err = s.db.Exec(ctx, `DELETE FROM otp_codes WHERE phone = $1`, phone)
	if err != nil {
		// Log but don't fail - verification succeeded
		fmt.Printf("[OTP] Warning: failed to delete used code for %s: %v\n", phone, err)
	}

	return true, nil
}

// Cleanup removes expired OTP codes (call periodically)
func (s *Service) Cleanup(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `DELETE FROM otp_codes WHERE expires_at < NOW()`)
	return err
}

// SendVerificationCode implements the SMSService interface used by user.Service
// This just sends the SMS - it does NOT store the code (user.Service handles that)
func (s *Service) SendVerificationCode(ctx context.Context, to, code string) error {
	return s.sendSMS(ctx, to, code)
}
