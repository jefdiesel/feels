-- Post-MVP Features Rollback

-- Drop AI moderation logs
DROP INDEX IF EXISTS idx_moderation_logs_flag_type;
DROP INDEX IF EXISTS idx_moderation_logs_user_id;
DROP TABLE IF EXISTS moderation_logs;

-- Drop daily picks
DROP INDEX IF EXISTS idx_daily_picks_user_id_date;
DROP TABLE IF EXISTS daily_picks;

-- Remove reports workflow columns
ALTER TABLE reports DROP COLUMN IF EXISTS action_taken;
ALTER TABLE reports DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE reports DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE reports DROP COLUMN IF EXISTS status;

-- Remove photo verification columns
ALTER TABLE profiles DROP COLUMN IF EXISTS verification_submitted_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS verification_status;
ALTER TABLE profiles DROP COLUMN IF EXISTS verification_photo_url;

-- Drop rewinds
DROP INDEX IF EXISTS idx_rewinds_created_at;
DROP INDEX IF EXISTS idx_rewinds_user_id;
DROP TABLE IF EXISTS rewinds;

-- Remove super like messages
ALTER TABLE likes DROP COLUMN IF EXISTS attached_message;

-- Drop profile views
DROP INDEX IF EXISTS idx_profile_views_created_at;
DROP INDEX IF EXISTS idx_profile_views_viewed_id;
DROP TABLE IF EXISTS profile_views;

-- Remove user moderation fields
ALTER TABLE users DROP COLUMN IF EXISTS shadowbanned_at;
ALTER TABLE users DROP COLUMN IF EXISTS shadowban_reason;
ALTER TABLE users DROP COLUMN IF EXISTS moderation_status;
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
