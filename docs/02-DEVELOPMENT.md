# Development

## Project Structure

```
tether-erp/
├── backend/           # Go (Fiber + GORM + PostgreSQL)
├── frontend/          # Next.js App Router — user app
├── admin-console/     # Next.js App Router — super-admin portal
└── docs/              # Project-wide docs
```

## Dev Commands

### Backend

```bash
make dev        # hot reload (uses air)
make test       # go test ./...
make fmt        # gofmt
make lint       # golangci-lint
```

### Frontend / Admin Console

```bash
pnpm dev        # dev server
pnpm build      # production build
pnpm lint       # ESLint
pnpm type-check # tsc --noEmit
```

## Adding a Backend Endpoint

1. Define route in `backend/routes/routes.go`
2. Create handler in `backend/handlers/`
3. Add business logic in `backend/services/`
4. Update types in `backend/types/` if needed
5. Write migration if schema changes: `backend/database/migrations/`

## Adding a Frontend Page

1. Create `page.tsx` under `frontend/src/app/(private)/`
2. Add server actions in `frontend/src/app/_actions/`
3. Create components in `frontend/src/components/`
4. Add to nav in `frontend/src/components/layout/sidebar/nav-main.tsx`

## Code Conventions

**Go:** standard `gofmt`, errors returned not panicked, GORM for ORM queries, raw pgx for subscription/high-performance reads.

**TypeScript:** strict mode, PascalCase components, kebab-case files, server actions marked `"use server"`, React Query for all server state.

## Git

```
main       — production
feature/*  — new features
fix/*      — bug fixes
```

Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
