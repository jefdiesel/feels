-- Fix subscription schema mismatch
-- Migration 000001 created old schema with: plan, period, credits_monthly, started_at, expires_at, auto_renew
-- Migration 000009 expected: stripe_subscription_id, stripe_customer_id, plan_type, status, current_period_start, current_period_end
-- But CREATE TABLE IF NOT EXISTS meant the new schema was never applied

-- Step 1: Backup old subscriptions table
ALTER TABLE subscriptions RENAME TO subscriptions_legacy;

-- Step 2: Drop old indexes
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_subscriptions_expires;

-- Step 3: Create new subscriptions table with Stripe schema
CREATE TABLE subscriptions (
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
);

-- Step 4: Create indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Step 5: Migrate any existing data from legacy table
-- Map old columns to new schema:
-- - plan -> plan_type
-- - expires_at -> current_period_end
-- - started_at -> current_period_start
-- - auto_renew = true AND expires_at > NOW() -> status = 'active'
INSERT INTO subscriptions (
    id,
    user_id,
    stripe_subscription_id,
    stripe_customer_id,
    plan_type,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
)
SELECT
    id,
    user_id,
    'legacy_' || id::text,  -- Placeholder stripe_subscription_id
    'legacy_customer_' || user_id::text,  -- Placeholder stripe_customer_id
    plan,
    CASE
        WHEN auto_renew = true AND expires_at > NOW() THEN 'active'
        WHEN expires_at > NOW() THEN 'active'
        ELSE 'canceled'
    END,
    started_at,
    expires_at,
    started_at,
    started_at
FROM subscriptions_legacy
WHERE id IS NOT NULL;
