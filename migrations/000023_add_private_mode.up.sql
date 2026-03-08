-- Add private mode to preferences
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_preferences_is_private ON preferences(user_id) WHERE is_private = TRUE;
