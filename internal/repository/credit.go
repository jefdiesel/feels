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
		SELECT user_id, balance, bonus_likes,
			COALESCE(premium_likes_used, 0), COALESCE(boosts_used, 0),
			last_reset, last_boost_reset
		FROM credits
		WHERE user_id = $1
	`
	var c credit.Credit
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&c.UserID, &c.Balance, &c.BonusLikes,
		&c.PremiumLikesUsed, &c.BoostsUsed,
		&c.LastReset, &c.LastBoostReset,
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

	// Reset premium likes if it's a new day
	if c.LastReset != nil {
		today := time.Now().UTC().Truncate(24 * time.Hour)
		lastReset := c.LastReset.UTC().Truncate(24 * time.Hour)
		if today.After(lastReset) {
			c.PremiumLikesUsed = 0
		}
	}

	// Reset boosts if it's been 7+ days
	if c.LastBoostReset != nil {
		now := time.Now().UTC()
		lastBoost := c.LastBoostReset.UTC()
		if now.Sub(lastBoost) >= 7*24*time.Hour {
			c.BoostsUsed = 0
		}
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
		SELECT id, user_id, plan_type, status, current_period_start, current_period_end, canceled_at
		FROM subscriptions
		WHERE user_id = $1 AND status = 'active' AND current_period_end > NOW()
		ORDER BY current_period_end DESC
		LIMIT 1
	`
	var s credit.Subscription
	var planType string
	var status string
	var canceledAt *time.Time
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&s.ID, &s.UserID, &planType, &status, &s.StartedAt, &s.ExpiresAt, &canceledAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	// Map plan_type to Plan and Period
	s.Plan = credit.PlanType(planType)
	s.Period = credit.PeriodMonthly // Default, actual period is in plan_type
	// AutoRenew is true if status is active AND subscription hasn't been canceled
	s.AutoRenew = status == "active" && canceledAt == nil
	return &s, nil
}

// CreateSubscription creates a new subscription
// DEPRECATED: Use payment service to create subscriptions via Stripe webhooks
// This method is kept for backwards compatibility but creates legacy-prefixed records
func (r *CreditRepository) CreateSubscription(ctx context.Context, sub *credit.Subscription) error {
	// Use new schema with placeholder Stripe IDs for legacy/test subscriptions
	query := `
		INSERT INTO subscriptions (
			id, user_id, stripe_subscription_id, stripe_customer_id,
			plan_type, status, current_period_start, current_period_end,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
	`
	stripeSubID := "legacy_" + sub.ID.String()
	stripeCustomerID := "legacy_customer_" + sub.UserID.String()
	status := "active"
	if !sub.AutoRenew {
		status = "canceled"
	}

	_, err := r.db.Exec(ctx, query,
		sub.ID, sub.UserID, stripeSubID, stripeCustomerID,
		string(sub.Plan), status, sub.StartedAt, sub.ExpiresAt,
	)
	return err
}

// UpdateSubscriptionAutoRenew updates the auto-renew setting
// In the new schema, this sets canceled_at timestamp when autoRenew is false
// Note: For Stripe-managed subscriptions, use the payment service instead
func (r *CreditRepository) UpdateSubscriptionAutoRenew(ctx context.Context, subID uuid.UUID, autoRenew bool) error {
	if autoRenew {
		// Clear canceled_at to re-enable auto-renewal
		query := `UPDATE subscriptions SET canceled_at = NULL, updated_at = NOW() WHERE id = $1`
		_, err := r.db.Exec(ctx, query, subID)
		return err
	}
	// Set canceled_at to disable auto-renewal (subscription will end at current_period_end)
	query := `UPDATE subscriptions SET canceled_at = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, subID)
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

// Premium like methods

var ErrPremiumLikeLimitReached = errors.New("premium like limit reached")

// UsePremiumLike records usage of a premium like (resets daily)
func (r *CreditRepository) UsePremiumLike(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE credits
		SET premium_likes_used = CASE
			WHEN last_reset IS NULL OR last_reset::date < CURRENT_DATE THEN 1
			ELSE premium_likes_used + 1
		END,
		last_reset = CURRENT_DATE
		WHERE user_id = $1
	`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

// UsePremiumLikeAtomic atomically checks limit and uses a premium like
func (r *CreditRepository) UsePremiumLikeAtomic(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE credits
		SET premium_likes_used = CASE
			WHEN last_reset IS NULL OR last_reset::date < CURRENT_DATE THEN 1
			ELSE premium_likes_used + 1
		END,
		last_reset = CURRENT_DATE
		WHERE user_id = $1
		AND (
			last_reset IS NULL
			OR last_reset::date < CURRENT_DATE
			OR premium_likes_used < $2
		)
		RETURNING premium_likes_used
	`
	var used int
	err := r.db.QueryRow(ctx, query, userID, credit.PremiumLikesPerDay).Scan(&used)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPremiumLikeLimitReached
		}
		return err
	}
	return nil
}
