// Package testutil provides test utilities for integration tests
package testutil

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TestDB wraps a database connection for testing
type TestDB struct {
	Pool *pgxpool.Pool
}

// NewTestDB creates a new test database connection
// Uses TEST_DATABASE_URL env var, falls back to DATABASE_URL, or defaults to test database
// Set SKIP_DB_TESTS=true to skip tests that require a database
func NewTestDB(t *testing.T) *TestDB {
	t.Helper()

	if os.Getenv("SKIP_DB_TESTS") == "true" {
		t.Skip("Skipping database test (SKIP_DB_TESTS=true)")
	}

	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	if dbURL == "" {
		dbURL = "postgres://feels:feels@localhost:5432/feels_test?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("Failed to ping test database: %v", err)
	}

	return &TestDB{Pool: pool}
}

// Close closes the database connection
func (db *TestDB) Close() {
	db.Pool.Close()
}

// CleanupTables cleans up test data from specified tables
func (db *TestDB) CleanupTables(t *testing.T, tables ...string) {
	t.Helper()
	ctx := context.Background()

	for _, table := range tables {
		_, err := db.Pool.Exec(ctx, fmt.Sprintf("DELETE FROM %s", table))
		if err != nil {
			t.Logf("Warning: failed to clean table %s: %v", table, err)
		}
	}
}

// CleanupAll cleans up all test data (use with caution)
func (db *TestDB) CleanupAll(t *testing.T) {
	t.Helper()
	// Order matters due to foreign key constraints
	db.CleanupTables(t,
		"messages",
		"matches",
		"likes",
		"passes",
		"daily_likes",
		"credits",
		"subscriptions",
		"photos",
		"preferences",
		"profiles",
		"refresh_tokens",
		"users",
	)
}

// TestUser represents a test user with all related data
type TestUser struct {
	ID       uuid.UUID
	Email    string
	Phone    string
	Name     string
	Gender   string
	DOB      time.Time
	ZipCode  string
	Lat      float64
	Lng      float64
}

// CreateTestUser creates a test user with profile, preferences, and credits
func (db *TestDB) CreateTestUser(t *testing.T, name, gender string, age int) *TestUser {
	t.Helper()
	ctx := context.Background()

	userID := uuid.New()
	email := fmt.Sprintf("%s_%s@test.com", name, userID.String()[:8])
	phone := fmt.Sprintf("+1555%07d", time.Now().UnixNano()%10000000)
	dob := time.Now().AddDate(-age, 0, 0)

	// Create user
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO users (id, email, phone, password_hash, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, 'test_hash', true, NOW(), NOW())
	`, userID, email, phone)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create profile
	_, err = db.Pool.Exec(ctx, `
		INSERT INTO profiles (user_id, name, dob, gender, zip_code, lat, lng, last_active, created_at)
		VALUES ($1, $2, $3, $4, '10001', 40.7128, -74.0060, NOW(), NOW())
	`, userID, name, dob, gender)
	if err != nil {
		t.Fatalf("Failed to create test profile: %v", err)
	}

	// Create preferences (seeking opposite gender by default)
	seekingGenders := []string{"woman"}
	if gender == "woman" {
		seekingGenders = []string{"man"}
	}
	_, err = db.Pool.Exec(ctx, `
		INSERT INTO preferences (user_id, genders_seeking, age_min, age_max, distance_miles)
		VALUES ($1, $2, 18, 50, 25)
	`, userID, seekingGenders)
	if err != nil {
		t.Fatalf("Failed to create test preferences: %v", err)
	}

	// Create credits
	_, err = db.Pool.Exec(ctx, `
		INSERT INTO credits (user_id, balance, bonus_likes)
		VALUES ($1, 100, 5)
	`, userID)
	if err != nil {
		t.Fatalf("Failed to create test credits: %v", err)
	}

	return &TestUser{
		ID:      userID,
		Email:   email,
		Phone:   phone,
		Name:    name,
		Gender:  gender,
		DOB:     dob,
		ZipCode: "10001",
		Lat:     40.7128,
		Lng:     -74.0060,
	}
}

// CreateTestUserWithPrefs creates a test user with custom preferences
func (db *TestDB) CreateTestUserWithPrefs(t *testing.T, name, gender string, age int, seekingGenders []string, ageMin, ageMax int) *TestUser {
	t.Helper()
	ctx := context.Background()

	user := db.CreateTestUser(t, name, gender, age)

	// Update preferences
	_, err := db.Pool.Exec(ctx, `
		UPDATE preferences SET genders_seeking = $2, age_min = $3, age_max = $4
		WHERE user_id = $1
	`, user.ID, seekingGenders, ageMin, ageMax)
	if err != nil {
		t.Fatalf("Failed to update test preferences: %v", err)
	}

	return user
}

// CreateLike creates a like from liker to liked
func (db *TestDB) CreateLike(t *testing.T, likerID, likedID uuid.UUID, isSuperlike bool) uuid.UUID {
	t.Helper()
	ctx := context.Background()

	likeID := uuid.New()
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO likes (id, liker_id, liked_id, is_superlike, created_at)
		VALUES ($1, $2, $3, $4, NOW())
	`, likeID, likerID, likedID, isSuperlike)
	if err != nil {
		t.Fatalf("Failed to create test like: %v", err)
	}

	return likeID
}

