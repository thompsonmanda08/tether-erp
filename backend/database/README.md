# Database Management

PostgreSQL database for Tether-ERP with 42 tables, 80+ indexes, and 14 sequential migrations.

---

## Quick Start

```bash
# Run all migrations
make migrate

# Create performance indexes (optional)
make indexes

# Check status
cd backend && go run cmd/migrate/main.go
```

---

## Directory Structure

```
backend/database/
├── migrations/          # Sequential SQL migrations (001-014)
├── scripts/            # Utility scripts
├── migrate_all.go      # Migration runner
└── README.md           # This file
```

---

## Migrations

### Active Migrations (14 total)

| #   | Migration                        | Description                               |
| --- | -------------------------------- | ----------------------------------------- |
| 001 | init_system                      | Core tables (users, organizations, roles) |
| 002 | seed_data                        | Demo users & data                         |
| 003 | add_missing_indexes              | Performance indexes                       |
| 004 | fix_user_roles                   | Role fixes                                |
| 005 | add_validator_indexes            | Validator indexes                         |
| 006 | add_requisition_action_history   | Audit trail                               |
| 007 | subscription_system_clean        | Subscriptions                             |
| 008 | setup_demo_trial                 | Demo setup                                |
| 009 | performance_optimization_minimal | Essential indexes                         |
| 010 | admin_settings_feature_flags     | Admin console                             |
| 011 | subscription_management_system   | Billing system                            |
| 012 | complete_database_integration    | Monitoring                                |
| 013 | add_reports_indexes              | Reporting indexes                         |
| 014 | subscription_tier_system         | 3-tier system (Starter/Pro/Custom)        |

### Running Migrations

```bash
# Method 1: Makefile (recommended)
make migrate

# Method 2: Go command
cd backend && go run cmd/migrate/main.go

# Method 3: Direct SQL (debugging only)
psql $DATABASE_URL -f database/migrations/001_init_system.up.sql
```

---

## Database Schema

### Tables (42 total)

**Authentication & Users (6)**

- users, sessions, password_resets, email_verifications, login_attempts, account_lockouts

**Organizations (5)**

- organizations, organization_members, organization_settings, organization_departments, organization_limit_overrides

**RBAC (4)**

- roles, permissions, role_permissions, user_roles

**Documents (7)**

- requisitions, requisition_action_history, purchase_orders, budgets, documents, vendors, categories

**Workflows (4)**

- workflows, workflow_assignments, workflow_tasks, workflow_defaults

**Subscriptions (5)**

- subscription_tiers, subscription_features, subscription_events, payments, invoices

**Admin Console (5)**

- system_settings, environment_variables, feature_flags, feature_flag_evaluations, admin_audit_logs

**Monitoring (5)**

- system_metrics, system_alerts, system_logs, system_services, api_request_logs

**Other (1)**

- notifications

---

## Creating New Migrations

### Step 1: Create File

```bash
cd backend/database/migrations
touch 015_feature_name.up.sql
```

### Step 2: Write Migration

```sql
-- Migration: 015_feature_name
-- Description: Add feature description
-- Date: 2026-02-25

CREATE TABLE IF NOT EXISTS table_name (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_table_org ON table_name(organization_id);
```

### Step 3: Test & Apply

```bash
make migrate
```

---

## PostgreSQL Syntax Guide

**Key Differences from SQLite:**

| SQLite                      | PostgreSQL                          |
| --------------------------- | ----------------------------------- |
| `DATETIME`                  | `TIMESTAMP WITH TIME ZONE`          |
| `REAL`                      | `NUMERIC(10,2)`                     |
| `TEXT` (IDs)                | `VARCHAR(255)`                      |
| `TEXT` (JSON)               | `JSONB`                             |
| `INSERT OR IGNORE`          | `INSERT ... ON CONFLICT DO NOTHING` |
| `datetime('now')`           | `CURRENT_TIMESTAMP`                 |
| `datetime(col, '+30 days')` | `col + INTERVAL '30 days'`          |
| `hex(randomblob(16))`       | `gen_random_uuid()::text`           |

**Safe Column Addition:**

```sql
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
END $;
```

**Safe Data Insert:**

```sql
INSERT INTO roles (id, name)
VALUES ('role-admin', 'Admin')
ON CONFLICT (id) DO NOTHING;
```

