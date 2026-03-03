# Feed & Match Testing Plan

## How the Feed Works

**Priority Order (ORDER BY priority, liked_at DESC):**
1. `qualified_superlike` - In your search range + superliked you
2. `qualified_like` - In your search range + liked you
3. `gap_superlike` - Outside your range but superliked you
4. `browse` - Regular profiles in your search range

**Key Rules:**
- At 10+ qualified likes → `must_process_all: true` (UI should force processing)
- Likes from people who liked you appear FIRST (before browse)
- Superlikes jump to front of queue
- After match, both users removed from each other's feed

## Test Scenarios

### Scenario 1: Likes Appear First
**Setup:**
1. User A (woman, 25) creates account
2. User B, C, D (men, 25-30) each like User A
3. User E, F (men, 25-30) exist but haven't liked A

**Expected:**
- User A's feed shows B, C, D first (priority: qualified_like)
- Then shows E, F (priority: browse)

### Scenario 2: Superlike Jumps Queue
**Setup:**
1. User A has 5 people who liked them (B, C, D, E, F)
2. User G superlikes User A

**Expected:**
- User A's feed shows G first (qualified_superlike)
- Then B, C, D, E, F (qualified_like)

### Scenario 3: Must Process at 10
**Setup:**
1. 10+ users like User A

**Expected:**
- `must_process_all: true` in feed response
- UI should prevent browsing until queue is cleared

### Scenario 4: Mutual Like Creates Match
**Setup:**
1. User A likes User B
2. User B likes User A

**Expected:**
- Second like returns `matched: true, match_id: <uuid>`
- Both likes deleted from `likes` table
- Match created in `matches` table
- WebSocket notification sent to both users

### Scenario 5: Credits Deducted Atomically
**Setup:**
1. User A has 10 credits, 0 bonus likes, 0 subscription
2. User A tries to superlike

**Expected:**
- Credit deducted: 10 → 0
- Like created
- If like fails after credit deduction → credit rolled back

## Testing Approach

### Option 1: SQL Script Testing (Quick)
```sql
-- Create test users and simulate likes
-- Check feed order directly in DB
```

### Option 2: API Testing with curl
```bash
# Login as different users
# Make API calls to /feed, /feed/like, etc.
# Check responses
```

### Option 3: Integration Test Script
Create a Go test that:
1. Creates test users
2. Makes API-like calls through services
3. Verifies feed ordering and match creation

## Quick Test Commands

### Check who liked a user
```sql
SELECT u.email, p.name, l.is_superlike, l.created_at
FROM likes l
JOIN profiles p ON p.user_id = l.liker_id
JOIN users u ON u.id = l.liker_id
WHERE l.liked_id = '<USER_ID>'
ORDER BY l.is_superlike DESC, l.created_at DESC;
```

### Check feed order for a user
```sql
-- Run the feed query directly with a user ID
```

### Create a like
```sql
INSERT INTO likes (id, liker_id, liked_id, is_superlike, created_at)
VALUES (gen_random_uuid(), '<LIKER_ID>', '<LIKED_ID>', false, NOW());
```

### Check matches
```sql
SELECT m.id, u1.email as user1, u2.email as user2, m.created_at
FROM matches m
JOIN users u1 ON u1.id = m.user1_id
JOIN users u2 ON u2.id = m.user2_id
ORDER BY m.created_at DESC;
```

## Multi-Account Testing Strategy

### Using the App
1. **Create test accounts** with different emails
2. **Use different browsers/incognito** for each account
3. **Or logout/login** between accounts

### Test Account Credentials
Create accounts like:
- `test-alice@example.com` (woman, seeking men)
- `test-bob@example.com` (man, seeking women)
- `test-charlie@example.com` (man, seeking women)

### Login Flow
```bash
# Register
curl -X POST https://api.feelsfun.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-alice@example.com","password":"TestPass123!","phone":"5551234567"}'

# Login
curl -X POST https://api.feelsfun.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-alice@example.com","password":"TestPass123!"}'
# Returns: access_token, refresh_token

# Use token for authenticated requests
curl -H "Authorization: Bearer <TOKEN>" \
  https://api.feelsfun.app/api/v1/feed
```

## Automated Test Script

```bash
#!/bin/bash
# test_matching.sh

API="https://api.feelsfun.app/api/v1"

# Create users and get tokens
ALICE_TOKEN=$(curl -s -X POST $API/auth/login -d '{"email":"test-alice@example.com","password":"pass"}' | jq -r .access_token)
BOB_TOKEN=$(curl -s -X POST $API/auth/login -d '{"email":"test-bob@example.com","password":"pass"}' | jq -r .access_token)

# Bob likes Alice
curl -X POST $API/feed/like/<ALICE_ID> -H "Authorization: Bearer $BOB_TOKEN"

# Alice checks feed - Bob should be first
curl $API/feed -H "Authorization: Bearer $ALICE_TOKEN" | jq '.profiles[0]'

# Alice likes Bob back - should match
curl -X POST $API/feed/like/<BOB_ID> -H "Authorization: Bearer $ALICE_TOKEN" | jq
# Expected: {"matched":true,"match_id":"..."}
```

## Database Direct Testing

```sql
-- Setup: Get two seed user IDs
SELECT id, email FROM users WHERE email LIKE 'seed%' LIMIT 2;

-- Test: User 1 likes User 2
INSERT INTO likes (id, liker_id, liked_id, is_superlike, created_at)
VALUES (gen_random_uuid(), '<USER1_ID>', '<USER2_ID>', false, NOW());

-- Check User 2's feed priority
-- (Run feed query with USER2_ID to see USER1 at top)

-- Test: User 2 likes User 1 back (should create match)
-- This needs to go through the API to trigger match creation logic
```

## Notes

- Seed data creates 200 test users with varied profiles
- Use `internal/testutil/testutil.go` helpers for Go integration tests
- The atomic credit+like transaction prevents credit loss on failure
- WebSocket sends real-time match notifications
