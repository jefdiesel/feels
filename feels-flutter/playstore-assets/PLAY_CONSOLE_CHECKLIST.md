# Feels — Google Play Console "App Content" Cheat Sheet

Package: `com.feelsfun.app`
App name: **Feels: Real Dating, No Games**
Category: Dating
Audience: 18+ adults only

This document gives copy-paste answers for every Play Console "App content" form section. Work top-to-bottom; check each box as you submit it.

---

## 1. App access

Play Console path: **App content → App access**

- [ ] Select: **All or some functionality is restricted**
- [ ] Add instructions for reviewers

**Reviewer credentials (copy-paste):**

```
Feels is a dating app. All core features (profiles, matching, messaging, premium)
require a logged-in account. Please use the test account below.

LOGIN STEPS:
1. Launch the app.
2. On the login screen, ignore "Continue with Apple" at the top.
3. Tap "Other login options" (below the Apple button).
4. Choose "Continue with Email".
5. Enter email: playreviewer@degenjef.com
6. Enter password: FeelsReviewer2026!
7. You'll land directly in the main swipe feed. Pre-seeded matches and
   conversations are available in the Matches tab.

NOTES:
- This account has feels+ premium unlocked so the reviewer can see all
  gated features (unlimited likes, see who liked you, rewind, incognito).
- Location permission prompt appears on first launch — "Allow while using
  app" is fine. Approximate location is sufficient.
- Photo/notification permissions are optional and can be dismissed.
- No phone number or SMS code is required for this account.
```

**Why:** Google rejects dating apps if reviewers can't get past the login wall. The email option is buried under an "Other login options" affordance, so we spell that out explicitly to avoid a rejection round-trip.

**Gotcha:** Keep this account alive and premium indefinitely. Don't let the subscription expire or Google will fail the next review.

---

## 2. Ads

Play Console path: **App content → Ads**

- [ ] Select: **No, my app does not contain ads**

**Why:** Feels has zero ad SDKs, no ad networks, no house ads, no sponsored content. Revenue is 100% from feels+ subscriptions.

**Gotcha:** If you ever add AdMob, Meta Audience Network, or even a single sponsored card, you must flip this to "Yes" and re-declare. Cross-promotion of your own apps also counts as ads per Google's definition.

---

## 3. Content rating questionnaire (IARC)

Play Console path: **App content → Content ratings → Start questionnaire**

- [ ] Email: `degenjef@gmail.com`
- [ ] Category: **Reference, News, or Educational** — WRONG. Choose **Social Networking / Dating**
  - Actual selection in IARC: **"Social Networking"** (there is no separate Dating option; Social Networking is the canonical bucket for dating apps)

### Violence
- [ ] Does the app contain violence? **No**
- [ ] Realistic violence? **No**
- [ ] Fantasy violence? **No**
- [ ] Cartoon violence? **No**

**Why:** No gameplay, no combat, no depictions of violence anywhere in the product.

### Sexual content
- [ ] Does the app contain nudity? **No**
- [ ] Does the app contain sexual content or innuendo? **Yes**
  - Follow-up: **"Mild/suggestive — users may discuss romance and attraction in profiles and messages, but nudity and explicit sexual content are prohibited by our content policy and actively moderated."**
- [ ] Explicit sexual content? **No**
- [ ] Sexual violence? **No**

**Why:** It's a dating app — suggestive flirting is inherent to the product. But our Community Guidelines ban nudity and explicit content, and we have photo moderation + reporting. Answer "Yes" to suggestive content to be honest; "No" to nudity/explicit.

**Gotcha:** Do NOT answer "No" to suggestive content. Dating apps that claim zero sexual content get flagged for misrepresentation.

### Profanity / crude humor
- [ ] Does the app contain profanity or crude humor? **No (app itself) / User-generated only**
  - If IARC forces a single answer: **No** at the app level, then disclose in the UGC section below.

**Why:** Feels ships no pre-written profanity. Any profanity is user-generated and subject to reporting/moderation, which is disclosed separately under UGC.

### Controlled substances
- [ ] References to alcohol, tobacco, or drugs? **No**
- [ ] Use of alcohol, tobacco, or drugs? **No**

**Why:** The app ships no such references. Users might mention them in profiles (e.g., "social drinker"), but that's UGC, not app content.

### Gambling
- [ ] Does the app contain simulated gambling? **No**
- [ ] Real-money gambling? **No**

**Why:** No wagering, no loot boxes, no chance-based mechanics. Swiping is not gambling.

### User-generated content
- [ ] Does the app allow users to interact or exchange content? **Yes**
- [ ] Does the app share user location with other users? **Yes (approximate only — city/distance, never precise coordinates)**
- [ ] Does the app allow users to purchase digital goods? **Yes**

**Why:** Profiles, photos, bios, and messages are all user-generated. We show approximate distance ("3 miles away") but never expose precise lat/lng to other users.

