-- Rollback subscription schema fix
-- This restores the old subscription schema

-- Step 1: Drop new subscriptions table
DROP TABLE IF EXISTS subscriptions;

-- Step 2: Rename legacy table back
ALTER TABLE subscriptions_legacy RENAME TO subscriptions;

-- Step 3: Recreate old indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);
