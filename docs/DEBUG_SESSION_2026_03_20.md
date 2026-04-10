# Debug Session: Likes Not Creating Matches

## Problem
- Likes from test users weren't appearing at front of feed
- When swiping right on users who liked you, no match was created
- Swipes appeared to succeed but nothing was recorded in the database

## Root Causes Found

### 1. Device ID Blocking Multiple Accounts
- The `device_id` unique constraint prevented creating test accounts on the same device
- **Fix:** Dropped `idx_users_device_id_unique` index and created accounts with shared device_id

### 2. New Accounts Missing Profiles/Preferences
- `degenjef@gmail.com` and `falsejef@gmail.com` had no profiles set up
- Without profiles, feed queries can't run and likes fail silently

### 3. Missing Credits Record
- `jefdieselnyc@gmail.com` had no entry in the `credits` table
- The atomic like creation requires a credits record
- **Fix:** Added 100 bonus likes to the account

### 4. Age Range Mismatch (Main Issue)
- `jefdieselnyc@gmail.com` is **52 years old**
- All test users had `age_max` set to 44-45
- When liking someone outside your age preferences, backend returns `requires_premium: true`
- **Frontend bug:** The app doesn't display any error when `requires_premium` is returned - it just moves to next card silently
- **Fix:** Updated all test users' `age_max` to 60

## Frontend Bug to Fix
In `feels-app/stores/feedStore.ts`, the swipe response handling doesn't check for `requires_premium`:

```typescript
// Current code just checks for match
return {
  matched: response.data?.matched || false,
  match_id: response.data?.match_id,
};
```

Should also check `response.data?.requires_premium` and show appropriate UI feedback.

## SQL Commands Used

```sql
-- Drop device_id unique constraint
DROP INDEX IF EXISTS idx_users_device_id_unique;

-- Create test accounts with shared device_id
INSERT INTO users (id, email, password_hash, email_verified, device_id, totp_enabled, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'degenjef@gmail.com', '', true, '6ca6180a6d78d441', false, now(), now()),
  (gen_random_uuid(), 'falsejef@gmail.com', '', true, '6ca6180a6d78d441', false, now(), now());

-- Add likes from random test users to target accounts
WITH target_users AS (
  SELECT id FROM users WHERE email IN ('jefdieselnyc@gmail.com', 'degenjef@gmail.com', 'falsejef@gmail.com')
),
random_likers AS (
  SELECT id FROM users
  WHERE email NOT IN ('jefdieselnyc@gmail.com', 'degenjef@gmail.com', 'falsejef@gmail.com')
  ORDER BY random()
  LIMIT 5
)
INSERT INTO likes (liker_id, liked_id, is_superlike, created_at)
SELECT r.id, t.id, false, now() - (random() * interval '7 days')
FROM random_likers r
CROSS JOIN target_users t
ON CONFLICT (liker_id, liked_id) DO NOTHING;

-- Add credits/bonus likes
INSERT INTO credits (user_id, bonus_likes, premium_likes_used, last_reset)
VALUES ((SELECT id FROM users WHERE email = 'jefdieselnyc@gmail.com'), 100, 0, CURRENT_DATE)
ON CONFLICT (user_id) DO UPDATE SET bonus_likes = 100;

-- Fix age preferences
UPDATE preferences SET age_max = 60 WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'user%@test.com');
```

## Feed Priority Logic
The feed query (`internal/repository/feed.go`) prioritizes:
1. `qualified_superlike` - superlike + matches your gender + in your age range
2. `qualified_like` - like + matches your gender + in your age range
3. `gap_superlike` - superlike but outside preferences
4. `browse` - normal feed

Users who liked you only appear at front if they're "qualified" (match your preferences).
