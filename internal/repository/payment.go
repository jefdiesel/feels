package repository

import (
	"context"
	"errors"

	"github.com/feels/feels/internal/domain/payment"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentRepository struct {
	db *pgxpool.Pool
}

func NewPaymentRepository(db *pgxpool.Pool) *PaymentRepository {
	return &PaymentRepository{db: db}
}

// EnsureTables creates the subscriptions table if it doesn't exist
func (r *PaymentRepository) EnsureTables(ctx context.Context) error {
	query := `CREATE TABLE IF NOT EXISTS subscriptions (
		id UUID PRIMARY KEY,
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		stripe_subscription_id TEXT NOT NULL UNIQUE,
		stripe_customer_id TEXT NOT NULL,
		plan_type TEXT NOT NULL,
		status TEXT NOT NULL,
		current_period_start TIMESTAMPTZ NOT NULL,
		current_period_end TIMESTAMPTZ NOT NULL,
		canceled_at TIMESTAMPTZ,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`

	_, err := r.db.Exec(ctx, query)
	if err != nil {
		return err
	}

	// Create index on user_id for faster lookups
	_, err = r.db.Exec(ctx, `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`)
	if err != nil {
		return err
	}

	// Create stripe_customers table to map users to Stripe customer IDs
	query = `CREATE TABLE IF NOT EXISTS stripe_customers (
		user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
		stripe_customer_id TEXT NOT NULL UNIQUE,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`

	_, err = r.db.Exec(ctx, query)
	if err != nil {
		return err
	}

	// Create bonus_days table for referrals and promotions
	query = `CREATE TABLE IF NOT EXISTS bonus_days (
		id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
		user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		days INT NOT NULL,
		reason TEXT NOT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`

	_, err = r.db.Exec(ctx, query)
	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, `CREATE INDEX IF NOT EXISTS idx_bonus_days_user_id ON bonus_days(user_id)`)
	return err
}

func (r *PaymentRepository) SaveSubscription(ctx context.Context, sub *payment.Subscription) error {
	query := `INSERT INTO subscriptions (
		id, user_id, stripe_subscription_id, stripe_customer_id, plan_type,
		status, current_period_start, current_period_end, canceled_at, created_at, updated_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	ON CONFLICT (stripe_subscription_id) DO UPDATE SET
		status = EXCLUDED.status,
		current_period_start = EXCLUDED.current_period_start,
		current_period_end = EXCLUDED.current_period_end,
		canceled_at = EXCLUDED.canceled_at,
		updated_at = EXCLUDED.updated_at`

	_, err := r.db.Exec(ctx, query,
		sub.ID, sub.UserID, sub.StripeSubscriptionID, sub.StripeCustomerID,
		sub.PlanType, sub.Status, sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
		sub.CanceledAt, sub.CreatedAt, sub.UpdatedAt,
	)
	return err
}

func (r *PaymentRepository) GetSubscriptionByUserID(ctx context.Context, userID uuid.UUID) (*payment.Subscription, error) {
	query := `SELECT id, user_id, stripe_subscription_id, stripe_customer_id, plan_type,
		status, current_period_start, current_period_end, canceled_at, created_at, updated_at
		FROM subscriptions WHERE user_id = $1 AND status = 'active'
		ORDER BY created_at DESC LIMIT 1`

	var sub payment.Subscription
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&sub.ID, &sub.UserID, &sub.StripeSubscriptionID, &sub.StripeCustomerID,
		&sub.PlanType, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd,
		&sub.CanceledAt, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, payment.ErrNoSubscription
		}
		return nil, err
	}
	return &sub, nil
}

func (r *PaymentRepository) GetSubscriptionByStripeID(ctx context.Context, stripeID string) (*payment.Subscription, error) {
	query := `SELECT id, user_id, stripe_subscription_id, stripe_customer_id, plan_type,
		status, current_period_start, current_period_end, canceled_at, created_at, updated_at
		FROM subscriptions WHERE stripe_subscription_id = $1`

	var sub payment.Subscription
	err := r.db.QueryRow(ctx, query, stripeID).Scan(
		&sub.ID, &sub.UserID, &sub.StripeSubscriptionID, &sub.StripeCustomerID,
		&sub.PlanType, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd,
		&sub.CanceledAt, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, payment.ErrNoSubscription
		}
		return nil, err
	}
	return &sub, nil
}

func (r *PaymentRepository) UpdateSubscription(ctx context.Context, sub *payment.Subscription) error {
	query := `UPDATE subscriptions SET
		status = $1,
		current_period_start = $2,
		current_period_end = $3,
		canceled_at = $4,
		updated_at = $5
		WHERE id = $6`

	_, err := r.db.Exec(ctx, query,
		sub.Status, sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
		sub.CanceledAt, sub.UpdatedAt, sub.ID,
	)
	return err
}

func (r *PaymentRepository) GetStripeCustomerID(ctx context.Context, userID uuid.UUID) (string, error) {
	query := `SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1`

	var customerID string
	err := r.db.QueryRow(ctx, query, userID).Scan(&customerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return customerID, nil
}

func (r *PaymentRepository) SaveStripeCustomerID(ctx context.Context, userID uuid.UUID, customerID string) error {
	query := `INSERT INTO stripe_customers (user_id, stripe_customer_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id`

	_, err := r.db.Exec(ctx, query, userID, customerID)
	return err
}

// AddBonusDays adds bonus premium days to a user
func (r *PaymentRepository) AddBonusDays(ctx context.Context, userID uuid.UUID, days int, reason string) error {
	query := `INSERT INTO bonus_days (id, user_id, days, reason, created_at)
		VALUES (uuid_generate_v4(), $1, $2, $3, NOW())`
	_, err := r.db.Exec(ctx, query, userID, days, reason)
	return err
}

// GetBonusDays returns total bonus days for a user
func (r *PaymentRepository) GetBonusDays(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COALESCE(SUM(days), 0) FROM bonus_days WHERE user_id = $1`
	var total int
	err := r.db.QueryRow(ctx, query, userID).Scan(&total)
	return total, err
}
