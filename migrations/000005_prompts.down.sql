-- Remove prompts column from profiles table
DROP INDEX IF EXISTS idx_profiles_prompts;
ALTER TABLE profiles DROP COLUMN IF EXISTS prompts;
