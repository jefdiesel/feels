# Feels Web Dashboard

Full-featured web app for Feels dating platform.

**Live:** https://feelsfun.app

## Features

- **Authentication** - Magic link email login
- **Feed** - Swipe cards with drag gestures, like/pass/superlike
- **Matches** - View matches and conversations
- **Chat** - Real-time messaging
- **Profile** - Edit photos, bio, prompts, neighborhood
- **Settings** - Notifications, privacy, subscription management

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state)
- Framer Motion (animations)

## Development

```bash
cd feels-app/web
npm install
npm run dev
```

Runs at http://localhost:3000

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api.feelsfun.app  # production
NEXT_PUBLIC_API_URL=http://localhost:8080      # local
```

## Deployment

Deployed on Vercel. Push to main auto-deploys.

```bash
npx vercel --prod
```

## Project Structure

```
src/
├── app/
│   ├── (authenticated)/    # Protected routes
│   │   ├── feed/           # Swipe interface
│   │   ├── matches/        # Match list
│   │   ├── chat/[id]/      # Chat
│   │   ├── profile/        # Edit profile
│   │   └── settings/       # Settings + subscription
│   ├── auth/verify/        # Magic link verification
│   ├── profile/setup/      # New user onboarding
│   └── page.tsx            # Login
├── components/
│   ├── AuthGuard.tsx
│   ├── Navigation.tsx
│   └── SwipeCard.tsx
├── lib/
│   ├── api.ts              # API client
│   └── utils.ts
└── stores/
    └── auth.ts             # Auth state
```