### Miscellaneous
- [ ] Unrestricted internet access (in-app browser with arbitrary URLs)? **No**
- [ ] Does the app collect or share personal info? **Yes** (see Data Safety section)
- [ ] Does the app share user location? **Yes (with other users, approximate)**

**Why:** Feels does not ship a generic in-app web browser. Privacy/terms links open in the OS browser (Custom Tabs), which does not count as unrestricted internet access.

### Expected rating
You should receive: **IARC: Mature 17+ / PEGI 16 / ESRB Mature / USK 16+**

**Gotcha:** If you come back with an "Everyone 10+" rating, you answered the sexual content question wrong — dating apps must rate Mature.

---

## 4. Target audience and content

Play Console path: **App content → Target audience and content**

### Target age groups
- [ ] Select ONLY: **18 and over**
- [ ] Deselect every other age bucket

**Why:** Feels is strictly 18+. Our ToS and registration flow gate at 18. Selecting anything younger will force you into Designed for Families / Teacher Approved compliance, which we cannot satisfy.

### Appeals to children
- [ ] Does your store listing appeal to children? **No**
- [ ] Confirm: icon, screenshots, description contain no cartoon characters, child-oriented themes, or youth-friendly language? **Confirmed — No**

**Why:** Branding is adult-oriented. No mascots, no bright cartoons, no youth appeal.

### Unintended appeal to children
- [ ] Acknowledgement: "I confirm my app is not designed for children and does not unintentionally appeal to them." **Yes**

### Ads disclosure (in this section)
- [ ] Does your app show ads? **No**
- [ ] Matches the Ads declaration in Section 2.

### Warning: users under target age
- [ ] Will you add a warning that the app is not intended for users under 18? **Yes** (already in store description and onboarding)

---

## 5. News app declaration

Play Console path: **App content → News app**

- [ ] Is this a news app? **No**

**Why:** Feels is a dating app, not a news publisher. Answering Yes triggers a separate news-provider verification flow you can't complete.

---

## 6. COVID-19 contact tracing and status apps

Play Console path: **App content → COVID-19 contact tracing and status apps**

- [ ] Is your app a publicly available COVID-19 contact tracing or status app? **No**
- [ ] Declaration: **"My app is not a publicly available COVID-19 contact tracing or status app."**

**Why:** Unrelated to the product.

---

## 7. Data safety form

Play Console path: **App content → Data safety**

### Top-level questions

- [ ] Does your app collect or share any of the required user data types? **Yes**
- [ ] Is all of the user data collected by your app encrypted in transit? **Yes**
  - Why: all API traffic is HTTPS (TLS 1.2+). Messages are additionally end-to-end encrypted.
- [ ] Do you provide a way for users to request that their data is deleted? **Yes**
  - In-app path: Settings → Account → Delete Account
  - Also available via email to `degenjef@gmail.com`

### Data types — declare each as follows

For every "Yes" below, answer the sub-questions the same way unless noted:
- **Collected?** Yes
- **Shared with third parties?** No (unless noted)
- **Processing is ephemeral?** No (we persist)
- **Required or optional?** As noted
- **Purposes:** as noted

---

#### Personal info

- [ ] **Name** — Collected: **Yes** · Shared: **No** · Required · Purposes: **Account management, App functionality**
  - Why: Display name shown on profile.
- [ ] **Email address** — Collected: **Yes** · Shared: **No** · Required · Purposes: **Account management, App functionality, Communications**
  - Why: Primary login identifier and magic-link delivery.
- [ ] **User IDs** — Collected: **Yes** · Shared: **No** · Required · Purposes: **Account management, App functionality, Analytics**
  - Why: Internal UUIDs for account linkage.
- [ ] **Address** — **No**
- [ ] **Phone number** — **No**
- [ ] **Race and ethnicity** — **No**
- [ ] **Political or religious beliefs** — **No**
- [ ] **Sexual orientation** — **Yes, Optional** · Shared: **No** · Purposes: **App functionality (matching preferences)**
  - Why: Users can set who they want to see (men/women/everyone). This is optional but nearly universal for a dating app. Disclose it honestly.
- [ ] **Other info** — **No**

#### Financial info
- [ ] **User payment info** — **No**
- [ ] **Purchase history** — **No** (Google Play handles subscription state; we store only a boolean "is premium" + tier, not purchase records)
- [ ] **Credit score** — **No**
- [ ] **Other financial info** — **No**

**Why:** All billing is via Google Play Billing. Card data never touches our servers. We receive entitlement webhooks from RevenueCat/Play, not financial details.

#### Location
- [ ] **Approximate location** — Collected: **Yes** · Shared: **No** (we share *derived distance* to matches, not raw coordinates) · Required · Purposes: **App functionality**
- [ ] **Precise location** — **No**

