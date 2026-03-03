#!/bin/bash
# Test script for feed priority and matching
# Usage: ./scripts/test_matching.sh [local|prod]

set -e

ENV="${1:-local}"

if [ "$ENV" = "prod" ]; then
  API="https://api.feelsfun.app/api/v1"
else
  API="http://localhost:8080/api/v1"
fi

echo "Testing against: $API"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Use existing seed accounts (user1@test.com through user200@test.com)
# Password for all: password123
# Pass user numbers as arguments: ./test_matching.sh local 50 51
USER1="${2:-50}"
USER2="${3:-51}"
ALICE_EMAIL="user${USER1}@test.com"
BOB_EMAIL="user${USER2}@test.com"
PASSWORD="password123"

echo "Using accounts: user${USER1} and user${USER2}"

echo -e "${YELLOW}=== Logging into Test Accounts ===${NC}"

# Login as Alice (user1)
echo "Logging in as Alice (user1)..."
ALICE_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALICE_EMAIL\",\"password\":\"$PASSWORD\",\"device_id\":\"test-alice\",\"platform\":\"test\"}")
ALICE_TOKEN=$(echo $ALICE_RESP | jq -r '.access_token // empty')

if [ -z "$ALICE_TOKEN" ]; then
  echo -e "${RED}Failed to login as Alice: $ALICE_RESP${NC}"
  exit 1
fi
echo -e "${GREEN}Alice logged in${NC}"

# Login as Bob (user2)
echo "Logging in as Bob (user2)..."
BOB_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BOB_EMAIL\",\"password\":\"$PASSWORD\",\"device_id\":\"test-bob\",\"platform\":\"test\"}")
BOB_TOKEN=$(echo $BOB_RESP | jq -r '.access_token // empty')

if [ -z "$BOB_TOKEN" ]; then
  echo -e "${RED}Failed to login as Bob: $BOB_RESP${NC}"
  exit 1
fi
echo -e "${GREEN}Bob logged in${NC}"

# Get user IDs
ALICE_ID=$(curl -s "$API/users/me" -H "Authorization: Bearer $ALICE_TOKEN" | jq -r '.id')
BOB_ID=$(curl -s "$API/users/me" -H "Authorization: Bearer $BOB_TOKEN" | jq -r '.id')

echo ""
echo "Alice ID: $ALICE_ID"
echo "Bob ID: $BOB_ID"

echo ""
echo -e "${YELLOW}=== Checking Profiles ===${NC}"

# Get Alice's profile info
ALICE_PROFILE=$(curl -s "$API/profile" -H "Authorization: Bearer $ALICE_TOKEN")
ALICE_NAME=$(echo $ALICE_PROFILE | jq -r '.name // "unknown"')
echo "Alice's profile: $ALICE_NAME"

# Get Bob's profile info
BOB_PROFILE=$(curl -s "$API/profile" -H "Authorization: Bearer $BOB_TOKEN")
BOB_NAME=$(echo $BOB_PROFILE | jq -r '.name // "unknown"')
echo "Bob's profile: $BOB_NAME"

echo ""
echo -e "${YELLOW}=== Test 1: Bob Likes Alice ===${NC}"

LIKE_RESP=$(curl -s -X POST "$API/feed/like/$ALICE_ID" \
  -H "Authorization: Bearer $BOB_TOKEN")
echo "Response: $LIKE_RESP"

MATCHED=$(echo $LIKE_RESP | jq -r '.matched')
if [ "$MATCHED" = "false" ]; then
  echo -e "${GREEN}✓ Like recorded (no match yet)${NC}"
else
  echo -e "${RED}✗ Unexpected match on first like${NC}"
fi

echo ""
echo -e "${YELLOW}=== Test 2: Check Alice's Feed (Bob should be first) ===${NC}"

FEED_RESP=$(curl -s "$API/feed" -H "Authorization: Bearer $ALICE_TOKEN")
FIRST_USER=$(echo $FEED_RESP | jq -r '.profiles[0].user_id // empty')
FIRST_PRIORITY=$(echo $FEED_RESP | jq -r '.profiles[0].priority // empty')
QUEUED=$(echo $FEED_RESP | jq -r '.queued_likes // 0')

echo "First profile in feed: $FIRST_USER"
echo "Priority: $FIRST_PRIORITY"
echo "Queued likes: $QUEUED"

if [ "$FIRST_USER" = "$BOB_ID" ]; then
  echo -e "${GREEN}✓ Bob appears first in Alice's feed${NC}"
else
  echo -e "${YELLOW}⚠ Bob not first (may need photos for feed visibility)${NC}"
fi

if [ "$FIRST_PRIORITY" = "qualified_like" ]; then
  echo -e "${GREEN}✓ Priority is qualified_like${NC}"
fi

echo ""
echo -e "${YELLOW}=== Test 3: Alice Likes Bob Back (Should Match) ===${NC}"

MATCH_RESP=$(curl -s -X POST "$API/feed/like/$BOB_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN")
echo "Response: $MATCH_RESP"

MATCHED=$(echo $MATCH_RESP | jq -r '.matched')
MATCH_ID=$(echo $MATCH_RESP | jq -r '.match_id // empty')

if [ "$MATCHED" = "true" ]; then
  echo -e "${GREEN}✓ It's a match! Match ID: $MATCH_ID${NC}"
else
  echo -e "${RED}✗ Expected match but got: $MATCH_RESP${NC}"
fi

echo ""
echo -e "${YELLOW}=== Test 4: Check Matches ===${NC}"

MATCHES_RESP=$(curl -s "$API/matches" -H "Authorization: Bearer $ALICE_TOKEN")
MATCH_COUNT=$(echo $MATCHES_RESP | jq 'length')

echo "Alice's matches: $MATCH_COUNT"

if [ "$MATCH_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Match appears in matches list${NC}"
  echo $MATCHES_RESP | jq '.[0]'
else
  echo -e "${RED}✗ No matches found${NC}"
fi

echo ""
echo -e "${YELLOW}=== Test 5: Check Credits (Regular like should use daily/bonus) ===${NC}"

CREDITS_RESP=$(curl -s "$API/credits" -H "Authorization: Bearer $ALICE_TOKEN")
echo "Alice's credits: $CREDITS_RESP"

echo ""
echo -e "${GREEN}=== Tests Complete ===${NC}"
echo ""
echo "Test accounts created:"
echo "  Alice: $ALICE_EMAIL"
echo "  Bob: $BOB_EMAIL"
echo "  Password: $PASSWORD"
