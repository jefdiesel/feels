-- Post-MVP Features Migration

-- User moderation fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'active'
  CHECK (moderation_status IN ('active', 'warned', 'suspended', 'shadowbanned'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS shadowban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shadowbanned_at TIMESTAMPTZ;

-- Profile views for analytics
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_id)
);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON profile_views(created_at);

-- Super like messages
ALTER TABLE likes ADD COLUMN IF NOT EXISTS attached_message TEXT;

-- Rewinds
CREATE TABLE IF NOT EXISTS rewinds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rewinds_user_id ON rewinds(user_id);
CREATE INDEX IF NOT EXISTS idx_rewinds_created_at ON rewinds(created_at);

-- Photo verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none'
  CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;

-- Reports workflow
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
  CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed'));
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_taken TEXT;

-- Daily picks
CREATE TABLE IF NOT EXISTS daily_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pick_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pick_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pick_date, pick_user_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_picks_user_id_date ON daily_picks(user_id, pick_date);

-- AI moderation logs
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flagged_content TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_flag_type ON moderation_logs(flag_type);