---

## Migration 014: Subscription Tier System

**Date:** February 24, 2026

### Changes

**Removed:**

- `storage_limit_gb` (no tracking)
- `max_organizations` (not needed)

**Renamed:**

- `max_users` → `max_team_members`

**Added:**

- `max_workspaces`, `max_documents`, `max_workflows`, `max_custom_roles`

### New 3-Tier System

| Tier    | Price/Month | Users | Workspaces | Documents | Workflows | Custom Roles |
| ------- | ----------- | ----- | ---------- | --------- | --------- | ------------ |
| Starter | $0          | 10    | 1          | 200       | 3         | 0            |
| Pro     | $99         | 50    | 5          | 500       | 20        | 10           |
| Custom  | $499        | ∞     | ∞          | ∞         | ∞         | ∞            |

**Tier Migration:**

- `basic` → `starter`
- `professional` → `pro`
- `enterprise` → `custom`
- `unlimited` → `custom`

**Features:** 31 total features across 7 categories (core, workflow, analytics, security, integration, support, customization)

---

## Monitoring

### Check Migration Status

```sql
SELECT filename, applied_at
FROM schema_migrations
ORDER BY filename;
```

### Verify Database Health

```sql
-- Count tables (should be 42)
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public';

-- Count indexes (should be 80+)
SELECT COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public';

-- Check sample data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM subscription_tiers;
```

---

## Troubleshooting

### Migration Already Applied

```bash
# Check if recorded
psql $DATABASE_URL -c "SELECT * FROM schema_migrations WHERE filename = 'your_migration.up.sql';"

# Manually add if needed
psql $DATABASE_URL -c "INSERT INTO schema_migrations (filename) VALUES ('your_migration.up.sql');"
```

### Fresh Database Setup

```bash
# CAUTION: Destroys all data
cd backend
psql $DATABASE_URL -f database/scripts/000_drop_all_tables.up.sql
make migrate
```

### Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check environment
cd backend && cat .env | grep DATABASE_URL
```

---

## Security

### Multi-Tenant Isolation

All business tables include `organization_id`:

```sql
SELECT * FROM requisitions
WHERE organization_id = $1
AND status = 'pending';
```

### Sensitive Data

- Passwords: bcrypt hashed
- Tokens: stored with expiration
- Audit logs: track all changes
- PII: encrypt at application level

---

## Performance

### Indexes

- Primary keys (automatic)
- Foreign keys (explicit)
- Common query patterns
- Multi-tenant isolation (`organization_id`)

### Concurrent Indexes

```bash
# For production (no blocking)
make indexes
```

### Query Optimization

```sql
EXPLAIN ANALYZE
SELECT * FROM requisitions
WHERE organization_id = 'org-123'
AND status = 'pending';
```

---

## Test Data

**Credentials:**

- Admin: `admin@tether-erp.com` / `password`
- Requester: `requester@tether-erp.com` / `password`
- Approver: `approver@tether-erp.com` / `password`
- Finance: `finance@tether-erp.com` / `password`

See [SEEDED_DATA_CREDENTIALS.md](../../SEEDED_DATA_CREDENTIALS.md) for complete list.

---

## Utility Scripts

Located in `backend/database/scripts/`:

```bash
# Create concurrent indexes
psql $DATABASE_URL -f scripts/create_concurrent_indexes.sql

# Drop all tables (CAUTION)
psql $DATABASE_URL -f scripts/000_drop_all_tables.up.sql

# Update migration tracking
psql $DATABASE_URL -f scripts/update_migration_filenames.sql
```

---

## Best Practices

1. **Always use PostgreSQL syntax** (not SQLite)
2. **Use IF NOT EXISTS** for idempotency
3. **Add indexes** for all foreign keys
4. **Use JSONB** for JSON data
5. **Use VARCHAR(255)** for IDs
6. **Use TIMESTAMP WITH TIME ZONE** for timestamps
7. **Test locally first** before production
8. **Keep migrations small** (one logical change)
9. **Document changes** in migration comments
10. **Check dependencies** before creating tables

---

**Database Status:** ✅ Production Ready  
**PostgreSQL Version:** 14+  
**Total Migrations:** 14  
**Total Tables:** 42  
**Total Indexes:** 80+
