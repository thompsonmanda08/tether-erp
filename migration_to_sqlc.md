# Plan: GORM → SQLC Full Migration

## Context

The backend currently runs a hybrid ORM architecture: GORM handles all business-document operations (Requisition, PurchaseOrder, PaymentVoucher, GRN, Budget, Workflow, Organization, etc.) while SQLC covers authentication and session management. Both share the same PostgreSQL database but maintain separate connection pools (`config.DB *gorm.DB` + `config.PgxDB *pgxpool.Pool`).

The goal is to eliminate GORM entirely, making SQLC with pgx/v5 the single data-access layer. This eliminates the ORM abstraction overhead, makes every query explicitly visible in `.sql` files, and enables better static analysis and query optimization.

**Scope:**

- 30+ GORM model structs across 11 model files
- ~280 GORM operations (169 Where, 66 Create, 45 Exec) in 11 repo files + 16 service files
- 14 transaction sites (`tx := s.db.Begin()`) across services and handlers
- 25+ JSONB fields using `datatypes.JSONType[T]` / `datatypes.JSON`
- 9 soft-deleted tables (`deleted_at` column)
- 8 existing SQLC query files (~140 methods already generated)

---

## Architecture Decisions

### 1. JSONB Handling: `[]byte` + typed conversion package

SQLC already generates `[]byte` for all JSONB columns in `backend/database/sqlc/models.go`. Create a `backend/database/convert/` package with:

- `jsonb.go` — generic `UnmarshalJSONB[T](b []byte) (T, error)` and `MarshalJSONB[T](v T) ([]byte, error)`
- `pgtype_helpers.go` — `TimestampToPtr(pgtype.Timestamp) *time.Time`, `NumericToFloat64(pgtype.Numeric) float64`
- One converter file per major model (`requisition.go`, `workflow.go`, etc.) with `SQLCXxxToModel` and `ModelXxxToSQLCParams` functions

During transition, converters still produce `models.Xxx` structs (GORM-tagged) so repository interfaces stay unchanged. In Phase 8, plain structs replace GORM-tagged ones.

**Key rule:** Never call `ts.Time` on a `pgtype.Timestamp` without checking `.Valid` first — returns `time.Time{}` (year 1) silently for NULL values.

### 2. Soft Deletes: Explicit `AND deleted_at IS NULL` everywhere

Affected tables: `users`, `workflows`, `vendors`, `documents`, `requisitions`, `budgets`, `purchase_orders`, `payment_vouchers`, `goods_received_notes`.

- Every SELECT in `.sql` files on these tables must include `AND deleted_at IS NULL`
- Every DELETE operation must be written as an UPDATE: `SET deleted_at = NOW()` (SQLC query name prefix: `SoftDelete*`)
- Add comment block at top of each affected `.sql` file: `-- soft-delete: true`

### 3. Association Loading: JOINs for single rows, batch-load for lists

- **Single-row GET**: Use LEFT JOIN to pull name fields (vendor_name, requester_name). SQLC generates a `GetXxxWithJoinsRow` type; converter fills the `gorm:"-"` virtual fields.
- **List queries**: Collect distinct FK IDs from results, run one `WHERE id = ANY($1)` query per association, build a Go lookup map, populate each row in a loop. No N+1.
- **Post-create Preload**: Insert RETURNING \*, then run association batch-load immediately after.

### 4. Transactions: `txn.WithTx` helper

Create `backend/database/txn/txn.go`:

```go
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(q *db.Queries) error) error {
    tx, err := pool.Begin(ctx)
    if err != nil { return fmt.Errorf("begin tx: %w", err) }
    defer tx.Rollback(ctx) // no-op after Commit
    if err := fn(db.New(tx)); err != nil { return err }
    return tx.Commit(ctx)
}
```

Replace all `tx := s.db.Begin()` / `defer ... Rollback()` / `tx.Commit()` patterns with:

```go
return txn.WithTx(ctx, s.pool, func(q *db.Queries) error {
    // all operations use q
})
```

Services that accept a transaction from a caller get a `*db.Queries` parameter instead of `*gorm.DB`.

### 5. Dynamic Filters: `querybuilder` package

SQLC cannot generate dynamic WHERE clauses. For `List(filters map[string]interface{})` methods:

Create `backend/database/querybuilder/` with one file per document type. Uses positional parameters (`$1`, `$2`, …) — values are never interpolated. Column names come from a compile-time whitelist map, never from user input.

### 6. `sqlc.yaml` change

Set `query_parameter_limit: 0` (currently `5`) — required to generate insert methods for wide tables (Requisition has ~25 columns).

---

## Phased Migration

### Phase 0 — Infrastructure (no behavioral change)

Create support packages before any GORM code is touched.

