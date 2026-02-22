-- Add prompts JSONB column to profiles table for Hinge-style profile prompts
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prompts JSONB DEFAULT '[]'::jsonb;

-- Create index for querying profiles with prompts
CREATE INDEX IF NOT EXISTS idx_profiles_prompts ON profiles USING GIN (prompts);