// GetLikeCount returns the number of likes for a user
func (db *TestDB) GetLikeCount(t *testing.T, likerID uuid.UUID) int {
	t.Helper()
	ctx := context.Background()

	var count int
	err := db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM likes WHERE liker_id = $1`, likerID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to get like count: %v", err)
	}
	return count
}

// GetMatchCount returns the number of matches for a user
func (db *TestDB) GetMatchCount(t *testing.T, userID uuid.UUID) int {
	t.Helper()
	ctx := context.Background()

	var count int
	err := db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM matches WHERE user1_id = $1 OR user2_id = $1
	`, userID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to get match count: %v", err)
	}
	return count
}

// MatchExists checks if a match exists between two users
func (db *TestDB) MatchExists(t *testing.T, user1ID, user2ID uuid.UUID) bool {
	t.Helper()
	ctx := context.Background()

	var exists bool
	err := db.Pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM matches
			WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
		)
	`, user1ID, user2ID).Scan(&exists)
	if err != nil {
		t.Fatalf("Failed to check match exists: %v", err)
	}
	return exists
}

// GetCredits returns a user's current credit balance
func (db *TestDB) GetCredits(t *testing.T, userID uuid.UUID) (balance int, bonusLikes int) {
	t.Helper()
	ctx := context.Background()

	err := db.Pool.QueryRow(ctx, `
		SELECT COALESCE(balance, 0), COALESCE(bonus_likes, 0) FROM credits WHERE user_id = $1
	`, userID).Scan(&balance, &bonusLikes)
	if err != nil {
		t.Fatalf("Failed to get credits: %v", err)
	}
	return
}

// GetDailyLikeCount returns the daily like count for a user
func (db *TestDB) GetDailyLikeCount(t *testing.T, userID uuid.UUID) int {
	t.Helper()
	ctx := context.Background()

	var count int
	err := db.Pool.QueryRow(ctx, `
		SELECT COALESCE(count, 0) FROM daily_likes WHERE user_id = $1 AND date = CURRENT_DATE
	`, userID).Scan(&count)
	if err != nil {
		return 0 // No record means 0
	}
	return count
}

// CreateSubscription creates an active subscription for a user
func (db *TestDB) CreateSubscription(t *testing.T, userID uuid.UUID) uuid.UUID {
	t.Helper()
	ctx := context.Background()

	subID := uuid.New()
	_, err := db.Pool.Exec(ctx, `
		INSERT INTO subscriptions (
			id, user_id, stripe_subscription_id, stripe_customer_id,
			plan_type, status, current_period_start, current_period_end,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, 'plus', 'active', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
	`, subID, userID, "test_sub_"+subID.String(), "test_cus_"+userID.String())
	if err != nil {
		t.Fatalf("Failed to create test subscription: %v", err)
	}

	return subID
}
