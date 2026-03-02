-- Add gender_origin column to profiles
-- This is set once at profile creation and never changes
-- Users can change gender to trans/non_binary but cannot cross from man↔woman
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_origin TEXT;

-- Add gender_identity for free-text identity display (e.g., "trans woman", "genderfluid")
-- This is optional and can be shown in bio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_identity TEXT;

-- Backfill existing profiles: set gender_origin to current gender
-- For trans/non_binary users, we can't know their origin, so leave NULL (they keep full flexibility)
UPDATE profiles
SET gender_origin = gender
WHERE gender IN ('man', 'woman') AND gender_origin IS NULL;
