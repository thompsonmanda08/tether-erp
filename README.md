# Tether-ERP

Enterprise Resource Planning system focused on procurement management with approval workflows, vendor management, and inventory control.

**Tech Stack:** Go/Fiber • Next.js 16 • PostgreSQL • React Query • NextUI • Tailwind CSS

---

## Quick Start

### Prerequisites

- Go 1.21+, Node.js 20+, PostgreSQL 15+

### Backend

```bash
cd backend
cp .env.example .env          # Configure DATABASE_URL
go run cmd/migrate/main.go    # Run migrations
go run main.go                # Start server (http://localhost:8081)
```

### Frontend

```bash
cd frontend
cp .env.example .env          # Configure NEXT_PUBLIC_API_URL
npm install && npm run dev    # Start dev server (http://localhost:3000)
```

### Admin Console

```bash
cd admin-console
cp .env.example .env
npm install && npm run dev    # Start dev server (http://localhost:3001)
```

---

## Project Structure

```
tether-erp/
├── backend/              # Go/Fiber API
│   ├── handlers/        # HTTP endpoints
│   ├── services/        # Business logic
│   ├── repository/      # Database layer
│   ├── models/          # Data structures
│   ├── middleware/      # Auth, tenant, logging
│   └── database/migrations/  # SQL migrations
├── frontend/            # Next.js user app (Procurement Portal)
│   └── src/
│       ├── app/         # Pages & server actions
│       ├── components/  # UI components (NextUI)
│       ├── hooks/       # React Query hooks
│       └── types/       # TypeScript types
├── admin-console/       # Next.js admin dashboard
└── .kiro/specs/         # Feature specifications
```

---

## Makefile Commands

```bash
make help                # Show all commands

# Development
make dev-backend         # Run backend (http://localhost:8081)
make dev-web             # Run web (http://localhost:3000)
make dev-admin           # Run admin (http://localhost:3001)

# Build & Test
make build               # Build all apps
make test                # Run all tests
make clean               # Clean artifacts

# Database
make migrate             # Run migrations

# Utilities
make check-env           # Verify environment files
make verify              # Build + test all
```

---

## Development Patterns

### Backend: Add New Endpoint

1. **Model** (`models/feature.go`)

```go
type Feature struct {
    ID             string `json:"id"`
    OrganizationID string `json:"organizationId"`
    Name           string `json:"name"`
}
```

2. **Repository** (`repository/feature_repository.go`)

```go
func (r *Repo) GetByOrg(ctx context.Context, orgID string) ([]models.Feature, error) {
    query := `SELECT * FROM features WHERE organization_id = $1`
    // ... execute and return
}
```

3. **Service** (`services/feature_service.go`)

```go
func (s *Service) GetFeatures(ctx context.Context, orgID string) ([]models.Feature, error) {
    return s.repo.GetByOrg(ctx, orgID)
}
```

4. **Handler** (`handlers/feature.go`)

```go
func (h *Handler) GetFeatures(c *fiber.Ctx) error {
    tenant, _ := middleware.GetTenantContext(c)
    features, _ := h.service.GetFeatures(c.Context(), tenant.OrganizationID)
    return c.JSON(features)
}
```

5. **Route** (`routes/routes.go`)

```go
protected.Get("/features", handlers.Feature.GetFeatures)
```

### Frontend: Add New Feature

1. **Type** (`types/feature.ts`)

```typescript
export interface Feature {
  id: string;
  name: string;
}
```

2. **Server Action** (`app/_actions/features.ts`)

```typescript
"use server";
export async function getFeatures() {
  const res = await authenticatedApiClient({
    method: "GET",
    url: "/api/v1/features",
  });
  return res.data;
}
```

3. **Hook** (`hooks/use-features.ts`)

```typescript
export function useFeatures() {
  return useQuery({ queryKey: ["features"], queryFn: getFeatures });
}
```

4. **Component** (Using NextUI)

```typescript
import { Button, Card, CardBody } from "@heroui/react";

const { data, isLoading } = useFeatures();
```

---

## Database Migrations

### Create Migration

```bash
cd backend/database/migrations
touch 015_feature.up.sql 015_feature.down.sql
```

**Up Migration:**

```sql
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_features_org ON features(organization_id);
```

**Down Migration:**

```sql
DROP TABLE IF EXISTS features CASCADE;
```

### Run Migrations

```bash
make migrate
# Or: cd backend && go run cmd/migrate/main.go
```

---

## Authentication

### Backend: Protect Routes

