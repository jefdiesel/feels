-- Add read_at column to messages table for tracking read status
ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;

-- Index for efficiently finding unread messages per conversation
CREATE INDEX idx_messages_unread ON messages(match_id, sender_id) WHERE read_at IS NULL;
