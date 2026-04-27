# Architecture

## Stack

- Next.js App Router (TypeScript)
- Tailwind CSS v4 + ShadCN UI + Radix UI
- React Query (TanStack Query) — server state
- Axios — HTTP client (server actions only)

## App Router Layout

```
app/
├── (private)/
│   ├── layout.tsx              # checks session, shows FirstLogin if must_change_password
│   ├── (main)/
│   │   ├── layout.tsx          # sidebar + header shell
│   │   ├── home/               # dashboard
│   │   ├── requisitions/
│   │   ├── purchase-orders/
│   │   ├── payment-vouchers/
│   │   ├── grn/
│   │   ├── budgets/
│   │   ├── tasks/              # approval inbox
│   │   └── invitations/        # pending org invitations
│   └── admin/                  # admin-only section
│       ├── users/
│       ├── invitations/
│       ├── workflows/
│       ├── reports/
│       └── ...
└── (public)/
    ├── login/
    └── verify/[documentNumber]/
```

## Auth & Session

Auth uses a cookie-based session (`iron-session`). On login, `auth.ts` stores:
```ts
{
  access_token, organization_id, user: { id, email, role, ... },
  change_password: boolean    // forces FirstLogin dialog if true
}
```

`verifySession()` (`lib/auth.ts`) — called in server actions and layouts to check session validity. Expired or missing session redirects to `/login`.

## API Calls (Server Actions)

All API calls go through `app/_actions/api-config.ts`:
- `axios` instance with `baseURL: process.env.BASE_URL || "http://localhost:8080"`
- `authenticatedApiClient()` — injects `Authorization` + `X-Organization-ID` headers automatically
- `successResponse()` / `handleError()` — standardized return format

Never call the backend directly from client components. Always go through server actions.

## State Management

| Concern | Tool |
|---|---|
| Server data (orgs, docs, users) | React Query (`useQuery`, `useMutation`) |
| Auth session | `useSession()` hook (reads from cookie via server action) |
| User permissions | `usePermissions()` hook (derives from session role + permissions array) |
| Form state | React Hook Form |
| UI state | `useState` / `useReducer` locally |

## Permissions & Role Gating

`hooks/use-permissions.ts` exposes `rawPermissions: string[]` derived from the session.

Nav items in `nav-main.tsx` have `requiredRoles` and `requiredPermissions` — filtered at render time via `canShowItem()`.

Roles in this app: `admin`, `approver`, `finance`, `requester`. (`super_admin` etc. are admin-console only.)

## Tailwind v4 Notes

- Use `bg-linear-to-r` not `bg-gradient-to-r`
- Dynamic class interpolation requires full class strings (no string interpolation like `` `bg-${color}-500` ``)
- Sidebar collapsed mode: `group-data-[collapsible=icon]:*` selectors
