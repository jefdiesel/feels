-- Remove share_code from profiles
DROP INDEX IF EXISTS idx_profiles_share_code;
ALTER TABLE profiles DROP COLUMN IF EXISTS share_code;
