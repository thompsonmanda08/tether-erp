-- +goose Up
-- ============================================================================
-- REBRAND DEMO ORGANIZATION → BGS GROUP
-- Idempotent: rewrites org row, user emails, and currency for existing seed data.
-- Safe to re-run.
-- ============================================================================

-- Org rename
UPDATE organizations
SET name        = 'BGS Group',
    slug        = 'bgs-group',
    description = 'BGS Group — primary demo organization for Tether-ERP',
    updated_at  = CURRENT_TIMESTAMP
WHERE id = 'org-demo-001';

-- User email domain swap (only on seeded users — leaves real registrations alone)
UPDATE users
SET email      = REPLACE(email, '@tether-erp.com', '@bgsgroup.co.zm'),
    updated_at = CURRENT_TIMESTAMP
WHERE email LIKE '%@tether-erp.com'
  AND id IN (
    'user-super-admin-001',
    'user-admin-001',
    'user-requester-001',
    'user-approver-001',
    'user-finance-001',
    'user-manager-001',
    'user-viewer-001'
  );

-- Give super-admin tenant context (single-app deployment — no separate console)
UPDATE users
SET current_organization_id = 'org-demo-001',
    updated_at              = CURRENT_TIMESTAMP
WHERE id = 'user-super-admin-001'
  AND current_organization_id IS NULL;

-- Add super-admin as BGS member (if not already)
INSERT INTO organization_members (id, organization_id, user_id, role, department, department_id, active, joined_at, created_at, updated_at)
VALUES ('member-000', 'org-demo-001', 'user-super-admin-001', 'admin', 'IT', 'dept-001', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Org currency: USD → ZMW
UPDATE organization_settings
SET currency   = 'ZMW',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org-demo-001'
  AND currency = 'USD';

-- Demo budgets/requisitions/POs currency
UPDATE budgets         SET currency = 'ZMW' WHERE organization_id = 'org-demo-001' AND currency = 'USD';
UPDATE requisitions    SET currency = 'ZMW' WHERE organization_id = 'org-demo-001' AND currency = 'USD';
UPDATE purchase_orders SET currency = 'ZMW' WHERE organization_id = 'org-demo-001' AND currency = 'USD';

-- +goose Down
-- Down migration intentionally not provided. Reverting brand is destructive
-- for any data created under the new identity. To roll back, run goose reset
-- and re-seed.
SELECT 1;
