# Feels Infrastructure Guide

## Required Services (Pick One From Each)

| Category | Purpose | Recommendation |
|----------|---------|----------------|
| Hosting | Run the Go backend | Railway |
| Database | PostgreSQL | Neon |
| Cache | Redis for rate limiting | Upstash |
| Storage | Photos (S3-compatible) | Cloudflare R2 |
| Payments | Subscriptions | Stripe |
| Email | Magic links, notifications | Resend |
| SMS | Phone verification (optional) | Twilio |
| Push | Mobile notifications | Expo Push |
| Errors | Error tracking | Sentry |
| Moderation | AI content moderation (optional) | OpenAI |

---

## Service Options & Pricing

### 1. Hosting / Compute

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Railway | $5 credit | $20/mo |
| Render | 750 hrs/mo | $25/mo |
| Fly.io | 3 shared VMs | $5-50/mo |
| DigitalOcean | - | $20-100/mo |

### 2. PostgreSQL Database

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Neon | 3GB, autoscale | $19/mo |
| Supabase | 500MB | $25/mo |
| Railway | 500MB | $20/mo |
| AWS RDS | - | $15-100/mo |

### 3. Redis (Rate Limiting / Cache)

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Upstash | 10k cmds/day | $10/mo |
| Railway | Shared | $10/mo |
| Redis Cloud | 30MB | $5-30/mo |

### 4. Object Storage (Photos)

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Cloudflare R2 | 10GB, 10M requests | $0.015/GB |
| Backblaze B2 | 10GB | $0.005/GB |
| AWS S3 | - | $0.023/GB |
| DigitalOcean Spaces | - | $5/mo |

### 5. Payments

| Provider | Pricing |
|----------|---------|
| Stripe | 2.9% + $0.30 per transaction |

### 6. Email (Transactional)

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Resend | 3k emails/mo | $20/mo (50k) |
| Mailgun | 5k/mo (3 months) | $15/mo |
| SendGrid | 100/day | $20/mo |

### 7. SMS (Phone Verification)

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Twilio | $15 trial credit | ~$0.0079/SMS |
| Vonage | - | ~$0.0068/SMS |
| AWS SNS | - | ~$0.00645/SMS |

**Note:** SMS is currently disabled. Enable when needed.

### 8. Push Notifications

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Expo Push | Unlimited | Free |
| Firebase FCM | Unlimited | Free |

### 9. Error Tracking

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Sentry | 5k events/mo | $26/mo |
| Bugsnag | 7.5k events/mo | $59/mo |

### 10. Content Moderation (AI)

| Provider | Free Tier | Paid |
|----------|-----------|------|
| OpenAI | $5 credit | ~$0.002/1k tokens |
| AWS Rekognition | - | $1/1k images |

---

## Cost Estimates by Stage

### Launch (0-500 users): $0-50/mo

```
Railway hosting     $0 (free credit) → $20
Neon DB            $0 (free tier)
Upstash Redis      $0 (free tier)
Cloudflare R2      $0 (free tier)
Resend             $0 (free tier)
Twilio             $0 (disabled)
Expo Push          $0 (always free)
Sentry             $0 (free tier)
───────────────────────────────────
TOTAL              $0-20/mo
```

### Growth (500-5k users): $100-150/mo

```
Railway Pro        $20
Neon Pro           $19
Upstash Pro        $10
Cloudflare R2      $5-10
Resend             $20
Twilio             $20-40 (if enabled)
Sentry             $26
OpenAI             $10
───────────────────────────────────
TOTAL              $130-155/mo
```

### Scale (5k-25k users): $250-400/mo

```
Railway (scaled)   $40-60
Neon (scaled)      $40-60
Upstash (scaled)   $20-30
Cloudflare R2      $15-30
Resend             $40-60
Twilio             $50-100
Sentry             $50
OpenAI             $20-40
───────────────────────────────────
TOTAL              $275-430/mo
```

---

## Free Tier Limits & Breaking Points

| Service | Free Limit | Breaks At |
|---------|------------|-----------|
| Neon DB | 3GB storage | ~10k users |
| Upstash Redis | 10k cmds/day | ~500 DAU |
| Cloudflare R2 | 10GB storage | ~2k users |
| Resend Email | 3k emails/mo | ~1k signups/mo |
| Sentry | 5k events/mo | ~500 DAU |
| Railway | $5 credit | ~1 week |

---

## Environment Variables

```bash
# === REQUIRED ===

# Database (Neon)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:token@host:6379

# Storage (Cloudflare R2)
S3_ENDPOINT=account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=feels-photos
S3_USE_SSL=true

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_QUARTERLY_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@feelsfun.app
EMAIL_FROM_NAME=Feels

# Auth
JWT_SECRET=your-secure-random-string-min-32-chars

# App
ENV=production
PORT=8080

# === OPTIONAL ===

# SMS - Twilio (disabled by default)
# TWILIO_ACCOUNT_SID=AC...
# TWILIO_AUTH_TOKEN=...
# TWILIO_FROM_NUMBER=+1...

# Error Tracking - Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# Moderation - OpenAI
OPENAI_API_KEY=sk-...
MODERATION_ENABLED=true
MODERATION_BLOCK_THRESHOLD=0.9
MODERATION_REVIEW_THRESHOLD=0.7
```

---

## Recommended Setup Order

### Phase 1: Launch MVP
1. **Neon** - Create PostgreSQL database
2. **Upstash** - Create Redis instance
3. **Cloudflare R2** - Create bucket for photos
4. **Resend** - Set up email domain verification
5. **Railway** - Deploy backend
6. **Stripe** - Set up products and prices (test mode first)
7. **Sentry** - Create project for error tracking

### Phase 2: Pre-Launch
1. Stripe → Switch to live mode
2. Test all payment flows
3. Set up Sentry alerts

### Phase 3: Post-Launch (when needed)
1. **Twilio** - Enable phone verification
2. **OpenAI** - Enable content moderation
3. Scale services as needed

---

## Disabled Features

### Phone Verification (Twilio)
Currently disabled to save costs. To enable:

1. Add Twilio env vars
2. Uncomment routes in `internal/api/router.go`:
   ```go
   protected.Post("/auth/phone/send", authHandler.SendPhoneCode)
   protected.Post("/auth/phone/verify", authHandler.VerifyPhone)
   ```
3. Uncomment client calls in `feels-app/api/client.ts`

### 2FA (TOTP)
Currently disabled. To enable:

1. Uncomment route in `internal/api/router.go`:
   ```go
   protected.Post("/auth/2fa/setup", authHandler.Setup2FA)
   ```
2. Uncomment client call in `feels-app/api/client.ts`
3. Build 2FA setup UI in app

---

## Monitoring & Alerts

### Sentry
- Set up alerts for error spikes
- Monitor performance transactions

### Upstash
- Monitor Redis command usage
- Set alerts at 80% of daily limit

### Railway / Hosting
- Monitor memory and CPU usage
- Set up deployment notifications

---

## Backup Strategy

### Database (Neon)
- Neon has automatic point-in-time recovery
- Consider daily exports for critical data

### Photos (R2)
- Enable versioning on R2 bucket
- Photos are user-replaceable, low backup priority

---

## Security Checklist

- [ ] Strong JWT_SECRET (32+ random characters)
- [ ] Database SSL enabled (sslmode=require)
- [ ] Redis SSL enabled (rediss://)
- [ ] S3 bucket is private
- [ ] Stripe webhook signature verification
- [ ] Rate limiting enabled
- [ ] CORS configured for production domain only
- [ ] Environment variables not committed to git