**New files:**

- `backend/database/convert/jsonb.go`
- `backend/database/convert/pgtype_helpers.go`
- `backend/database/convert/{user,workflow,requisition,budget,purchase_order,payment_voucher,grn,organization,vendor}.go`
- `backend/database/txn/txn.go`
- `backend/database/querybuilder/{requisitions,budgets,purchase_orders,payment_vouchers,grns}.go`

**Modify:**

- `sqlc.yaml` — set `query_parameter_limit: 0`

---

### Phase 1 — Auth / User (low risk)

`UserRepository` already holds both `gormDB` and `queries` with a "use GORM for now" comment. Complete the switch.

**New queries in** `backend/database/queries/users_enhanced.sql`:

- `SoftDeleteUser`, `ListUsersWithDeleted`

**Modify:**

- `backend/repository/user_repository.go` — replace all `r.gormDB.*` with `r.queries.*` + converter calls
- `backend/services/auth_service.go` — any direct GORM calls
- `backend/services/user_service.go` — 1 transaction site → `txn.WithTx`
- `backend/handlers/admin_user_handler.go` — 1 transaction site

`SessionRepository`, `PasswordResetRepository`, `LoginAttemptRepository`, `AccountLockoutRepository` are already pure SQLC — no changes.

---

### Phase 2 — Organization + RBAC (medium risk)

**Critical:** `backend/utils/document_scope.go` currently takes `*gorm.DB` and is called from 5+ handler files. Its signature becomes:

```go
func GetDocumentScope(ctx context.Context, q *db.Queries, userID, userRole, orgID string) DocumentScope
```

All 5 callers in handlers must pass `q := db.New(config.PgxDB)`.

**New query files:**

- `backend/database/queries/organizations.sql`
- `backend/database/queries/organization_members.sql`
- `backend/database/queries/organization_departments.sql`
- `backend/database/queries/organization_branches.sql`

**Modify:**

- `backend/utils/document_scope.go`
- `backend/services/organization_service.go`
- `backend/services/department_service.go`
- `backend/services/rbac_service.go`

---

### Phase 3 — Workflow Engine (high risk — 7 tx sites)

Hardest phase. `workflow_execution_service.go` has 7 transaction sites and the most complex GORM operations including optimistic locking and the claim-expiry goroutine.

**New query files:**

- `backend/database/queries/workflow_assignments.sql`
- `backend/database/queries/workflow_tasks.sql`
- `backend/database/queries/stage_approval_records.sql`

**Key query to add:**

```sql
-- name: ExpireStaleTaskClaims :exec
UPDATE workflow_tasks
SET claimed_by = NULL, claimed_at = NULL, claim_expiry = NULL,
    status = 'pending', updated_at = NOW()
WHERE status = 'claimed' AND claim_expiry < NOW();
```

**`canUserActOnTask` helper** currently takes `*gorm.DB` — must be changed to accept `*db.Queries` so it participates in the outer transaction.

**Note:** `int` vs `int32` for `WorkflowTask.Version` — all version comparisons need explicit casts.

**Modify:**

- `backend/repository/workflow_repository.go`
- `backend/services/workflow_execution_service.go` (7 tx sites → `txn.WithTx`)
- `backend/services/workflow_service.go` (4 tx sites)
- `backend/services/workflow_state_machine.go`
- `backend/handlers/approval_handler.go`

---

### Phase 4 — Vendor / Category / Audit / Notification (low risk)

Simple CRUD with filters, no multi-table transactions.

**New query files:**

- `backend/database/queries/vendors.sql`
- `backend/database/queries/categories.sql`
- `backend/database/queries/audit_logs.sql`
- `backend/database/queries/notifications.sql`

**Modify:**

- `backend/services/audit_service.go`
- `backend/services/notification_service.go`

---

### Phase 5 — Core Business Documents (high risk — JSONB density + 3 tx sites)

Heaviest phase. Dynamic filter queries use the `querybuilder` package (not SQLC-generated).

**New query files:**

- `backend/database/queries/requisitions.sql`
- `backend/database/queries/budgets.sql`
- `backend/database/queries/purchase_orders.sql`
- `backend/database/queries/payment_vouchers.sql`
- `backend/database/queries/goods_received_notes.sql`

**Modify:**

- `backend/handlers/requisition.go` (1 tx site)
- `backend/handlers/budget.go` (1 tx site)
- `backend/handlers/purchase_order.go`
- `backend/handlers/payment_voucher.go`
- `backend/handlers/grn.go`
- `backend/services/document_automation_service.go`
- `backend/services/document_linking.go`
- `backend/services/budget_validation.go`
- `backend/services/approval_rules.go`
- `backend/utils/document_scope.go` — `ApplyToQuery` currently returns `*gorm.DB`; becomes a function that appends SQL clauses to the querybuilder string