**Why:** We use coarse location for discovery radius. We never collect or display GPS-precise coordinates.

**Gotcha:** If your Android manifest requests `ACCESS_FINE_LOCATION`, Google WILL cross-check and may force you to declare precise location. Confirm the manifest only uses `ACCESS_COARSE_LOCATION`.

#### Web browsing
- [ ] **Web browsing history** — **No**

#### App activity
- [ ] **App interactions** — Collected: **Yes** · Shared: **No** · Required · Purposes: **Analytics, App functionality**
  - Why: Swipes, match events, screen views drive the feed ranking and product metrics.
- [ ] **In-app search history** — Collected: **Yes** · Shared: **No** · Optional · Purposes: **App functionality**
  - Why: Filter preferences (age range, distance) are persisted per-user.
- [ ] **Installed apps** — **No**
- [ ] **Other user-generated content** — Collected: **Yes** · Shared: **No** · Required · Purposes: **App functionality**
  - Why: Bios, prompts, profile answers.
- [ ] **Other actions** — **No**

#### Web browsing
- [ ] **Web browsing history** — **No**

#### App info and performance
- [ ] **Crash logs** — Collected: **Yes** · Shared: **No** · Required · Purposes: **Analytics, App functionality**
- [ ] **Diagnostics** — Collected: **Yes** · Shared: **No** · Required · Purposes: **Analytics, App functionality**
- [ ] **Other app performance data** — **No**

**Why:** Standard crash + perf telemetry for debugging. No PII in crash payloads.

#### Device or other identifiers
- [ ] **Device or other IDs** — Collected: **Yes** · Shared: **No** · Required · Purposes: **Analytics, App functionality, Fraud prevention, security, and compliance**
  - Why: Device ID used for push notification routing, session management, and abuse/fraud prevention (banning device fingerprints of spammers).

#### Photos and videos
- [ ] **Photos** — Collected: **Yes** · Shared: **No** (other users see them in-app, but that is not "sharing with third parties" per Google's definition — it's app functionality) · Required · Purposes: **App functionality**
- [ ] **Videos** — **No** (only if you actually ship video — currently no)

**Gotcha:** Google's definition of "shared" specifically excludes "transferred to service providers" and "user-initiated transfers to other users within the app." Profile photos shown to matches do NOT count as sharing. Don't over-declare.

#### Audio files
- [ ] **Voice or sound recordings** — **No**
- [ ] **Music files** — **No**
- [ ] **Other audio files** — **No**

#### Files and docs
- [ ] **Files and docs** — **No**

#### Calendar
- [ ] **Calendar events** — **No**

#### Contacts
- [ ] **Contacts** — **No**

**Why:** We do not read the device contact list. Confirm no `READ_CONTACTS` permission in manifest.

#### Messages
- [ ] **Emails** — **No**
- [ ] **SMS or MMS** — **No**
- [ ] **Other in-app messages** — Collected: **Yes** · Shared: **No** · Required · Purposes: **App functionality**
  - Why: Chat messages between matched users. Disclose that they are **end-to-end encrypted** in the Data Safety description field.

#### Health and fitness
- [ ] **Health info** — **No**
- [ ] **Fitness info** — **No**

### Security practices
- [ ] **Is data encrypted in transit?** **Yes** (TLS 1.2+ everywhere)
- [ ] **Do you provide a way for users to request their data be deleted?** **Yes** (in-app: Settings → Account → Delete Account; email: degenjef@gmail.com)
- [ ] **Have you committed to following the Play Families Policy?** **N/A — 18+ app**
- [ ] **Has your app been independently validated against a global security standard?** **No** (leave unchecked unless you have a real audit)

**Gotcha:** Do NOT check "independently validated" unless you've paid for an actual SOC 2 / ISO 27001 / MASA audit. Google spot-checks this.

---

## 8. Government apps

Play Console path: **App content → Government apps**

- [ ] Is your app made by or on behalf of a government? **No**

---

## 9. Financial features

Play Console path: **App content → Financial features**

- [ ] Does your app provide financial features? **No**
- [ ] (All sub-options: banking, lending, crypto, investment, money transfer, insurance, tax) **No**

**Why:** feels+ subscriptions are not "financial features" — they are digital goods sold via Google Play Billing, which is handled separately.

---

## 10. Health

Play Console path: **App content → Health** (if present — rolling out)

- [ ] Is your app a health app? **No**
- [ ] Does it handle health data? **No**

---

## 11. Store settings

Play Console path: **Grow → Store presence → Main store listing** and **Store settings**

