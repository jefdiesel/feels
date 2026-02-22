-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of creation (respecting foreign keys)
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS daily_likes;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS credits;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS image_permissions;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS preferences;
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

-- Drop extensions
DROP EXTENSION IF EXISTS "uuid-ossp";
