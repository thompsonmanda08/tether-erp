# Seeded Credentials

Default password for all demo accounts: **`password`**
Bcrypt hash: `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`

> Do not use these in production.

## Demo Users

| Email                       | Role        | Notes                                   |
| --------------------------- | ----------- | --------------------------------------- |
| `admin@tether-erp.com`      | admin       | Full org access, `is_super_admin=false` |
| `requester@tether-erp.com`  | requester   | Creates requisitions                    |
| `approver@tether-erp.com`   | approver    | Approves requisitions                   |
| `finance@tether-erp.com`    | finance     | POs, PVs, budgets                       |
| `manager@tether-erp.com`    | approver    | Department approver                     |
| `viewer@tether-erp.com`     | viewer      | Read-only                               |
| `superadmin@tether-erp.com` | super_admin | Platform-level, `is_super_admin=true`   |

All users belong to **Tether-ERP Demo Organization** (`org-demo-001`).

## Demo Organizations

| ID                   | Name                         | Tier       | Status |
| -------------------- | ---------------------------- | ---------- | ------ |
| `org-demo-001`       | Tether-ERP Demo Organization | pro        | active |
| `org-enterprise-001` | Enterprise Corp              | enterprise | active |

## Login (cURL)

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tether-erp.com","password":"password"}'
```

## Useful DB Queries

```sql
-- All users + orgs
SELECT u.email, u.role, o.name as org
FROM users u
JOIN organization_members om ON u.id = om.user_id
JOIN organizations o ON om.organization_id = o.id;

-- Subscription tiers
SELECT name, price_monthly, max_team_members, max_documents
FROM subscription_tiers ORDER BY sort_order;
```
