ALTER TABLE preferences DROP COLUMN IF EXISTS is_private;
DROP INDEX IF EXISTS idx_preferences_is_private;