**JSONB null risk:** Some fields are initialized as `datatypes.JSON{}` (empty object `{}`), not NULL. Verify each JSONB column's nullability in the schema before replacing — passing `nil` to a `NOT NULL` JSONB column panics at the DB level.

---

### Phase 6 — Subscriptions + Admin tables (low risk)

`subscription_service.go` already uses raw pgx — it just needs its `db.Exec()` string-building calls moved to SQLC methods.

**New query files:**

- `backend/database/queries/subscription_plans.sql`
- `backend/database/queries/organization_subscriptions.sql`
- `backend/database/queries/user_activity_logs.sql`
- `backend/database/queries/impersonation_logs.sql`

**Modify:**

- `backend/services/subscription_service.go` (6 raw db.Exec → SQLC)
- `backend/handlers/admin_subscription_handler.go`
- `backend/handlers/admin_analytics.go`

---

### Phase 7 — Generic Document model + hook removal (medium risk)

`backend/models/document.go` has a `BeforeCreate` GORM hook that generates document numbers. This logic must move to a service function **before** any SQLC insert is written for the `documents` table.

**Modify:**

- `backend/models/document.go` — remove `BeforeCreate` hook, add exported `GenerateDocumentNumber(docType string) string`
- `backend/repository/document_repository.go` — heaviest Preload chain; convert to batch-load pattern

---

### Phase 8 — Remove GORM (cleanup)

**Pre-condition:** Zero GORM imports remain:

```bash
grep -r "gorm.io/" backend/ --include="*.go"
```

**Steps:**

1. `go mod edit -droprequire gorm.io/gorm` (+ driver/postgres, datatypes)
2. `go mod tidy`
3. Replace `models.Xxx` GORM-tagged structs with plain Go structs:
   - `datatypes.JSONType[T]` → `T`
   - `datatypes.JSON` → `json.RawMessage`
   - `gorm.DeletedAt` → `*time.Time`
   - Remove all `gorm:"..."` struct tags
4. Update `backend/database/convert/` — converters now map `db.Xxx` (SQLC) → plain `models.Xxx`
5. Remove `config.DB *gorm.DB` from `backend/config/database.go`; keep only `PgxDB *pgxpool.Pool`
6. Convert `backend/bootstrap/` (last GORM holdout for schema seeding) to raw pgx

---

## Critical Files Reference

| File                                             | Phase | Why Critical                                                      |
| ------------------------------------------------ | ----- | ----------------------------------------------------------------- |
| `backend/database/sqlc/models.go`                | 0     | Shows exact `[]byte`/`pgtype.*` types converters translate from   |
| `backend/repository/interfaces.go`               | All   | Must not change in Phases 1-7; every SQLC repo must satisfy these |
| `backend/utils/document_scope.go`                | 2     | Signature change ripples into 5+ handler files simultaneously     |
| `backend/services/workflow_execution_service.go` | 3     | 7 tx sites + optimistic locking + goroutine                       |
| `backend/models/models.go`                       | 0/8   | Source of truth for JSONB field types during transition           |
| `backend/models/document.go`                     | 7     | BeforeCreate hook must move before SQLC insert is written         |
| `sqlc.yaml`                                      | 0     | `query_parameter_limit: 0` required for wide-table inserts        |

## Top Gotchas

1. **`pgtype.Timestamp` zero-value**: Always use `TimestampToPtr()` helper — never `.Time` directly
2. **Soft-delete on every SELECT**: 9 tables need `AND deleted_at IS NULL`; soft-delete = UPDATE not DELETE
3. **`datatypes.JSON{}` ≠ NULL**: Some JSONB fields default to `{}` not NULL; check schema constraints
4. **`canUserActOnTask` takes `*gorm.DB`**: Must accept `*db.Queries` to stay in the outer transaction
5. **`int` vs `int32` for version fields**: Explicit cast needed in all optimistic-locking comparisons
6. **`query_parameter_limit: 5` blocks wide inserts**: Change to `0` in Phase 0
7. **Dynamic filter column names**: Use a compile-time whitelist — never interpolate user-supplied key names

## Verification

After each phase:

- `go build ./...` must pass (zero GORM imports in scope for that phase)
- Run the affected API flows end-to-end (auth, org management, workflow, documents) with real DB
- Verify JSONB round-trip: create a record with nested items, fetch it back, compare field counts
- Verify soft deletes: delete a record, confirm it doesn't appear in list queries
- Verify transactions: introduce an error mid-flow, confirm the whole tx rolls back

Final verification (Phase 8):

```bash
grep -r "gorm.io/" backend/ --include="*.go"  # must return nothing
go build ./...
go test ./... -count=1
```
