package repository

import (
	"context"
	"errors"
	"time"

	"github.com/feels/feels/internal/domain/credit"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInsufficientCredits = errors.New("insufficient credits")
	ErrDailyLimitReached   = errors.New("daily like limit reached")
)

type CreditRepository struct {
	db *pgxpool.Pool
}

func NewCreditRepository(db *pgxpool.Pool) *CreditRepository {
	return &CreditRepository{db: db}
}

// GetCredit gets a user's credit balance
func (r *CreditRepository) GetCredit(ctx context.Context, userID uuid.UUID) (*credit.Credit, error) {
	query := `
		SELECT user_id, balance, bonus_likes, last_reset
		FROM credits
		WHERE user_id = $1
	`
	var c credit.Credit
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&c.UserID, &c.Balance, &c.BonusLikes, &c.LastReset,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Return default credits
			return &credit.Credit{
				UserID:     userID,
				Balance:    0,
				BonusLikes: 0,
			}, nil
		}
		return nil, err
	}
	return &c, nil
}

// CreateCredit initializes credits for a new user
func (r *CreditRepository) CreateCredit(ctx context.Context, userID uuid.UUID) error {
	query := `
		INSERT INTO credits (user_id, balance, bonus_likes)
		VALUES ($1, 0, 0)
		ON CONFLICT (user_id) DO NOTHING
	`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// AddCredits adds credits to a user's balance
func (r *CreditRepository) AddCredits(ctx context.Context, userID uuid.UUID, amount int) error {
	query := `
		INSERT INTO credits (user_id, balance, bonus_likes)
		VALUES ($1, $2, 0)
		ON CONFLICT (user_id) DO UPDATE SET balance = credits.balance + $2
	`
	_, err := r.db.Exec(ctx, query, userID, amount)
	return err
}

// DeductCredits deducts credits from a user's balance
func (r *CreditRepository) DeductCredits(ctx context.Context, userID uuid.UUID, amount int) error {
	query := `
		UPDATE credits
		SET balance = balance - $2
		WHERE user_id = $1 AND balance >= $2
	`
	result, err := r.db.Exec(ctx, query, userID, amount)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrInsufficientCredits
	}
	return nil
}

// AddBonusLikes adds bonus likes to a user
func (r *CreditRepository) AddBonusLikes(ctx context.Context, userID uuid.UUID, amount int) error {
	query := `
		INSERT INTO credits (user_id, balance, bonus_likes)
		VALUES ($1, 0, $2)
		ON CONFLICT (user_id) DO UPDATE SET bonus_likes = credits.bonus_likes + $2
	`
	_, err := r.db.Exec(ctx, query, userID, amount)
	return err
}

// UseBonusLike uses one bonus like
func (r *CreditRepository) UseBonusLike(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE credits
		SET bonus_likes = bonus_likes - 1
		WHERE user_id = $1 AND bonus_likes > 0
	`
	result, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrInsufficientCredits
	}
	return nil
}

// ResetMonthlyCredits resets credits that have expired (for monthly expiry)
func (r *CreditRepository) ResetMonthlyCredits(ctx context.Context, userID uuid.UUID, newBalance int) error {
	query := `
		UPDATE credits
		SET balance = $2, last_reset = NOW()
		WHERE user_id = $1
	`
	_, err := r.db.Exec(ctx, query, userID, newBalance)
	return err
}

// Subscription methods

// GetSubscription gets a user's active subscription
func (r *CreditRepository) GetSubscription(ctx context.Context, userID uuid.UUID) (*credit.Subscription, error) {
	query := `
		SELECT id, user_id, plan, period, credits_monthly, started_at, expires_at, auto_renew
		FROM subscriptions
		WHERE user_id = $1 AND expires_at > NOW()
		ORDER BY expires_at DESC
		LIMIT 1
	`
	var s credit.Subscription
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&s.ID, &s.UserID, &s.Plan, &s.Period, &s.CreditsMonthly, &s.StartedAt, &s.ExpiresAt, &s.AutoRenew,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// CreateSubscription creates a new subscription
func (r *CreditRepository) CreateSubscription(ctx context.Context, sub *credit.Subscription) error {
	query := `
		INSERT INTO subscriptions (id, user_id, plan, period, credits_monthly, started_at, expires_at, auto_renew)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(ctx, query,
		sub.ID, sub.UserID, sub.Plan, sub.Period, sub.CreditsMonthly, sub.StartedAt, sub.ExpiresAt, sub.AutoRenew,
	)
	return err
}

