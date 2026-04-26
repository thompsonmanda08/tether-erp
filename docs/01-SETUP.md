# Setup

## Prerequisites

- Go 1.21+
- Node.js 18+
- PostgreSQL 14+
- pnpm (`npm i -g pnpm`)

## 1. Backend

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, CORS_ALLOWED_ORIGINS
go mod download
make db-reset             # runs migrations + seeds
make dev                  # starts at http://localhost:8080
```

Key env vars:

| Variable               | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `DATABASE_URL`         | `postgresql://user:pass@localhost:5432/tether_erp` |
| `JWT_SECRET`           | Min 32 chars                                       |
| `PORT`                 | Default `8080`                                     |
| `APP_ENV`              | `development` / `production`                       |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins                    |

## 2. Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev                  # starts at http://localhost:3000
```

Key env vars:

| Variable              | Description                              |
| --------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Backend URL (baked at build time)        |
| `BASE_URL`            | Backend URL for server actions (runtime) |
| `AUTH_SECRET`         | Session encryption secret                |

## 3. Admin Console

```bash
cd admin-console
cp .env.example .env.local
pnpm install
pnpm dev                  # starts at http://localhost:3001
```

## Database Commands

```bash
cd backend
make db-reset      # DROP CASCADE + re-run all migrations (000-004)
make migrate       # run pending migrations only
make db-down       # rollback last migration
```

Migrations run lexicographically. `000_cleanup.up.sql` only runs with `--reset`.

## Verify

- Backend health: `GET http://localhost:8080/health`
- Frontend: `http://localhost:3000`
- Admin console: `http://localhost:3001`
