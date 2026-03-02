# Feels App - Context for Claude

## Deployment Architecture

- **Backend**: Go server deployed on **Railway** (auto-deploys from `main` branch)
- **Frontend**: React Native/Expo app - **built as APK** for Android testing
- **Database**: PostgreSQL on Railway
- **API URL**: `https://api.feelsfun.app/api/v1`

## Critical Facts

### The APK is Pre-Built - BUILD IT LOCALLY
- Frontend changes require rebuilding the APK **LOCALLY**
- **DO NOT use `eas build`** - use local gradle build
- You CANNOT test frontend changes by editing files - the emulator runs a compiled APK
- Only backend changes (pushed to git) take effect immediately via Railway deploy

**BUILD COMMAND:**
```bash
source ~/.nvm/nvm.sh && nvm use default
cd feels-app/android && ./gradlew assembleRelease
```
APK output: `feels-app/android/app/build/outputs/apk/release/app-release.apk`

### Backend Deploys from Git
- Push to `main` → Railway auto-deploys
- No manual restart needed
- Check Railway dashboard for deploy status/logs

### Seed Data Exists
- 200 test profiles in production database (migration 000006)
- Profiles: 60% women, 35% men, 5% non-binary
- Ages: roughly 22-46 (DOB 1980-2004)
- Location: NYC area (lat ~40.7, lng ~-74.0)
- All profiles visible to all genders

## Feed Query Filters

The feed query (`internal/repository/feed.go`) filters profiles by:
1. Not self
2. Not blocked
3. **Not already seen** (liked OR passed) - this is cumulative!
4. Not matched
5. Not shadowbanned
6. Target visible to user's gender
7. Target hasn't hard-blocked user's gender
8. (For browse) gender matches `genders_seeking`
9. (For browse) age in range
10. (For browse) distance NULL or within range

### Common "No Profiles" Causes
- **CHECK COORDINATES FIRST**: Android emulator sends Mountain View CA (37.42, -122.08), not NYC
- User swiped through all 200 test profiles (check `already_seen` count)
- `genders_seeking` is empty or only contains genders not in seed data
- Distance calculation returning huge numbers (bad lat/lng like 0,0)

### FIRST THING TO CHECK when "no profiles"
```sql
SELECT lat, lng FROM profiles WHERE user_id = (SELECT id FROM users WHERE email = 'user1@test.com');
```
If lat ~37.4 and lng ~-122: FIX IT:
```sql
UPDATE profiles SET lat = 40.7128, lng = -74.0060 WHERE user_id = (SELECT id FROM users WHERE email = 'user1@test.com');
```

## Debug Endpoint

`GET /api/v1/feed/debug` (requires auth) returns:
- `total_profiles`: profiles in DB (excluding self)
- `already_seen`: profiles user has liked/passed
- `gender_match`: profiles matching genders_seeking
- `age_match`: profiles in age range
- `user_lat`, `user_lng`: user's coordinates (×1000)
- `pref_*`: user's preference values

## Don't Do This (Claude's Fuckups)

1. **Don't assume user profile issues** without evidence - check the data
2. **Don't suggest frontend changes** when testing with APK
3. **Don't suggest "restart backend"** - it's on Railway, push to git
4. **Don't make up problems** - if user says "it worked before", something specific changed
5. **Don't add console.log for debugging** - user can't see metro logs with APK
6. **Don't explain GPS/coordinates** to user - just fix the code
7. **Don't push frontend changes without rebuilding APK** - ALWAYS rebuild locally
8. **Don't use eas build (cloud)** - use local gradle build
9. **Don't be vague** - give specific commands, not suggestions
10. **Don't ask "what do you see"** - check the database and logs yourself
11. **Don't guess at issues** - query the actual data first
12. **Don't forget the emulator sends Mountain View coords** - ALWAYS check lat/lng FIRST
13. **Don't tell user to "set emulator location"** - they don't know how, just fix backend

## Test Account

- **Email:** user1@test.com
- **Password:** password123
- **Must have NYC coords:** lat=40.7128, lng=-74.0060 (backend now ignores Mountain View coords)

## APK Build (LOCAL ONLY)

The APK is at: `feels-app/android/app/build/outputs/apk/release/app-release.apk`

Build script: `feels-app/build-apk.sh`

Node path must be set for gradle:
```bash
export PATH="/Users/jef/.nvm/versions/node/v24.11.1/bin:$PATH"
```

settings.gradle has hardcoded node path - if node version changes, update it.

## File Locations

- Backend entry: `cmd/server/main.go`
- Feed query: `internal/repository/feed.go`
- Feed service: `internal/domain/feed/service.go`
- API routes: `internal/api/router.go`
- Frontend feed: `feels-app/app/(tabs)/index.tsx`
- Feed store: `feels-app/stores/feedStore.ts`
- API client: `feels-app/api/client.ts`
- Seed data: `migrations/000006_seed_data.up.sql`
