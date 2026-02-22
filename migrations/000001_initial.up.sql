-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (auth)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    email_verified  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Profiles
CREATE TABLE profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    dob             DATE NOT NULL,
    gender          TEXT NOT NULL,
    zip_code        TEXT NOT NULL,
    neighborhood    TEXT,
    bio             TEXT NOT NULL,
    kink_level      TEXT,
    looking_for     TEXT,
    zodiac          TEXT,
    religion        TEXT,
    has_kids        BOOLEAN,
    wants_kids      TEXT,
    alcohol         TEXT,
    weed            TEXT,
    lat             FLOAT,
    lng             FLOAT,
    is_verified     BOOLEAN DEFAULT FALSE,
    last_active     TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_location ON profiles(lat, lng);
CREATE INDEX idx_profiles_last_active ON profiles(last_active);

-- Photos (3-5 per profile)
CREATE TABLE photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    position        INT NOT NULL CHECK (position >= 1 AND position <= 5),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, position)
);

CREATE INDEX idx_photos_user_id ON photos(user_id);

-- Search Preferences
CREATE TABLE preferences (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    genders_seeking     TEXT[] NOT NULL,
    age_min             INT DEFAULT 18 CHECK (age_min >= 18),
    age_max             INT DEFAULT 99 CHECK (age_max <= 99),
    distance_miles      INT DEFAULT 25,
    include_trans       BOOLEAN DEFAULT TRUE,
    visible_to_genders  TEXT[] NOT NULL,
    hard_block_genders  TEXT[],
    hard_block_age_min  INT,
    hard_block_age_max  INT
);

-- Likes
CREATE TABLE likes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    liker_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    liked_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_superlike    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(liker_id, liked_id)
);

CREATE INDEX idx_likes_liker_id ON likes(liker_id);
CREATE INDEX idx_likes_liked_id ON likes(liked_id);
CREATE INDEX idx_likes_superlike ON likes(liked_id, is_superlike) WHERE is_superlike = TRUE;

-- Matches (created when mutual like)
CREATE TABLE matches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)
);

CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);

-- Messages
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT,
    image_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_messages_created_at ON messages(match_id, created_at);

-- Image permissions per match
CREATE TABLE image_permissions (
    match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enabled         BOOLEAN DEFAULT FALSE,
    enabled_at      TIMESTAMPTZ,
    PRIMARY KEY (match_id, user_id)
);

-- Blocks
CREATE TABLE blocks (
    blocker_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);

-- Reports
CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason          TEXT NOT NULL,
    details         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_reported_id ON reports(reported_id);

-- Credits & Subscriptions
CREATE TABLE credits (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance         INT DEFAULT 0 CHECK (balance >= 0),
    bonus_likes     INT DEFAULT 0 CHECK (bonus_likes >= 0),
    last_reset      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan            TEXT NOT NULL,
    period          TEXT NOT NULL,
    credits_monthly INT NOT NULL,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    auto_renew      BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

-- Daily like tracking
CREATE TABLE daily_likes (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    count           INT DEFAULT 0 CHECK (count >= 0),
    PRIMARY KEY (user_id, date)
);

-- Refresh tokens for JWT rotation
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
