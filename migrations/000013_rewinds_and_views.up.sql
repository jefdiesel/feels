-- Rewinds table for tracking undo actions (premium feature)
CREATE TABLE IF NOT EXISTS rewinds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_action VARCHAR(20) NOT NULL, -- 'pass' or 'like'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewinds_user_id ON rewinds(user_id);
CREATE INDEX IF NOT EXISTS idx_rewinds_created_at ON rewinds(created_at);

-- Profile views for analytics
CREATE TABLE IF NOT EXISTS profile_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON profile_views(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_viewed ON profile_views(viewer_id, viewed_id);
