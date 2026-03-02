-- Remove gender_presentations column
ALTER TABLE preferences DROP COLUMN IF EXISTS gender_presentations;

-- Remove is_premium flag from likes
ALTER TABLE likes DROP COLUMN IF EXISTS is_premium;

-- Remove index
DROP INDEX IF EXISTS idx_likes_liked_id_pending;
