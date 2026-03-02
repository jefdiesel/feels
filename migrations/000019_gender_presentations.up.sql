-- Add gender_presentations JSONB column to preferences
-- Structure: {"man": {"enabled": true, "bio": "...", "tags": [...], "age_min": 30, "age_max": 40}, ...}
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS gender_presentations JSONB DEFAULT '{}';

-- Add is_premium flag to likes to track premium likes (bypassed queue or out-of-age)
ALTER TABLE likes ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Add index for counting pending likes per user (for queue slot system)
CREATE INDEX IF NOT EXISTS idx_likes_liked_id_pending ON likes(liked_id, created_at DESC);

-- Comment explaining the gender_presentations structure
COMMENT ON COLUMN preferences.gender_presentations IS 'Per-gender visibility settings: {gender: {enabled: bool, bio: string|null, tags: string[], age_min: int|null, age_max: int|null}}';
