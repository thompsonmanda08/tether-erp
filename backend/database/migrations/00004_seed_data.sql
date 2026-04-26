-- +goose Up
-- ============================================================================
-- TETHER-ERP — CONSOLIDATED SEED DATA
-- Migration: 004_seed_data
-- ============================================================================

-- ============================================================================
-- DEMO ORGANIZATIONS
-- ============================================================================
INSERT INTO organizations (id, name, slug, description, active, created_at, updated_at)
VALUES
    ('org-demo-001',       'Tether-ERP Demo Organization', 'tether-erp-demo',  'Default organization for testing and development',                  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org-enterprise-001', 'Enterprise Corp',              'enterprise-corp',   'Large enterprise organization for testing enterprise features',      true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- USERS  (super admin first — no org dependency)
-- ============================================================================
INSERT INTO users (id, email, name, password, role, active, current_organization_id, is_super_admin, must_change_password, created_at, updated_at)
VALUES
    ('user-super-admin-001', 'superadmin@tether-erp.com',  'Super Admin',         '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', true, NULL,           true,  false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-admin-001',       'admin@tether-erp.com',       'System Administrator','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',       true, 'org-demo-001', true,  false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-requester-001',   'requester@tether-erp.com',   'John Requester',      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'requester',   true, 'org-demo-001', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-approver-001',    'approver@tether-erp.com',    'Jane Approver',       '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'approver',    true, 'org-demo-001', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-finance-001',     'finance@tether-erp.com',     'Bob Finance',         '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'finance',     true, 'org-demo-001', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-manager-001',     'manager@tether-erp.com',     'Alice Manager',       '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'approver',    true, 'org-demo-001', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-viewer-001',      'viewer@tether-erp.com',      'Charlie Viewer',      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'viewer',      true, 'org-demo-001', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORGANIZATION SETTINGS
-- ============================================================================
INSERT INTO organization_settings (id, organization_id, require_digital_signatures, currency, fiscal_year_start, enable_budget_validation, budget_variance_threshold, created_at, updated_at)
VALUES ('settings-001', 'org-demo-001', true, 'USD', 1, true, 5.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORGANIZATION DEPARTMENTS
-- ============================================================================
INSERT INTO organization_departments (id, organization_id, name, code, description, manager_name, is_active, created_at, updated_at)
VALUES
    ('dept-001', 'org-demo-001', 'Information Technology', 'IT',   'IT Department',          'Alice Manager', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dept-002', 'org-demo-001', 'Finance',                'FIN',  'Finance Department',     'Bob Finance',   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dept-003', 'org-demo-001', 'Operations',             'OPS',  'Operations Department',  'Jane Approver', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dept-004', 'org-demo-001', 'Human Resources',        'HR',   'HR Department',          'Alice Manager', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dept-005', 'org-demo-001', 'Procurement',            'PROC', 'Procurement Department', 'Jane Approver', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================
INSERT INTO organization_members (id, organization_id, user_id, role, department, department_id, active, joined_at, created_at, updated_at)
VALUES
    ('member-001', 'org-demo-001', 'user-admin-001',     'admin',     'IT',         'dept-001', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('member-002', 'org-demo-001', 'user-requester-001', 'requester', 'Operations', 'dept-003', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('member-003', 'org-demo-001', 'user-approver-001',  'approver',  'Finance',    'dept-002', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('member-004', 'org-demo-001', 'user-finance-001',   'finance',   'Finance',    'dept-002', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('member-005', 'org-demo-001', 'user-manager-001',   'approver',  'Operations', 'dept-003', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('member-006', 'org-demo-001', 'user-viewer-001',    'viewer',    'IT',         'dept-001', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- GLOBAL SYSTEM ROLES
-- ============================================================================
INSERT INTO organization_roles (name, description, is_system_role, permissions, active)
VALUES
(
    'super_admin', 'Full platform access with all permissions', true,
    '["requisition:view","requisition:create","requisition:edit","requisition:delete","requisition:approve","requisition:reject","budget:view","budget:create","budget:edit","budget:delete","budget:approve","budget:reject","purchase_order:view","purchase_order:create","purchase_order:edit","purchase_order:delete","purchase_order:approve","purchase_order:reject","payment_voucher:view","payment_voucher:create","payment_voucher:edit","payment_voucher:delete","payment_voucher:approve","payment_voucher:reject","grn:view","grn:create","grn:edit","grn:delete","vendor:view","vendor:create","vendor:edit","vendor:delete","category:view","category:create","category:edit","category:delete","organization:view","organization:edit","organization:manage_users","organization:manage_workflows","analytics:view","audit_log:view"]'::jsonb,
    true
),
(
    'admin', 'Full administrative access', true,
    '["requisition:view","requisition:create","requisition:edit","requisition:delete","requisition:approve","requisition:reject","budget:view","budget:create","budget:edit","budget:delete","budget:approve","budget:reject","purchase_order:view","purchase_order:create","purchase_order:edit","purchase_order:delete","purchase_order:approve","purchase_order:reject","payment_voucher:view","payment_voucher:create","payment_voucher:edit","payment_voucher:delete","payment_voucher:approve","payment_voucher:reject","grn:view","grn:create","grn:edit","grn:delete","vendor:view","vendor:create","vendor:edit","vendor:delete","category:view","category:create","category:edit","category:delete","organization:view","organization:edit","organization:manage_users","organization:manage_workflows","analytics:view","audit_log:view"]'::jsonb,
    true
),
(
    'approver', 'Can approve documents', true,
    '["requisition:view","requisition:approve","requisition:reject","budget:view","budget:approve","budget:reject","purchase_order:view","purchase_order:approve","purchase_order:reject","payment_voucher:view","payment_voucher:approve","payment_voucher:reject","grn:view","vendor:view","category:view"]'::jsonb,
    true
),
(
    'requester', 'Can create and manage own requests', true,
    '["requisition:view","requisition:create","requisition:edit","budget:view","budget:create","budget:edit","vendor:view","category:view"]'::jsonb,
    true
),
(
    'finance', 'Finance team — manage and approve budgets, purchase orders, and payment vouchers', true,
    '["requisition:view","budget:view","budget:create","budget:edit","budget:approve","budget:reject","purchase_order:view","purchase_order:create","purchase_order:edit","purchase_order:approve","purchase_order:reject","payment_voucher:view","payment_voucher:create","payment_voucher:edit","payment_voucher:approve","payment_voucher:reject","vendor:view","category:view","analytics:view","audit_log:view"]'::jsonb,
    true
),
(
    'viewer', 'Read-only access', true,
    '["requisition:view","budget:view","purchase_order:view","payment_voucher:view","grn:view","vendor:view","category:view"]'::jsonb,
    true
)
ON CONFLICT (name) WHERE organization_id IS NULL AND is_system_role = true
DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    active      = EXCLUDED.active,
    updated_at  = CURRENT_TIMESTAMP;

-- ============================================================================
-- CATEGORIES
-- ============================================================================
INSERT INTO categories (id, organization_id, name, description, active, created_at, updated_at)
VALUES
    ('cat-001', 'org-demo-001', 'Computer Hardware',       'Desktop computers, laptops, servers, and related hardware',     true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-002', 'org-demo-001', 'Software Licenses',       'Software licenses, subscriptions, and digital tools',           true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-003', 'org-demo-001', 'Office Supplies',         'General office supplies, stationery, and consumables',          true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-004', 'org-demo-001', 'Training & Development',  'Employee training, courses, and professional development',      true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-005', 'org-demo-001', 'Professional Services',   'Consulting, legal, and other professional services',            true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cat-006', 'org-demo-001', 'Facilities & Maintenance','Building maintenance, utilities, and facility services',        true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BUDGET CODES
-- ============================================================================
INSERT INTO category_budget_codes (id, category_id, budget_code, active, created_at, updated_at)
VALUES
    ('budget-001', 'cat-001', 'IT-EQUIP',   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-002', 'cat-002', 'IT-SOFT',    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-003', 'cat-003', 'OFFICE-SUP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-004', 'cat-004', 'HR-TRAIN',   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-005', 'cat-005', 'PROF-SERV',  true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-006', 'cat-006', 'FACILITIES', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VENDORS
-- ============================================================================
INSERT INTO vendors (id, organization_id, vendor_code, name, email, phone, country, city, active, created_at, updated_at)
VALUES
    ('vendor-001', 'org-demo-001', 'VEND-001', 'Office Supplies Inc.',    'contact@officesupplies.com', '+1-555-0101', 'United States', 'New York',      true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vendor-002', 'org-demo-001', 'VEND-002', 'Tech Solutions Ltd.',     'sales@techsolutions.com',    '+1-555-0102', 'United States', 'San Francisco', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vendor-003', 'org-demo-001', 'VEND-003', 'Facility Services Corp.', 'info@facilityservices.com',  '+1-555-0103', 'United States', 'Chicago',       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vendor-004', 'org-demo-001', 'VEND-004', 'Training Solutions',      'training@solutions.com',     '+1-555-0104', 'United States', 'Austin',        true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vendor-005', 'org-demo-001', 'VEND-005', 'Professional Consultants','contact@proconsult.com',     '+1-555-0105', 'United States', 'Boston',        true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vendor-006', 'org-demo-001', 'VEND-006', 'Hardware Direct',         'orders@hardwaredirect.com',  '+1-555-0106', 'United States', 'Seattle',       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- WORKFLOWS
-- ============================================================================
INSERT INTO workflows (id, organization_id, name, document_type, entity_type, description, stages, is_default, is_active, created_by, created_at, updated_at)
VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'org-demo-001', 'Standard Requisition Approval',    'requisition',    'requisition',    'Standard approval workflow for requisitions',    '[{"stageNumber":1,"stageName":"Manager Approval","requiredRole":"approver","timeoutHours":24},{"stageNumber":2,"stageName":"Finance Approval","requiredRole":"finance","timeoutHours":48}]'::jsonb, true, true, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440002', 'org-demo-001', 'Standard Purchase Order Approval', 'purchase_order', 'purchase_order', 'Standard approval workflow for purchase orders', '[{"stageNumber":1,"stageName":"Manager Approval","requiredRole":"approver","timeoutHours":24},{"stageNumber":2,"stageName":"Finance Approval","requiredRole":"finance","timeoutHours":48}]'::jsonb, true, true, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440003', 'org-demo-001', 'Budget Approval Workflow',         'budget',         'budget',         'Standard approval workflow for budgets',          '[{"stageNumber":1,"stageName":"Manager Approval","requiredRole":"approver","timeoutHours":24},{"stageNumber":2,"stageName":"Finance Approval","requiredRole":"finance","timeoutHours":48}]'::jsonb, true, true, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440004', 'org-demo-001', 'Payment Voucher Approval',         'payment_voucher','payment_voucher','Standard approval workflow for payment vouchers', '[{"stageNumber":1,"stageName":"Manager Approval","requiredRole":"approver","timeoutHours":24},{"stageNumber":2,"stageName":"Finance Approval","requiredRole":"finance","timeoutHours":48}]'::jsonb, true, true, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- WORKFLOW DEFAULTS
-- ============================================================================
INSERT INTO workflow_defaults (id, organization_id, entity_type, default_workflow_id, default_workflow_version, set_by, set_at)
VALUES
    ('default-001', 'org-demo-001', 'requisition',    '550e8400-e29b-41d4-a716-446655440001', 1, 'user-admin-001', CURRENT_TIMESTAMP),
    ('default-002', 'org-demo-001', 'purchase_order', '550e8400-e29b-41d4-a716-446655440002', 1, 'user-admin-001', CURRENT_TIMESTAMP),
    ('default-003', 'org-demo-001', 'budget',         '550e8400-e29b-41d4-a716-446655440003', 1, 'user-admin-001', CURRENT_TIMESTAMP),
    ('default-004', 'org-demo-001', 'payment_voucher','550e8400-e29b-41d4-a716-446655440004', 1, 'user-admin-001', CURRENT_TIMESTAMP)
ON CONFLICT (organization_id, entity_type) DO UPDATE SET
    default_workflow_id      = EXCLUDED.default_workflow_id,
    default_workflow_version = EXCLUDED.default_workflow_version,
    set_by = EXCLUDED.set_by,
    set_at = EXCLUDED.set_at;

-- ============================================================================
-- SAMPLE BUDGETS
-- ============================================================================
INSERT INTO budgets (id, organization_id, owner_id, budget_code, name, description, total_budget, allocated_amount, remaining_amount, currency, fiscal_year, status, created_by, created_at, updated_at)
VALUES
    ('budget-it-001',  'org-demo-001', 'user-admin-001', 'IT-EQUIP',  'IT Equipment Budget 2026',          'Annual budget for IT equipment purchases',              50000.00, 0.00, 50000.00, 'USD', '2026', 'active', 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-it-002',  'org-demo-001', 'user-admin-001', 'IT-SOFT',   'IT Software Budget 2026',            'Annual budget for software licenses and subscriptions', 25000.00, 0.00, 25000.00, 'USD', '2026', 'active', 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-ops-001', 'org-demo-001', 'user-admin-001', 'OFFICE-SUP','Operations Supplies Budget 2026',   'Annual budget for operational supplies',                15000.00, 0.00, 15000.00, 'USD', '2026', 'active', 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('budget-hr-001',  'org-demo-001', 'user-admin-001', 'HR-TRAIN',  'HR Training Budget 2026',            'Annual budget for employee training and development',   20000.00, 0.00, 20000.00, 'USD', '2026', 'active', 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE REQUISITIONS
-- ============================================================================
INSERT INTO requisitions (id, organization_id, document_number, requester_id, title, description, department, total_amount, currency, status, priority, category_id, created_at, updated_at)
VALUES
    ('req-001', 'org-demo-001', 'REQ-260111-001', 'user-requester-001', 'New Laptop for Development Team',  'Request for high-performance laptop for software development', 'IT',         2500.00, 'USD', 'draft',     'medium', 'cat-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('req-002', 'org-demo-001', 'REQ-260111-002', 'user-requester-001', 'Office Supplies Replenishment',    'Monthly office supplies replenishment',                       'Operations',  500.00, 'USD', 'draft',     'low',    'cat-003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('req-003', 'org-demo-001', 'REQ-260111-003', 'user-requester-001', 'Software License Renewal',         'Annual renewal of development software licenses',             'IT',         5000.00, 'USD', 'submitted', 'high',   'cat-002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('req-004', 'org-demo-001', 'REQ-260111-004', 'user-requester-001', 'Training Course Registration',     'Professional development course for team members',            'HR',         1200.00, 'USD', 'submitted', 'medium', 'cat-004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('req-005', 'org-demo-001', 'REQ-260111-005', 'user-requester-001', 'Facility Maintenance Contract',    'Annual facility maintenance and cleaning services',           'Operations', 8000.00, 'USD', 'submitted', 'high',   'cat-006', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE PURCHASE ORDERS
-- ============================================================================
INSERT INTO purchase_orders (id, organization_id, document_number, created_by, vendor_id, title, description, total_amount, currency, status, priority, created_at, updated_at)
VALUES
    ('po-001', 'org-demo-001', 'PO-260111-001', 'user-requester-001', 'vendor-002', 'Laptop Purchase Order',     'Purchase order for development laptops', 2500.00, 'USD', 'draft',     'medium', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('po-002', 'org-demo-001', 'PO-260111-002', 'user-requester-001', 'vendor-002', 'Software License Purchase', 'Purchase order for software licenses',   5000.00, 'USD', 'submitted', 'high',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- WORKFLOW ASSIGNMENTS
-- ============================================================================
INSERT INTO workflow_assignments (id, organization_id, entity_id, entity_type, workflow_id, workflow_version, current_stage, status, stage_history, assigned_at, assigned_by, created_at, updated_at)
VALUES
    ('wa-req-260111-003', 'org-demo-001', 'req-003', 'requisition',    '550e8400-e29b-41d4-a716-446655440001', 1, 1, 'in_progress', '[]'::jsonb, CURRENT_TIMESTAMP, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wa-req-260111-004', 'org-demo-001', 'req-004', 'requisition',    '550e8400-e29b-41d4-a716-446655440001', 1, 1, 'in_progress', '[]'::jsonb, CURRENT_TIMESTAMP, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wa-req-260111-005', 'org-demo-001', 'req-005', 'requisition',    '550e8400-e29b-41d4-a716-446655440001', 1, 1, 'in_progress', '[]'::jsonb, CURRENT_TIMESTAMP, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wa-po-260111-002',  'org-demo-001', 'po-002',  'purchase_order', '550e8400-e29b-41d4-a716-446655440002', 1, 1, 'in_progress', '[]'::jsonb, CURRENT_TIMESTAMP, 'user-admin-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- WORKFLOW TASKS
-- ============================================================================
INSERT INTO workflow_tasks (id, organization_id, workflow_assignment_id, entity_id, entity_type, stage_number, stage_name, assignment_type, assigned_role, status, priority, due_date, version, created_at, updated_at)
VALUES
    ('wt-req-260111-003-stage1', 'org-demo-001', 'wa-req-260111-003', 'req-003', 'requisition',    1, 'Manager Approval', 'role', 'approver', 'pending', 'high',   CURRENT_TIMESTAMP + INTERVAL '3 days', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wt-req-260111-004-stage1', 'org-demo-001', 'wa-req-260111-004', 'req-004', 'requisition',    1, 'Manager Approval', 'role', 'approver', 'pending', 'medium', CURRENT_TIMESTAMP + INTERVAL '2 days', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wt-req-260111-005-stage1', 'org-demo-001', 'wa-req-260111-005', 'req-005', 'requisition',    1, 'Manager Approval', 'role', 'approver', 'pending', 'high',   CURRENT_TIMESTAMP + INTERVAL '1 day',  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wt-po-260111-002-stage1',  'org-demo-001', 'wa-po-260111-002',  'po-002',  'purchase_order', 1, 'Manager Approval', 'role', 'approver', 'pending', 'high',   CURRENT_TIMESTAMP + INTERVAL '2 days', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- +goose Down
-- ============================================================================
-- ROLLBACK: 004_seed_data
-- Delete in FK-safe order (most-dependent first)
-- ============================================================================

DELETE FROM workflow_tasks        WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM workflow_assignments  WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM stage_approval_records WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM task_assignment_history WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM goods_received_notes  WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM payment_vouchers      WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM purchase_orders       WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM budgets               WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM requisitions          WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM vendors               WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM categories            WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM workflow_defaults     WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM workflows             WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM user_organization_roles WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM organization_members  WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM organization_departments WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM organization_settings WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM subscription_audit_logs WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM organization_subscriptions WHERE organization_id IN ('org-demo-001','org-enterprise-001');
DELETE FROM organization_roles    WHERE organization_id IS NULL AND is_system_role = true;
DELETE FROM organizations         WHERE id IN ('org-demo-001','org-enterprise-001');
DELETE FROM users                 WHERE id IN (
    'user-super-admin-001','user-admin-001','user-requester-001',
    'user-approver-001','user-finance-001','user-manager-001','user-viewer-001'
);
