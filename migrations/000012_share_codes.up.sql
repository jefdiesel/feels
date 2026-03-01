-- Add share_code to profiles for shareable profile links
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_code VARCHAR(12) UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_share_code ON profiles(share_code) WHERE share_code IS NOT NULL;

-- Generate cryptographically random share codes for existing profiles
-- Uses gen_random_bytes for secure randomness, base64 encoded and cleaned for URL safety
UPDATE profiles SET share_code = UPPER(SUBSTRING(REPLACE(REPLACE(ENCODE(gen_random_bytes(6), 'base64'), '/', ''), '+', '') FROM 1 FOR 8))
WHERE share_code IS NULL;
