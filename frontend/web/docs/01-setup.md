# Frontend Setup

## Prerequisites

- Node.js 18+
- pnpm

## Quick Start

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

## Environment Variables

```env
# Baked at build time (NEXT_PUBLIC_* accessible in browser)
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=<key>
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=<url>

# Runtime only (server actions, never sent to browser)
BASE_URL=http://localhost:8080      # used by axios in server actions
AUTH_SECRET=<min-32-char-secret>   # session encryption
```

> `BASE_URL` and `NEXT_PUBLIC_API_URL` should point to the same backend. `BASE_URL` is used server-side (server actions), `NEXT_PUBLIC_API_URL` is used client-side.

## Dev Commands

```bash
pnpm dev          # Turbopack dev server
pnpm build        # production build
pnpm lint         # ESLint
pnpm type-check   # tsc --noEmit (no output = success)
```

## Key Directories

```
frontend/src/
├── app/
│   ├── (private)/          # authenticated routes
│   │   ├── (main)/         # main app layout (sidebar + header)
│   │   └── admin/          # admin-only pages
│   ├── (public)/           # login, verify, etc.
│   └── _actions/           # server actions (all API calls live here)
├── components/
│   ├── layout/sidebar/     # sidebar nav, workspace switcher
│   └── ui/                 # ShadCN + custom components
├── hooks/                  # React Query hooks
├── lib/                    # auth, utils, constants
└── types/                  # TypeScript types
```
