# Features

## PDF Generation

PDFs are generated server-side using `@react-pdf/renderer` and served as blob downloads. Single source of truth: `components/pdf/` — same component renders the preview and the downloadable file.

All PDFs include:
- Organization branding (logo, name, colors from org profile)
- Approval chain section (all stages + approvers + timestamps)
- QR code linking to public verification page

## Approval Workflows

The workflow approval modal (`components/workflows/approval-action-modal.tsx`) handles:
- **Approve** — advances to next stage or completes workflow
- **Reject** — two sub-types via radio:
  - `return_for_revision` — pick a target stage, workflow resets there
  - `reject` — terminates workflow
- **Digital signature** — drawn on canvas, sent as base64 with the action

Approval tasks flow:
1. Task appears in `/tasks` (approval inbox)
2. User claims it (30-min lock)
3. User submits action via modal
4. Workflow advances / terminates

## Dashboard

Role-based dashboard variants (`lib/dashboard-role.ts`):
- `admin` — metrics cards + full analytics
- `approver` — pending tasks widget + recent activity
- `procurement` — requisitions overview
- `requester` — own documents + quick actions

`getDashboardVariant(role, permissions)` → variant string used by `dashboard-client.tsx`.

## ImageKit (File Uploads)

Org logos and profile pictures uploaded via ImageKit. Uses `NEXT_PUBLIC_IMAGEKIT_*` env vars. The `useImageUpload` hook handles upload + progress + URL return.

## Session Timeout

`SessionTimeoutContainer` (`components/base/`) tracks idle time. When session nears expiry, shows a warning dialog with option to extend. On expiry, calls logout and redirects to login.

## First Login Password Change

`components/base/first-login.tsx` — non-dismissable dialog shown when `session.change_password === true` (set by backend when admin creates a user). Cleared after successful password change via `clearChangePasswordFlag()`.