```go
// Require auth
protected := api.Use(middleware.AuthMiddleware())
protected.Get("/endpoint", handler.Method)

// Get tenant context
tenant, _ := middleware.GetTenantContext(c)
// tenant.OrganizationID, tenant.UserID, tenant.UserRole
```

### Frontend: Protect Pages

```typescript
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const { session } = await verifySession();
  if (!session?.user) redirect("/login");
  return <Content />;
}
```

---

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require
JWT_SECRET=your-secret-key-min-32-chars
APP_PORT=8081
FRONTEND_URL=https://your-frontend.com
```

### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=https://your-backend.com
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_key
IMAGEKIT_PRIVATE_KEY=your_private_key
```

---

## Testing

```bash
make test                # All tests
make test-backend        # Backend only
cd frontend && npm run build  # Type checking
```

---

## Key Features

### Procurement Module

- Purchase order management
- Requisition system with multi-level approvals
- Vendor management and performance tracking
- Inventory control and stock management
- Spend analysis and reporting
- Budget tracking and controls

### System Features

- Admin reports & analytics
- Workflow selection system
- Configuration checklist
- Organization logo upload (ImageKit)
- Session management & auto-refresh
- PDF generation
- Subscription tier system (Starter/Pro/Custom)
- Document management (Requisitions, POs, PVs, GRNs, Budgets)

---

## API Endpoints

### Auth

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
GET    /api/v1/auth/me
```

### Procurement

```
GET    /api/v1/purchase-orders
POST   /api/v1/purchase-orders
GET    /api/v1/purchase-orders/:id
PUT    /api/v1/purchase-orders/:id
DELETE /api/v1/purchase-orders/:id

GET    /api/v1/requisitions
POST   /api/v1/requisitions
GET    /api/v1/requisitions/:id
PUT    /api/v1/requisitions/:id
DELETE /api/v1/requisitions/:id
POST   /api/v1/requisitions/:id/submit

GET    /api/v1/vendors
POST   /api/v1/vendors
GET    /api/v1/vendors/:id
PUT    /api/v1/vendors/:id
```

### Admin

```
GET    /api/v1/admin/reports/system-stats
GET    /api/v1/admin/reports/approval-metrics
GET    /api/v1/admin/subscriptions/tiers
POST   /api/v1/admin/organizations/:id/change-tier
```

---

## Troubleshooting

### Backend won't start

- Check `DATABASE_URL` format
- Verify database is accessible
- Run migrations: `make migrate`

### Frontend build fails

- Check TypeScript errors: `npm run build`
- Clear cache: `rm -rf .next node_modules && npm install`

### API calls fail

- Check `NEXT_PUBLIC_API_URL`
- Verify CORS settings (`FRONTEND_URL` in backend)
- Check authentication token

---

## Documentation

- **[TODO.md](TODO.md)** - Task tracking & future enhancements
- **[SEEDED_DATA_CREDENTIALS.md](SEEDED_DATA_CREDENTIALS.md)** - Test credentials
- **[SUBSCRIPTION_TIER_SYSTEM.md](SUBSCRIPTION_TIER_SYSTEM.md)** - Subscription system docs
- **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** - Tether-ERP migration history
- **[backend/database/README.md](backend/database/README.md)** - Database management
- **[.kiro/specs/](.kiro/specs/)** - Feature specifications

---

## Test Credentials

**Email:** `admin@tether-erp.com`  
**Password:** `password`

See [SEEDED_DATA_CREDENTIALS.md](SEEDED_DATA_CREDENTIALS.md) for all test users.

---

## Useful Commands

```bash
# Backend
go run main.go                    # Dev server
go test ./...                     # Tests
go run cmd/migrate/main.go        # Migrations

# Frontend
npm run dev                       # Dev server
npm run build                     # Build + type check

# Database
psql $DATABASE_URL                # Connect
psql $DATABASE_URL -c "SELECT 1"  # Test connection
```

---

## Security Checklist

- [ ] All queries filter by `organization_id`
- [ ] Use parameterized SQL queries ($1, $2)
- [ ] Verify user role for admin endpoints
- [ ] Use `authenticatedApiClient` for API calls
- [ ] Never expose `JWT_SECRET` or private keys
- [ ] Validate all user inputs

---

## Performance Tips

- Add database indexes for foreign keys
- Use React Query caching (5-min stale time)
- Optimize SQL with CTEs and FILTER clauses
- Use Next.js Image component
- Lazy load heavy components
- Use NextUI's built-in optimizations

---

**Last Updated:** April 16, 2026  
**License:** Proprietary
