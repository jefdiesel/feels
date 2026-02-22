DROP TABLE IF EXISTS blocked_phones;
DROP TABLE IF EXISTS device_sessions;
DROP TABLE IF EXISTS phone_verifications;

DROP INDEX IF EXISTS idx_users_phone;

ALTER TABLE users DROP COLUMN IF EXISTS totp_backup_codes;
ALTER TABLE users DROP COLUMN IF EXISTS totp_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS totp_secret;
ALTER TABLE users DROP COLUMN IF EXISTS device_id;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
