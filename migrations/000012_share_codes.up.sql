-- Add share_code to profiles for shareable profile links
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_code VARCHAR(12) UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_share_code ON profiles(share_code) WHERE share_code IS NOT NULL;

-- Generate share codes for existing profiles
UPDATE profiles SET share_code = UPPER(SUBSTRING(MD5(user_id::text || created_at::text) FROM 1 FOR 8))
WHERE share_code IS NULL;
