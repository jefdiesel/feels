-- Add unique constraint on device_id to prevent multiple accounts per device
-- First, clean up any NULL device_ids (shouldn't block the constraint)
-- Note: device_id can be NULL for existing accounts, but if set, must be unique

-- Create a unique index that only applies to non-null device_ids
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_device_id_unique ON users (device_id) WHERE device_id IS NOT NULL;
