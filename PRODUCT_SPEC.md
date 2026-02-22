# Feels - Dating App Product Spec

## Economy

### Free Tier
- 10 likes/day (no rollover)
- No superlikes
- Earn credits by processing inbox queue

### Paid Tiers (Auto-Renew)

| Plan | Monthly | 3-Month | Credits/mo | Perks |
|------|---------|---------|------------|-------|
| Starter | $4.99/mo | $12.99 ($4.33/mo) | 1000 | Superlikes unlocked |
| Plus | $9.99/mo | $24.99 ($8.33/mo) | 2500 | Superlikes unlocked |

- 3-month plans include free verification
- All paid users keep 10 free daily likes (no rollover)
- Superlikes cost 10 credits

### Credit System
- 1 credit = 1 like
- 10 credits = 1 superlike (bypasses full inbox)
- Earn credits by processing your inbox queue
- **Credits expire monthly** - Use it or lose it. Drives engagement.
- **Bonus likes stack unlimited** - Clear queue 5x = 50 bonus likes. Rewards engagement.

### Cold Start
- No special treatment for new users
- New users have 10 free likes like everyone else
- Paid users browse and discover them naturally

---

## Feed System

### Core Principle
**Show people who want you first. The goal is to match.**

No separate "Liked You" tab. One feed, smart ordering. People who already like you appear first because that's the fastest path to a match.

### Three Visibility Zones

```
SEARCH RANGE             OUTSIDE RANGE            HARD BLOCK
(e.g., 20-30)            (e.g., 31-44)            (e.g., 45+)

✓ Auto-shows in feed     ✗ Not auto-shown         ✗ Never seen
✓ Likes appear           ✓ Superlikes get in      ✗ Superlikes ignored
✓ Normal browsing        ✓ Can browse manually    ✗ Can't browse them
                         ✓ If you like them →     ✗ Mutual invisibility
                           they now see you
```