### App category
- [ ] App or game: **App**
- [ ] Category: **Dating**
- [ ] Tags (pick up to 5 from Google's allowed list):
  - Dating
  - Social
  - Lifestyle
  - Communication
  - (leave 5th blank unless a closer match exists)

### Store listing contact details
- [ ] **Email (required):** `degenjef@gmail.com`
- [ ] **Phone:** leave blank unless you have a published support line
- [ ] **Website:** `https://feelsfun.app`

### External marketing
- [ ] Do you want your app promoted outside Google Play? **Yes**

### App availability by country
See Section 14.

---

## 12. Privacy policy

Play Console path: **App content → Privacy policy**

- [ ] Privacy policy URL: `https://feelsfun.app/privacy`
- [ ] Terms of Service URL (in store listing description, not a dedicated field): `https://feelsfun.app/terms`

**Gotcha:** The URL must:
1. Be live and publicly reachable (no auth wall).
2. Actually mention the app name "Feels".
3. List every data type declared in Data Safety.
4. Describe the deletion process.
5. NOT be a PDF or Google Doc — must be a real HTML page.

Verify `curl -I https://feelsfun.app/privacy` returns `200` before submitting.

---

## 13. App pricing

Play Console path: **Monetize → Products → Subscriptions** and **Main store listing**

- [ ] App price: **Free**
- [ ] Contains in-app purchases: **Yes**
- [ ] In-app purchase price range (auto-populated from your SKUs): **$14.99 – $79.99**

### Subscription SKUs to configure

| Product ID | Name | Price (USD) | Billing period |
|---|---|---|---|
| `feels_plus_monthly` | feels+ Monthly | $14.99 | 1 month |
| `feels_plus_quarterly` | feels+ Quarterly | $29.99 | 3 months |
| `feels_plus_annual` | feels+ Annual | $79.99 | 1 year |

### Subscription benefits description (copy-paste for each SKU)
```
feels+ unlocks:
- Unlimited likes
- See who already liked you
- Rewind your last swipe
- Incognito mode — browse without appearing in others' stacks
- Priority in discovery
Subscription auto-renews unless cancelled at least 24 hours before the
end of the current period. Manage or cancel anytime in Google Play.
```

**Gotcha:** Every subscription must have a "Base plan" configured in Play Console before it will appear in the app. Quarterly and annual must be explicitly set to **prepaid or auto-renewing** (pick auto-renewing for all three).

---

## 14. Countries / regions

Play Console path: **Release → Production → Countries / regions**

### Launch plan
- [ ] Initial launch: **United States only**
- [ ] All other countries: **Unavailable** (uncheck)

### Expansion (later)
Phase 2 candidates once you're stable in US:
- Canada
- United Kingdom
- Australia
- Ireland
- New Zealand

**Why:** Start narrow so your moderation, support volume, and legal exposure (GDPR, UK Online Safety Act, etc.) stay manageable. Expansion is one form submission away.

**Gotcha:** Do NOT launch in Germany, South Korea, or France on day one — each has specific dating-app or youth-protection requirements that require separate compliance work (e.g. German AVS, Korean real-name verification).

---

## Required before publishing — Summary checklist

Every one of these must be green before Play Console will let you roll to production:

- [ ] **App access** — reviewer credentials added with login steps
- [ ] **Ads** — "No ads" declared
- [ ] **Content rating** — IARC questionnaire completed, rating = Mature 17+
- [ ] **Target audience** — 18+ only, no appeal to children
- [ ] **News app** — No
- [ ] **COVID-19 contact tracing** — No
- [ ] **Data safety** — every data type declared, encryption in transit = Yes, deletion = Yes
- [ ] **Government apps** — No
- [ ] **Financial features** — No
- [ ] **Health** — No (if section present)
- [ ] **Store listing** — category Dating, screenshots uploaded, feature graphic uploaded, short + full description
- [ ] **Privacy policy** — `https://feelsfun.app/privacy` live and returns 200
- [ ] **App pricing** — Free + IAP, three subscription SKUs live and tested
- [ ] **Countries** — US selected
- [ ] **App signing** — Play App Signing enrolled
- [ ] **Target API level** — meets current Play requirement (API 34+ for 2026)
- [ ] **Closed testing** — 12 testers × 14 consecutive days completed (required for new personal developer accounts; skip if you're an org account)
- [ ] **Identity verification** — Developer account identity + D-U-N-S (if org) verified
- [ ] **Dating app declaration** — If Play prompts the Dating App Review Form, complete it with the same reviewer credentials from Section 1

### Final sanity checks before hitting "Send for review"
- [ ] Install the signed release APK on a fresh device and log in with the reviewer account end-to-end
- [ ] Confirm privacy policy URL loads in a private browser window
- [ ] Confirm all three subscription SKUs purchase correctly via a license tester account
- [ ] Confirm Delete Account flow actually deletes the account (reviewers test this)
- [ ] Confirm blocking/reporting/unmatch UI is reachable within 2 taps from any profile or chat

Good luck. First submission for dating apps is almost always rejected once; budget for a 3–5 day round-trip.
