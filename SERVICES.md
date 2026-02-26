# Backend Services Setup

This document lists all external services required to run Feels in production.

## Required Services

### 1. PostgreSQL Database
**Purpose:** Primary data store
**Free Options:**
- [Supabase](https://supabase.com) - 500MB free, generous limits
- [Neon](https://neon.tech) - 512MB free, serverless Postgres
- [Railway](https://railway.app) - $5 free credit/month

**Environment Variable:**
```
DATABASE_URL=postgres://user:password@host:5432/feels?sslmode=require
```

### 2. Redis
**Purpose:** Caching, rate limiting, real-time features
**Free Options:**
- [Upstash](https://upstash.com) - 10k commands/day free, serverless
- [Railway](https://railway.app) - $5 free credit/month
- [Redis Cloud](https://redis.com/try-free/) - 30MB free

**Environment Variable:**
```
REDIS_URL=redis://default:password@host:6379
```

### 3. Object Storage (S3-compatible)
**Purpose:** Photo storage
**Free Options:**
- [Cloudflare R2](https://www.cloudflare.com/r2/) - 10GB free, no egress fees (RECOMMENDED)
- [Backblaze B2](https://www.backblaze.com/b2/) - 10GB free
- [Tigris](https://www.tigrisdata.com/) - 5GB free

**Environment Variables:**
```
S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=feels-photos
S3_USE_SSL=true
```

### 4. Email Service
**Purpose:** Magic links, notifications
**Free Options:**
- [Resend](https://resend.com) - 3,000 emails/month free (RECOMMENDED)
- [SendGrid](https://sendgrid.com) - 100 emails/day free
- [Mailgun](https://mailgun.com) - 5,000 emails/month for 3 months

**Environment Variables:**
```
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Feels
```

### 5. Stripe (Payments)
**Purpose:** Subscription billing
**Cost:** 2.9% + 30¢ per transaction (no monthly fee)

**Setup Steps:**
1. Create account at [stripe.com](https://stripe.com)
2. Create 3 products/prices in Dashboard:
   - Premium Monthly: $14.99/month
   - Premium Quarterly: $29.99/3 months
   - Premium Annual: $79.99/year
3. Set up webhook endpoint: `https://api.yourdomain.com/api/v1/payments/webhook`
4. Configure webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

**Environment Variables:**
```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_QUARTERLY_PRICE_ID=price_xxxxx
STRIPE_ANNUAL_PRICE_ID=price_xxxxx
```

---

## Optional Services (for scaling)

### Push Notifications
**Purpose:** Mobile notifications
**Service:** Expo Push Notifications (free with Expo)

No additional setup required - uses Expo's built-in push notification service.

### SMS (if needed for phone verification)
**Purpose:** Phone number verification
**Options:**
- [Twilio](https://twilio.com) - Pay per message (~$0.0075/SMS)
- [Vonage](https://vonage.com) - Similar pricing

---

## Complete .env File Template

```bash
# Server
PORT=8080
ENV=production

# Database
DATABASE_URL=postgres://user:password@host:5432/feels?sslmode=require

# Redis
REDIS_URL=redis://default:password@host:6379

# JWT (generate a secure random string)
JWT_SECRET=your-secure-random-string-at-least-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

# S3/Object Storage
S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=feels-photos
S3_USE_SSL=true

# Email (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Feels

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_QUARTERLY_PRICE_ID=price_xxxxx
STRIPE_ANNUAL_PRICE_ID=price_xxxxx
```

---

## Cost Estimate (Free Tier)

| Service | Monthly Cost |
|---------|-------------|
| PostgreSQL (Supabase/Neon) | $0 |
| Redis (Upstash) | $0 |
| Object Storage (Cloudflare R2) | $0 |
| Email (Resend) | $0 |
| Stripe | Transaction fees only |
| **Total** | **$0** + Stripe fees |

## Cost Estimate (Production ~10k users)

| Service | Monthly Cost |
|---------|-------------|
| PostgreSQL (Supabase Pro) | $25 |
| Redis (Upstash Pro) | $10 |
| Object Storage (R2) | ~$5 |
| Email (Resend Starter) | $0-20 |
| Stripe | Transaction fees |
| **Total** | **~$40-60/month** + Stripe fees |
