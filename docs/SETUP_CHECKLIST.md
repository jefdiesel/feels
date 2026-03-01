# Feels Service Setup Checklist

Complete these in order. ~30-45 minutes total.

---

## 1. Neon (PostgreSQL Database)
**Time:** 5 min | **Cost:** Free

1. Go to: https://neon.tech
2. Click "Sign Up" → Sign up with GitHub (easiest)
3. Create new project:
   - Name: `feels-production`
   - Region: `US East (N. Virginia)` (or closest to your users)
4. Copy the connection string (starts with `postgresql://`)
5. Save as `DATABASE_URL`

```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 2. Upstash (Redis)
**Time:** 3 min | **Cost:** Free

1. Go to: https://console.upstash.com
2. Click "Sign Up" → Sign up with GitHub
3. Click "Create Database"
   - Name: `feels-redis`
   - Type: `Regional`
   - Region: `US-East-1` (same as Neon)
4. Copy the `UPSTASH_REDIS_REST_URL` (starts with `rediss://`)
5. Save as `REDIS_URL`

```
REDIS_URL=rediss://default:xxx@us1-xxx.upstash.io:6379
```

---

## 3. Cloudflare R2 (Photo Storage)
**Time:** 10 min | **Cost:** Free

1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up with email
3. After login, click "R2" in left sidebar
4. Click "Create bucket"
   - Name: `feels-photos`
5. Go to "Manage R2 API Tokens" → "Create API Token"
   - Permissions: `Object Read & Write`
   - Bucket: `feels-photos`
6. Copy the credentials:

```
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<Access Key ID>
S3_SECRET_KEY=<Secret Access Key>
S3_BUCKET=feels-photos
S3_USE_SSL=true
```

**Note:** Find your Account ID in the R2 dashboard URL or overview page.

---

## 4. Resend (Email)
**Time:** 10 min | **Cost:** Free

1. Go to: https://resend.com
2. Click "Sign Up" → Sign up with GitHub
3. Go to "API Keys" → "Create API Key"
   - Name: `feels-production`
   - Permission: `Full access`
4. Copy the API key (starts with `re_`)
5. Go to "Domains" → "Add Domain"
   - Add: `feelsfun.app`
   - Add the DNS records they show you to your domain
   - Wait for verification (can take a few minutes)

```
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=noreply@feelsfun.app
EMAIL_FROM_NAME=Feels
```

---

## 5. Stripe (Payments)
**Time:** 15 min | **Cost:** Free until transactions

1. Go to: https://dashboard.stripe.com/register
2. Sign up with email
3. **Stay in TEST MODE for now** (toggle in top right)
4. Go to "Products" → "Add Product":

   **Product 1: Monthly**
   - Name: `Feels Premium Monthly`
   - Price: `$9.99/month` recurring
   - Copy the Price ID (starts with `price_`)

   **Product 2: Quarterly**
   - Name: `Feels Premium Quarterly`
   - Price: `$19.99/3 months` recurring
   - Copy the Price ID

   **Product 3: Annual**
   - Name: `Feels Premium Annual`
   - Price: `$59.99/year` recurring
   - Copy the Price ID

5. Go to "Developers" → "API Keys"
   - Copy "Secret key" (starts with `sk_test_`)

6. Go to "Developers" → "Webhooks" → "Add endpoint"
   - URL: `https://your-backend-url/api/v1/payments/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy the signing secret (starts with `whsec_`)

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
STRIPE_MONTHLY_PRICE_ID=price_xxxxxxxxx
STRIPE_QUARTERLY_PRICE_ID=price_xxxxxxxxx
STRIPE_ANNUAL_PRICE_ID=price_xxxxxxxxx
```

---

## 6. Sentry (Error Tracking)
**Time:** 5 min | **Cost:** Free

1. Go to: https://sentry.io/signup
2. Sign up with GitHub
3. Create new project:
   - Platform: `Go`
   - Project name: `feels-backend`
4. Copy the DSN from the setup page

```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

---

## 7. Railway (Hosting)
**Time:** 10 min | **Cost:** Free $5 credit

1. Go to: https://railway.app
2. Click "Login" → Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `feels` repository
5. Railway auto-detects Go - let it build
6. Go to "Variables" tab and add ALL env vars from below
7. Go to "Settings" → "Networking" → "Generate Domain"
8. Copy your domain (e.g., `feels-production.up.railway.app`)
9. Update Stripe webhook URL with this domain

---

## 8. Generate Secrets
**Time:** 2 min

Run this in terminal to generate a secure JWT secret:

```bash
openssl rand -base64 32
```

```
JWT_SECRET=<paste the output here>
```

---

## Complete Environment Variables

Copy all of these into Railway's Variables tab:

```bash
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=rediss://...

# Storage
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_BUCKET=feels-photos
S3_USE_SSL=true

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_MONTHLY_PRICE_ID=price_xxx
STRIPE_QUARTERLY_PRICE_ID=price_xxx
STRIPE_ANNUAL_PRICE_ID=price_xxx

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@feelsfun.app
EMAIL_FROM_NAME=Feels

# Auth
JWT_SECRET=xxx

# App
ENV=production
PORT=8080

# Error Tracking (optional but recommended)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# Moderation (optional - add later)
# OPENAI_API_KEY=sk-xxx
# MODERATION_ENABLED=true
```

---

## Post-Setup Checklist

- [ ] Neon database created
- [ ] Upstash Redis created
- [ ] Cloudflare R2 bucket created
- [ ] Resend API key + domain verified
- [ ] Stripe products created (test mode)
- [ ] Stripe webhook configured
- [ ] Sentry project created
- [ ] Railway deployed with all env vars
- [ ] Test magic link login works
- [ ] Test payment flow (use Stripe test card: `4242 4242 4242 4242`)

---

## Going Live Checklist

When ready for real users:

1. **Stripe:** Toggle from "Test mode" to "Live mode"
2. **Stripe:** Create new live products with same prices
3. **Stripe:** Update env vars with live keys (`sk_live_`, new price IDs)
4. **Stripe:** Create new webhook with live signing secret
5. **DNS:** Point `api.feelsfun.app` to Railway domain
6. **Test:** Make a real $0.50 payment to yourself and refund it

---

## Test Cards (Stripe Test Mode)

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 3220` | Requires 3D Secure |

Use any future date and any 3-digit CVC.
