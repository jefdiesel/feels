-- Remove encrypted message columns
ALTER TABLE messages DROP COLUMN IF EXISTS encryption_key_id;
ALTER TABLE messages DROP COLUMN IF EXISTS encrypted_content;

-- Drop user public keys table
DROP TABLE IF EXISTS user_public_keys;

-- Drop magic links table
DROP TABLE IF EXISTS magic_links;
