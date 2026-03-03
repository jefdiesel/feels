package otp

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockHTTPClient implements HTTPClient for testing
type MockHTTPClient struct {
	DoFunc func(req *http.Request) (*http.Response, error)
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	return m.DoFunc(req)
}

// successResponse returns a mock successful Telnyx response
func successResponse() *http.Response {
	return &http.Response{
		StatusCode: 200,
		Body:       io.NopCloser(bytes.NewBufferString(`{"data":{"id":"msg_123"}}`)),
	}
}

// errorResponse returns a mock error Telnyx response
func errorResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(bytes.NewBufferString(body)),
	}
}

func TestGenerateCode(t *testing.T) {
	codes := make(map[string]bool)

	// Generate 100 codes and verify format
	for i := 0; i < 100; i++ {
		code, err := generateCode()
		require.NoError(t, err)

		// Must be exactly 6 digits
		assert.Len(t, code, 6)

		// Must be numeric
		for _, c := range code {
			assert.True(t, c >= '0' && c <= '9', "code contains non-digit: %c", c)
		}

		// Track for uniqueness check
		codes[code] = true
	}

	// Should have reasonable uniqueness (allow some collisions in 100 tries)
	assert.Greater(t, len(codes), 90, "too many collisions in generated codes")
}

func TestSendOTP_NotConfigured(t *testing.T) {
	// Skip if no test database
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	// Create table for test
	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	// Service with no config (should log instead of send)
	svc := NewService(db, Config{})

	err = svc.SendOTP(context.Background(), "+15551234567")
	assert.NoError(t, err)

	// Verify code was stored
	var code string
	err = db.QueryRow(context.Background(), `SELECT code FROM otp_codes WHERE phone = $1`, "+15551234567").Scan(&code)
	assert.NoError(t, err)
	assert.Len(t, code, 6)
}

func TestSendOTP_WithMockClient(t *testing.T) {
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	var capturedReq *http.Request
	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			capturedReq = req
			return successResponse(), nil
		},
	}

	config := Config{
		TelnyxAPIKey:     "test_api_key",
		TelnyxFromNumber: "+15550001111",
	}
	svc := NewServiceWithClient(db, config, mockClient)

	err = svc.SendOTP(context.Background(), "+15551234567")
	assert.NoError(t, err)

	// Verify HTTP request was correct
	assert.NotNil(t, capturedReq)
	assert.Equal(t, "POST", capturedReq.Method)
	assert.Equal(t, "https://api.telnyx.com/v2/messages", capturedReq.URL.String())
	assert.Equal(t, "Bearer test_api_key", capturedReq.Header.Get("Authorization"))
	assert.Equal(t, "application/json", capturedReq.Header.Get("Content-Type"))
}

func TestSendOTP_TelnyxError(t *testing.T) {
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	mockClient := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return errorResponse(400, `{"errors":[{"detail":"Invalid phone"}]}`), nil
		},
	}

	config := Config{
		TelnyxAPIKey:     "test_api_key",
		TelnyxFromNumber: "+15550001111",
	}
	svc := NewServiceWithClient(db, config, mockClient)

	err = svc.SendOTP(context.Background(), "+15551234567")
	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrSendFailed)
}

func TestSendOTP_InvalidPhone(t *testing.T) {
	svc := NewService(nil, Config{})
	err := svc.SendOTP(context.Background(), "")
	assert.ErrorIs(t, err, ErrInvalidPhone)
}

func TestVerifyOTP_Success(t *testing.T) {
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	// Insert a valid code
	phone := "+15551234567"
	code := "123456"
	expiresAt := time.Now().Add(10 * time.Minute)
	_, err = db.Exec(context.Background(), `
		INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)
	`, phone, code, expiresAt)
	require.NoError(t, err)

	svc := NewService(db, Config{})

	// Verify correct code
	valid, err := svc.VerifyOTP(context.Background(), phone, code)
	assert.NoError(t, err)
	assert.True(t, valid)

	// Code should be deleted after use
	var count int
	db.QueryRow(context.Background(), `SELECT COUNT(*) FROM otp_codes WHERE phone = $1`, phone).Scan(&count)
	assert.Equal(t, 0, count)
}

func TestVerifyOTP_WrongCode(t *testing.T) {
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	phone := "+15551234567"
	_, err = db.Exec(context.Background(), `
		INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)
	`, phone, "123456", time.Now().Add(10*time.Minute))
	require.NoError(t, err)

	svc := NewService(db, Config{})

	valid, err := svc.VerifyOTP(context.Background(), phone, "000000")
	assert.ErrorIs(t, err, ErrInvalidCode)
	assert.False(t, valid)
}

func TestVerifyOTP_ExpiredCode(t *testing.T) {
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	phone := "+15551234567"
	code := "123456"
	// Insert an expired code
	_, err = db.Exec(context.Background(), `
		INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)
	`, phone, code, time.Now().Add(-1*time.Minute))
	require.NoError(t, err)

	svc := NewService(db, Config{})

	valid, err := svc.VerifyOTP(context.Background(), phone, code)
	assert.ErrorIs(t, err, ErrInvalidCode)
	assert.False(t, valid)
}

func TestVerifyOTP_NoCode(t *testing.T) {
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	svc := NewService(db, Config{})

	valid, err := svc.VerifyOTP(context.Background(), "+15559999999", "123456")
	assert.ErrorIs(t, err, ErrInvalidCode)
	assert.False(t, valid)
}

func TestVerifyOTP_EmptyInputs(t *testing.T) {
	svc := NewService(nil, Config{})

	valid, err := svc.VerifyOTP(context.Background(), "", "123456")
	assert.ErrorIs(t, err, ErrInvalidCode)
	assert.False(t, valid)

	valid, err = svc.VerifyOTP(context.Background(), "+15551234567", "")
	assert.ErrorIs(t, err, ErrInvalidCode)
	assert.False(t, valid)
}

func TestSendOTP_Resend(t *testing.T) {
	dbURL := "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Skip("test database not available")
	}
	defer db.Close()

	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS otp_codes (
			phone TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL
		)
	`)
	require.NoError(t, err)
	defer db.Exec(context.Background(), `DELETE FROM otp_codes`)

	svc := NewService(db, Config{}) // No config = logs instead of sends

	phone := "+15551234567"

	// Send first OTP
	err = svc.SendOTP(context.Background(), phone)
	require.NoError(t, err)

	var firstCode string
	db.QueryRow(context.Background(), `SELECT code FROM otp_codes WHERE phone = $1`, phone).Scan(&firstCode)

	// Send again (resend)
	err = svc.SendOTP(context.Background(), phone)
	require.NoError(t, err)

	var secondCode string
	db.QueryRow(context.Background(), `SELECT code FROM otp_codes WHERE phone = $1`, phone).Scan(&secondCode)

	// Should have a new code (may or may not be different due to randomness, but should work)
	assert.Len(t, secondCode, 6)

	// Only one row should exist
	var count int
	db.QueryRow(context.Background(), `SELECT COUNT(*) FROM otp_codes WHERE phone = $1`, phone).Scan(&count)
	assert.Equal(t, 1, count)
}
