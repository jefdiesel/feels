-- Add phone number for anti-spoofing (US only)
ALTER TABLE users ADD COLUMN phone TEXT UNIQUE;
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN phone_verified_at TIMESTAMPTZ;

-- Device binding
ALTER TABLE users ADD COLUMN device_id TEXT;

-- 2FA (TOTP) - setup but not enabled by default
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN totp_backup_codes TEXT[];

-- Phone verification codes (short-lived)
CREATE TABLE phone_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    phone           TEXT NOT NULL,
    code_hash       TEXT NOT NULL,
    attempts        INT DEFAULT 0,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX idx_phone_verifications_expires ON phone_verifications(expires_at);

-- Device sessions (track each device separately)
CREATE TABLE device_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       TEXT NOT NULL,
    device_name     TEXT,
    platform        TEXT,
    last_ip         TEXT,
    last_active     TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_sessions_user_id ON device_sessions(user_id);

-- Add index for phone lookups
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Blocked phone numbers (for anti-spoofing)
CREATE TABLE blocked_phones (
    phone           TEXT PRIMARY KEY,
    reason          TEXT,
    blocked_at      TIMESTAMPTZ DEFAULT NOW()
);