### Key Distinction
- **Search range** = preference (flexible, can venture outside manually)
- **Hard block** = inbound protection (they can't see you, but you can still see them)
- **Liking someone opens the door** - if you like someone, they see your like (unless THEY have you hard blocked)

### Feed Priority Order
```
1. QUALIFIED SUPERLIKES  - In search range + superliked you
2. QUALIFIED LIKES (10)  - In search range + liked you
3. GAP SUPERLIKES        - Outside range but not blocked + superliked (no badge, just appears)
4. REGULAR BROWSE        - New profiles in search range
```

### How It Works
1. User sets preferences (age range, gender, etc.)
2. Open the app → see people who already like you, qualified first
3. At 10 qualified likes → must process (yes/no) before seeing more
4. Clearing your 10 → reward: 10 bonus likes for today
5. Out-of-range likes appear after qualified, not mixed in
6. Regular browsing only after processing who wants you

### Superlikes
- Paid feature: jump to front of someone's feed
- Shows with ⭐ badge
- Qualified superlikes = very first
- Out-of-range superlikes = after qualified likes

### Decay
- After 30 days unprocessed, like drops out of Top 10
- Opens slot for new qualified like
- Old like moves to position 11, 12, etc. (not deleted)

### Upsell Moments
- "Their inbox is full" → "Send a Superlike to get seen first"
- "Out of likes today" → Subscription CTA
- "Want more likes?" → Buy credits

---

## Visibility & Filtering

### Gender Options
- Man
- Woman
- Trans
- Non-binary

### Three Layers of Control

1. **Who You See** (browsing preferences)
   - Select genders you want to browse
   - Age range, distance, etc.
   - **Trans visibility toggle** - Searcher decides whether to include trans profiles in results

2. **Who Sees You** (visibility slots)
   - Open slots for genders that can view your profile
   - "I want to appear to: [men] [women] [non-binary] [trans]"

3. **Hard Limits** (block inbound)
   - Even if they CAN see you, they CANNOT like you
   - Complete invisibility - they never see your profile
   - Example: Queer woman blocks men from seeing her entirely

---

## Profile

### Layout (TikTok-Style Full Screen)

**Default View (Browsing)**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     FULL SCREEN PHOTO                       │
│                      (auto-advances)                        │
│                                                             │
│                        • • ○ • •                            │
│                                                             │
│  Alex, 28                                                   │
│                                                             │
│          [ ✗ ]              [ ♡ ]                           │
└─────────────────────────────────────────────────────────────┘
```

**Swipe Up = Full Profile**
```
┌─────────────────────────────────────────────────────────────┐
│  Alex, 28 · Williamsburg · ✓                                │
│  Sensual                                                    │
│                                                             │
│  ♌ Leo · Catholic · Drinks socially                        │
│  No kids · Wants kids                                       │
│                                                             │
│  "Design nerd who takes coffee too seriously.               │
│   Looking for someone to argue about fonts with."           │
│                                                             │
│  LOOKING FOR                                                │
│  "Museum dates and takeout nights."                         │
└─────────────────────────────────────────────────────────────┘
```

### Browsing UX
- Full-screen photo slideshow (3-5 photos)
- Auto-advance every 2-3 seconds
- Tap to pause / manually advance
- Name + Age overlay only (minimal)
- Swipe up = reveal full profile details
- Yes/No buttons or swipe gestures to like/pass
- Silent, no audio/video (privacy - discreet browsing)

### Required Fields
- Name
- Age (from DOB)
- Zip code (displays as neighborhood)
- 3 photos minimum
- Bio

### Optional Fields
- Zodiac sign
- Religion
- Has kids (Yes / No)
- Wants kids (Yes / No / Maybe)
- Alcohol (Never / Socially / Often)
- Weed (Never / Socially / Often / 420 friendly)
- "What I'm Looking For" prompt
- 2 additional photos (4-5 total)
- Location ping (for distance filtering)

### Kink Spectrum
Displayed as badge on profile:
- Vanilla
- Curious
- Sensual
- Experienced
- Kinky

### Location
- Profile displays: Neighborhood (derived from zip)
- Search/filter uses: Distance from zip or ping (if enabled)
- No "X miles away" shown on profile

### Liking
- One button, like the whole profile
- No "like this photo" or "comment on prompt" gimmicks

---

## Messaging

### After Match Only
- No messaging until mutual like

### Image Sharing Flow
1. Match created → images DISABLED by default
2. Text chat enabled
3. After **5 messages from each person** (10 total alternating) → private system prompt to each user
   - Must be alternating back-and-forth, not one person sending 10
   - Forces real conversation before image unlock
4. "Ready to share photos? [Enable Images]"
5. When one enables → other gets notification (no special handling if only one enables - human behavior)
6. When both enable → images unlocked in chat

### Turning Off Images
- Can turn off anytime
- No notification sent to other person
- BUT: Your message input is GREYED OUT
- Can't send messages while images are off
- Prevents receiving pics then continuing to chat without reciprocating

### Ghosting
- No indicators for why someone stopped responding
- Human behavior stays human

---

## Safety

### Block
- Adds user to your personal blacklist
- Mutual invisibility (same as hard limits)
- No reason required

### Block + Match Interactions
- **Hard block + mutual like** - If you like someone you blocked AND they like back, block lifts automatically. Mutual interest overrides.
- **Block after match** - Existing matches are preserved. Block only affects future visibility, not past matches.

### Report
- Block + flag to admin
- Requires simple reason:
  - Inappropriate photos
  - Harassment
  - Spam / fake profile
  - Underage
  - Other: [text field]

---

## Verification

### Approach
- Third-party service (Persona, Stripe Identity, etc.)
- User scans ID + takes selfie externally
- App stores: verified = true, age confirmed
- App does NOT store: ID image, personal docs

### Availability
- Free with 3-month subscription
- Optional purchase otherwise (~$2-3)

### Display
- Checkmark badge on profile: "Alex, 28 ✓"

---

## Platform
- iOS
- Android

---

## Core Philosophy
- **Goal is connection, not gatekeeping**
- Popular users = product, not customers
- Paying users buy access to popular users
- Processing queue = guaranteed eyeballs (value for likers)
- **All likes visible for free** - no paywall on who liked you
- Monetize volume and urgency (superlikes), not anxiety
- No barriers for engagement, friction points become upsells
- Inclusive by design (behavior-based, not identity-based)
- Anti-harassment through system design, not moderation
- 10-inbox is a forcing function for engagement, not a limit
