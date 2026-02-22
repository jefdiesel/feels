-- Magic links for passwordless authentication
CREATE TABLE magic_links (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    token_hash      TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX idx_magic_links_email ON magic_links(email);
CREATE INDEX idx_magic_links_expires ON magic_links(expires_at);

-- User public keys for E2E encrypted messaging
CREATE TABLE user_public_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key      TEXT NOT NULL,
    key_type        TEXT NOT NULL DEFAULT 'ECDH-P256',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key_type)
);

CREATE INDEX idx_user_public_keys_user_id ON user_public_keys(user_id);

-- Add encrypted_content column to messages for E2E encryption
ALTER TABLE messages ADD COLUMN encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN encryption_key_id UUID REFERENCES user_public_keys(id);
