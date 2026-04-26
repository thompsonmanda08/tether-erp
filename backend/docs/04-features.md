# Features

## Approval Workflows

Workflows define multi-stage approval chains. Each stage has:

- An assignee (user or role)
- Optional conditions (amount threshold, department, etc.)
- An action type (approve / reject / return-for-revision)

**Claim system:** Tasks are claimed for 30 minutes. Expired claims auto-release via a background goroutine running every 60s (`StartClaimExpiryWorker`).

**Rejection types:**

- `reject` — terminates the workflow, document status → `rejected`
- `return_for_revision` — resets to a target stage, document status → `revision`

Key files: `services/workflow_execution_service.go`, `handlers/workflow_handler.go`

## Document System

All procurement documents (requisitions, POs, PVs, GRNs) share:

- A `status` field driven by workflow state
- A `metadata` JSONB field (`createdBy`, `updatedBy`, etc.)
- `deleted_at` for soft delete
- QR-code-based public verification at `GET /verify/:documentNumber`
- PDF generation with org branding

Visibility is scoped per role — see `utils/document_scope.go`.

## Notifications

In-app notifications created on:

- Workflow task assigned / approved / rejected
- Budget threshold reached

Stored in `notifications` table. Fetched via `GET /notifications` (paginated, unread count).

Email notifications: stubbed (`EMAIL_ENABLED=false`). Set `EMAIL_ENABLED=true` and configure SMTP in `services/email_service.go` to enable.

## Audit Logs

Every state-changing operation writes to `audit_logs`:

```
action, entity_type, entity_id, organization_id, user_id, changes (JSONB), created_at
```

Immutable — no update/delete on this table. Queried via admin analytics endpoints.
