-- Add premium likes and boosts tracking to credits table
ALTER TABLE credits
ADD COLUMN IF NOT EXISTS premium_likes_used INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS boosts_used INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_boost_reset TIMESTAMP;
