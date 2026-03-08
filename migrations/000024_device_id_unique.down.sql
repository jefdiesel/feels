-- Remove unique constraint on device_id
DROP INDEX IF EXISTS idx_users_device_id_unique;
