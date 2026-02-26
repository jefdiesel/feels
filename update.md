# Feels App - Session Update

## Date: 2026-02-24

### Project Overview
**Feels** is a dating app with:
- React Native/Expo frontend (`feels-app/`)
- Go backend with PostgreSQL, Redis, MinIO (`internal/`, `cmd/server/`)

---

### Issues Fixed

#### 1. CORS Configuration
- **Problem**: Frontend running on port 8083 was blocked by CORS (backend only allowed 8081, 8082, 19006)
- **Fix**: Updated `internal/api/router.go` to allow `http://localhost:*`

#### 2. Migration Conflict
- **Problem**: Duplicate migration sequence number (two 000004 migrations)
- **Fix**: Renamed `000004_prompts.*` to `000005_prompts.*`

#### 3. Gender Case Mismatch in Search Settings
- **Problem**: Settings UI saved capitalized genders (`Woman`, `Man`) but database uses lowercase (`woman`, `man`), causing feed to return no matches
- **Fix**: Updated `feels-app/app/settings.tsx` to use `{ label, value }` objects for gender options, storing lowercase values

#### 4. Search Settings Not Closing After Save
- **Problem**: After saving preferences, an alert was shown but screen didn't close
- **Fix**: Changed `handleSave` in `feels-app/app/settings.tsx` to call `router.back()` on success instead of showing an alert

#### 5. Password Reset
- **Problem**: User forgot password, bcrypt hash format mismatch between Node (`$2b$`) and Go (`$2a$`)
- **Fix**: Generated correct bcrypt hash using Go and updated database directly

---

### Test Data Added

Created **100 new test profiles** with varied attributes:

| Attribute | Distribution |
|-----------|--------------|
| Total | 108 profiles |
| Women | 43 (40%) |
| Men | 46 (43%) |
| Non-binary | 19 (17%) |
| Age range | 21-55 years |
| Locations | Within ~50 miles of NYC |
| Kink levels | vanilla, curious, sensual, experienced, kinky |
| Looking for | relationship, casual, friends, exploration |

All test users have:
- 2 photos each
- Preferences with varied gender seeking options
- Credits initialized
- Password: `test`

---

### Running the App

```bash
# Start services
make docker-up

# Run migrations
make migrate

# Start backend (runs on :8080)
make run

# Start frontend (in feels-app/)
cd feels-app && npm start
# Press 'w' for web, 'i' for iOS, 'a' for Android
```

### Test Account
- Email: `jefdieselnyc@gmail.com`
- Password: `test`

---

### Files Modified

| File | Change |
|------|--------|
| `internal/api/router.go` | Fixed CORS to allow all localhost ports |
| `feels-app/app/settings.tsx` | Fixed gender value casing, auto-close on save |
| `migrations/000004_prompts.*` | Renamed to `000005_prompts.*` |
| `.env` | Created from `.env.example` |

---

### Database Commands (Useful)

```bash
# Connect to database
docker exec -it feels-postgres psql -U feels -d feels

# Check profile counts
SELECT gender, COUNT(*) FROM profiles GROUP BY gender;

# Reset swipes for a user
DELETE FROM passes WHERE passer_id = 'user-uuid';
DELETE FROM likes WHERE liker_id = 'user-uuid';

# Check feed query results
SELECT name, gender, neighborhood FROM profiles LIMIT 10;
```