// UpdateSubscriptionAutoRenew updates the auto-renew setting
func (r *CreditRepository) UpdateSubscriptionAutoRenew(ctx context.Context, subID uuid.UUID, autoRenew bool) error {
	query := `UPDATE subscriptions SET auto_renew = $2 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, subID, autoRenew)
	return err
}

// Daily likes methods

// GetDailyLikes gets the daily like count for a user
func (r *CreditRepository) GetDailyLikes(ctx context.Context, userID uuid.UUID) (*credit.DailyLike, error) {
	// Use CURRENT_DATE for consistent timezone handling (database timezone)
	query := `
		SELECT user_id, date, count
		FROM daily_likes
		WHERE user_id = $1 AND date = CURRENT_DATE
	`
	var dl credit.DailyLike
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&dl.UserID, &dl.Date, &dl.Count,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &credit.DailyLike{
				UserID: userID,
				Date:   time.Now().UTC().Truncate(24 * time.Hour),
				Count:  0,
			}, nil
		}
		return nil, err
	}
	return &dl, nil
}

// IncrementDailyLikes increments the daily like count
func (r *CreditRepository) IncrementDailyLikes(ctx context.Context, userID uuid.UUID) error {
	// Use CURRENT_DATE for consistent timezone handling
	query := `
		INSERT INTO daily_likes (user_id, date, count)
		VALUES ($1, CURRENT_DATE, 1)
		ON CONFLICT (user_id, date) DO UPDATE SET count = daily_likes.count + 1
	`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// CanUseDailyLike checks if a free user can still like today
func (r *CreditRepository) CanUseDailyLike(ctx context.Context, userID uuid.UUID, limit int) (bool, int, error) {
	dl, err := r.GetDailyLikes(ctx, userID)
	if err != nil {
		return false, 0, err
	}
	remaining := limit - dl.Count
	if remaining < 0 {
		remaining = 0
	}
	return dl.Count < limit, remaining, nil
}

// HasSubscription checks if a user has an active subscription
func (r *CreditRepository) HasSubscription(ctx context.Context, userID uuid.UUID) (bool, error) {
	sub, err := r.GetSubscription(ctx, userID)
	if err != nil {
		return false, err
	}
	return sub != nil, nil
}

// Atomic operations to prevent race conditions

// UseBonusLikeAtomic atomically checks and uses one bonus like
func (r *CreditRepository) UseBonusLikeAtomic(ctx context.Context, userID uuid.UUID) error {
	// Same as UseBonusLike - already atomic due to WHERE clause
	query := `
		UPDATE credits
		SET bonus_likes = bonus_likes - 1
		WHERE user_id = $1 AND bonus_likes > 0
	`
	result, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrInsufficientCredits
	}
	return nil
}

// UseDailyLikeAtomic atomically checks limit and increments daily like count
// Uses a single INSERT/UPDATE that enforces the limit
func (r *CreditRepository) UseDailyLikeAtomic(ctx context.Context, userID uuid.UUID, limit int) error {
	// Use CURRENT_DATE for consistent timezone (database timezone)
	query := `
		INSERT INTO daily_likes (user_id, date, count)
		VALUES ($1, CURRENT_DATE, 1)
		ON CONFLICT (user_id, date) DO UPDATE
		SET count = daily_likes.count + 1
		WHERE daily_likes.count < $2
		RETURNING count
	`
	var newCount int
	err := r.db.QueryRow(ctx, query, userID, limit).Scan(&newCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrDailyLimitReached
		}
		return err
	}
	return nil
}

// DeductCreditsAtomic atomically checks and deducts credits
func (r *CreditRepository) DeductCreditsAtomic(ctx context.Context, userID uuid.UUID, amount int) error {
	// Same as DeductCredits - already atomic due to WHERE clause
	query := `
		UPDATE credits
		SET balance = balance - $2
		WHERE user_id = $1 AND balance >= $2
	`
	result, err := r.db.Exec(ctx, query, userID, amount)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrInsufficientCredits
	}
	return nil
}
