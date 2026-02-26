-- Remove read_at column from messages
DROP INDEX IF EXISTS idx_messages_unread;
ALTER TABLE messages DROP COLUMN IF EXISTS read_at;
