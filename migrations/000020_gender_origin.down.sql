-- Remove gender_origin column
ALTER TABLE profiles DROP COLUMN IF EXISTS gender_origin;

-- Remove gender_identity column
ALTER TABLE profiles DROP COLUMN IF EXISTS gender_identity;
