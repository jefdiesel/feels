-- Remove premium likes and boosts columns from credits table
ALTER TABLE credits
DROP COLUMN IF EXISTS premium_likes_used,
DROP COLUMN IF EXISTS boosts_used,
DROP COLUMN IF EXISTS last_boost_reset;
