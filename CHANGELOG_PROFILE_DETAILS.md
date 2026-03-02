# Profile Details Update

## Summary
Added comprehensive profile editing for lifestyle and personal details fields. Users can now set and display information about their work, lifestyle choices, and personal attributes directly from their profile page.

---

## New Features

### 1. "What I Do" Section
Two free-text fields for describing work and passions:

| Field | Description | Display |
|-------|-------------|---------|
| **For money** | Job/career | 💼 in feed cards |
| **For passion** | Hobbies/interests | ✨ in feed cards |

- Max 50 characters each
- Optional - can be left blank
- Shows in detail bubbles on SwipeCards

### 2. "My Details" Section
Eight lifestyle/personal fields with predefined options:

| Field | Options |
|-------|---------|
| **Zodiac Sign** | Aries ♈, Taurus ♉, Gemini ♊, Cancer ♋, Leo ♌, Virgo ♍, Libra ♎, Scorpio ♏, Sagittarius ♐, Capricorn ♑, Aquarius ♒, Pisces ♓ |
| **Religion** | Agnostic, Atheist, Buddhist, Catholic, Christian, Hindu, Jewish, Muslim, Spiritual, Other |
| **Have Kids** | Yes I have kids, No kids |
| **Want Kids** | Want kids, Don't want kids, Open to kids |
| **Alcohol** | Never drink, Drink socially, Drink often |
| **Weed** | Never, Socially, Often, 420 friendly |
| **Vibe** | Vanilla, Curious, Sensual, Experienced, Adventurous |
| **Looking For** | Serious relationship, Relationship, Dating, Meeting people, Friends & more |

Each field has:
- Tap to open selection modal
- Visual checkmark for selected option
- "Clear / Don't show" button to remove from profile

---

## Files Changed

### Backend (Go)

**Migration:**
- `migrations/000015_passion_work_fields.up.sql` - Adds `work_for_money` and `work_for_passion` columns
- `migrations/000015_passion_work_fields.down.sql` - Removes columns

**Domain:**
- `internal/domain/profile/profile.go`
  - Added `WorkForMoney` and `WorkForPassion` to Profile struct
  - Added fields to CreateProfileRequest
  - Added fields to UpdateProfileRequest

**Repository:**
- `internal/repository/profile.go`
  - Updated Create query (lines 36-49)
  - Updated GetByUserID query (lines 60-71)
  - Updated Update query (lines 94-106)
  - Updated GetByShareCode query (lines 372-383)

- `internal/repository/feed.go`
  - Updated feed profile query to include work fields (lines 104-108)
  - Updated Scan to include work fields (lines 138-142)

**Handlers:**
- `internal/api/handlers/auth.go`
  - Fixed neighborhood pointer dereference (line 363)

### Frontend (React Native)

**Stores:**
- `stores/authStore.ts`
  - Added to User interface: `work_for_money`, `work_for_passion`, `zodiac`, `religion`, `has_kids`, `wants_kids`, `alcohol`, `weed`, `kink_level`

- `stores/feedStore.ts`
  - Added `workForMoney` and `workForPassion` to Profile interface
  - Added `work_for_money` and `work_for_passion` to BackendProfile interface
  - Updated transformProfile to map new fields

**Components:**
- `components/SwipeCard.tsx`
  - Updated details array to show work fields with icons (💼 and ✨)

**Screens:**
- `app/(tabs)/profile.tsx`
  - Added "What I Do" section with two editable cards
  - Added "My Details" section with 8 selectable fields
  - Added work field modal for text input
  - Added details modal for option selection
  - Added DETAIL_FIELDS configuration object
  - Added helper functions: `openWorkModal`, `saveWorkField`, `openDetailModal`, `saveDetailField`, `clearDetailField`, `getDetailDisplayValue`
  - Added styles for new sections

---

## Database Schema

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_for_money TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_for_passion TEXT;
```

Existing columns used by details (already in schema):
- `zodiac TEXT`
- `religion TEXT`
- `has_kids BOOLEAN`
- `wants_kids TEXT`
- `alcohol TEXT`
- `weed TEXT`
- `kink_level TEXT`
- `looking_for TEXT[]`

---

## API

Profile update endpoint accepts all fields:

```json
PUT /profile
{
  "work_for_money": "Software engineer",
  "work_for_passion": "Music production",
  "zodiac": "leo",
  "religion": "agnostic",
  "has_kids": false,
  "wants_kids": "maybe",
  "alcohol": "socially",
  "weed": "never",
  "kink_level": "curious",
  "looking_for": ["dating"]
}
```

Set any field to `null` to clear/hide it.

---

## Display on Feed Cards

Fields appear in the detail bubbles row on SwipeCards:
- Work fields show with icons: `💼 Software engineer` and `✨ Music`
- Other details show formatted: `Drinks socially`, `Leo`, `Catholic`, etc.

---

## Date
March 2, 2026
