# Architecture

## Stack

- **Framework:** Go Fiber
- **ORM:** GORM (general queries) + raw `pgxpool` (subscription/high-perf reads)
- **Database:** PostgreSQL 14+
- **Auth:** JWT (access token) + session cookies

## Layers

```
HTTP Request
    → Middleware (auth, tenant extraction, rate limit)
    → Handler (parse request, call service, return response)
    → Service (business logic, validation)
    → GORM / pgx (database)
```

Handlers are thin — no business logic. Services own all rules.

## Multi-Tenancy

Every authenticated request goes through `TenantMiddleware` which:

1. Reads `X-Organization-ID` header (or falls back to `current_organization_id` on the user record)
2. Validates the user is a member of that org
3. Injects a `TenantContext{UserID, OrganizationID, UserRole, Permissions}` into the Fiber context

All queries are scoped to `organization_id`. No cross-tenant data leakage is possible without bypassing the middleware.

## RBAC

Roles: `admin`, `approver`, `finance`, `requester` (+ `super_admin` for platform-level).

Permissions are stored in `organization_roles.permissions` (JSONB array) and cached per-request. The `usePermissions` middleware unpacks them into the tenant context for handler-level checks.

## Database Schema (key tables)

| Table                  | Purpose                             |
| ---------------------- | ----------------------------------- |
| `users`                | Platform accounts                   |
| `organizations`        | Tenants                             |
| `organization_members` | User ↔ org membership + role        |
| `organization_roles`   | Role definitions + permission sets  |
| `workflows`            | Approval workflow definitions       |
| `workflow_tasks`       | Active approval tasks per stage     |
| `requisitions`         | Purchase requisitions               |
| `purchase_orders`      | POs linked to approved requisitions |
| `payment_vouchers`     | PVs linked to POs                   |
| `goods_received_notes` | GRNs                                |
| `budgets`              | Budget tracking                     |
| `audit_logs`           | Immutable action trail              |

## Migrations

Files in `backend/database/migrations/` sorted lexicographically:

| File                             | Contents                                      |
| -------------------------------- | --------------------------------------------- |
| `000_cleanup.up.sql`             | DROP SCHEMA CASCADE (reset only)              |
| `001_core_schema.up.sql`         | All core tables + indexes + triggers          |
| `002_subscription_system.up.sql` | Subscription tables + stored functions + seed |
| `003_admin_system.up.sql`        | System settings, feature flags, monitoring    |
| `004_seed_data.up.sql`           | Demo orgs, users, roles, sample data          |

`migrate_all.go` runs them in order. Pass `--reset` to run `000_` first.

## Document Visibility Scoping

`utils/document_scope.go` — `GetDocumentScope()` returns a scope based on role:

- **Privilege roles** (admin, finance, approver): `CanViewAll = true`
- **Requester**: sees only own documents + documents they're involved in via workflow
- Applied uniformly to requisitions, POs, PVs, GRNs, budgets via `scope.ApplyToQuery()`
