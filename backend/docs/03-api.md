# API Reference

Base URL: `http://localhost:8080/api/v1`

## Authentication

```
POST /auth/login          # returns access_token + user
POST /auth/refresh        # refresh access token
POST /auth/logout
GET  /auth/me             # current user profile
POST /auth/change-password
```

All authenticated requests require:
```
Authorization: Bearer <access_token>
X-Organization-ID: <org_id>
```

## Standard Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Errors:
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "email already exists"
}
```

## Route Groups

### Public
```
GET  /health
GET  /subscriptions/plans
GET  /subscriptions/plans/:slug
GET  /verify/:documentNumber
```

### Protected (authenticated + org-scoped)
```
# Procurement
GET|POST        /requisitions
GET|PUT|DELETE  /requisitions/:id
GET|POST        /purchase-orders
GET|POST        /payment-vouchers
GET|POST        /grn
GET|POST        /budgets

# Workflows
GET  /workflows
GET  /workflow-tasks                    # approval inbox
POST /workflow-tasks/:id/claim
POST /workflow-tasks/:id/approve
POST /workflow-tasks/:id/reject

# Organization
GET|PUT  /organization/settings
GET|POST /organization/members
DELETE   /organization/members/:userId
GET|POST /organization/departments
GET|POST /organization/branches
GET      /organization/roles
GET      /organization/usage

# Invitations
GET  /invitations/pending
POST /invitations/:token/accept
POST /invitations/:token/decline

# Search
GET  /search?q=&type=&page=&limit=
```

### Admin (role = admin | super_admin)
```
# User management
GET|POST        /admin/users
GET|PUT|DELETE  /admin/users/:id
GET             /organization/users/lookup?email=

# Invitations
POST   /organization/invitations
GET    /organization/invitations
DELETE /organization/invitations/:id
POST   /organization/invitations/:id/resend

# Subscription
GET  /admin/subscription/tiers
PUT  /admin/subscription/tiers/:id
GET  /admin/subscription/trials
POST /admin/organizations/:id/trial/extend

# Analytics
GET  /admin/analytics/overview
GET  /admin/analytics/documents
GET  /admin/analytics/users
```

## Pagination

```
?page=1&limit=20
```

Response includes:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```
