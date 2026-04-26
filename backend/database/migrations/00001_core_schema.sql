-- +goose Up
-- ============================================================================
-- TETHER-ERP — CONSOLIDATED CORE SCHEMA
-- Migration: 001_core_schema
-- Replaces: 001–006, 009, 013, 016–025, 027_org_branches, 030, 032
-- Final column sets baked in — no ALTER TABLE required
-- ============================================================================

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id                   VARCHAR(255) PRIMARY KEY,
    email                VARCHAR(255) UNIQUE NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    password             VARCHAR(255) NOT NULL,
    role                 VARCHAR(50)  NOT NULL DEFAULT 'requester',
    active               BOOLEAN      NOT NULL DEFAULT true,
    last_login           TIMESTAMP,
    current_organization_id VARCHAR(255),
    is_super_admin       BOOLEAN      NOT NULL DEFAULT false,
    preferences          JSONB,
    deleted_at           TIMESTAMP,
    -- profile fields (021)
    position             VARCHAR(255),
    man_number           VARCHAR(100),
    nrc_number           VARCHAR(100),
    contact              VARCHAR(50),
    -- security flags (024)
    mfa_enabled          BOOLEAN      NOT NULL DEFAULT FALSE,
    is_ldap_user         BOOLEAN      NOT NULL DEFAULT FALSE,
    -- force-change flag (032)
    must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id                   VARCHAR(255) PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    slug                 VARCHAR(255) UNIQUE NOT NULL,
    description          TEXT,
    logo_url             VARCHAR(500),
    primary_color        VARCHAR(7)   DEFAULT '#0066CC',
    active               BOOLEAN      DEFAULT true,
    tagline              VARCHAR(500),
    created_by           VARCHAR(255),
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_organizations_creator
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================================
-- ORGANIZATION BRANCHES  (030 schema — province_id/town_id/manager_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_branches (
    id              VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(100),
    province_id     VARCHAR(255),
    town_id         VARCHAR(255),
    address         TEXT,
    manager_id      VARCHAR(255),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_org_branches_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ============================================================================
-- ORGANIZATION SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_settings (
    id                          VARCHAR(255) PRIMARY KEY,
    organization_id             VARCHAR(255) UNIQUE NOT NULL,
    require_digital_signatures  BOOLEAN      DEFAULT true,
    default_approval_chain      TEXT,
    currency                    VARCHAR(3)   DEFAULT 'USD',
    fiscal_year_start           INTEGER      DEFAULT 1,
    enable_budget_validation    BOOLEAN      DEFAULT true,
    budget_variance_threshold   DECIMAL(5,2) DEFAULT 5.00,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_org_settings_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ============================================================================
-- ORGANIZATION DEPARTMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_departments (
    id              VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    description     TEXT,
    parent_id       VARCHAR(255),
    manager_name    VARCHAR(255),
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_org_departments_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_org_departments_parent
        FOREIGN KEY (parent_id) REFERENCES organization_departments(id)
);

-- Drop the legacy duplicate column on pre-existing databases
ALTER TABLE organization_departments DROP COLUMN IF EXISTS active;

-- ============================================================================
-- ORGANIZATION MEMBERS  (with branch_id from 027)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id              VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    user_id         VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL,
    department      VARCHAR(100),
    department_id   VARCHAR(255),
    title           VARCHAR(100),
    branch_id       VARCHAR(255),
    active          BOOLEAN      DEFAULT true,
    invited_at      TIMESTAMP WITH TIME ZONE,
    joined_at       TIMESTAMP WITH TIME ZONE,
    invited_by      VARCHAR(255),
    custom_permissions JSONB,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_org_members_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_org_members_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_org_members_invited_by
        FOREIGN KEY (invited_by) REFERENCES users(id),
    CONSTRAINT fk_org_members_department
        FOREIGN KEY (department_id) REFERENCES organization_departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_org_members_branch
        FOREIGN KEY (branch_id) REFERENCES organization_branches(id) ON DELETE SET NULL,
    CONSTRAINT uk_org_user UNIQUE (organization_id, user_id)
);

-- Ensure branch_id exists on pre-existing organization_members tables
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255);
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS fk_org_members_branch;
ALTER TABLE organization_members ADD CONSTRAINT fk_org_members_branch
    FOREIGN KEY (branch_id) REFERENCES organization_branches(id) ON DELETE SET NULL;

-- ============================================================================
-- ORGANIZATION ROLES
-- organization_id is NULLABLE to support global system roles (017).
-- No composite UNIQUE constraint — use partial unique indexes instead (see §Indexes).
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_roles (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255),    -- NULL for global system roles
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system_role  BOOLEAN      DEFAULT false,
    permissions     JSONB        DEFAULT '[]'::jsonb,
    active          BOOLEAN      DEFAULT true,
    created_by      VARCHAR(255),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_org_roles_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_org_roles_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- USER–ORGANIZATION ROLE ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_organization_roles (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    role_id         UUID         NOT NULL,
    assigned_by     VARCHAR(255),
    assigned_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active          BOOLEAN      DEFAULT true,

    CONSTRAINT fk_user_org_roles_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_org_roles_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_org_roles_role_id
        FOREIGN KEY (role_id) REFERENCES organization_roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_org_roles_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_user_org_role UNIQUE (user_id, organization_id, role_id)
);

-- ============================================================================
-- AUTHENTICATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       VARCHAR(255) NOT NULL,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    ip_address    VARCHAR(45),
    user_agent    TEXT,
    expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sessions_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    VARCHAR(255) NOT NULL,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at    TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_resets_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verifications (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    token       VARCHAR(255) UNIQUE NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_verifications_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        VARCHAR(255),
    email          VARCHAR(255) NOT NULL,
    ip_address     VARCHAR(45),
    user_agent     TEXT,
    success        BOOLEAN      NOT NULL DEFAULT false,
    failure_reason VARCHAR(255),
    attempted_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_login_attempts_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS account_lockouts (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    reason     VARCHAR(255) NOT NULL,
    locked_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unlocks_at TIMESTAMP WITH TIME ZONE NOT NULL,
    active     BOOLEAN      DEFAULT true,

    CONSTRAINT fk_account_lockouts_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- WORKFLOW TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    document_type   VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    version         INTEGER      DEFAULT 1,
    stages          JSONB        NOT NULL DEFAULT '[]'::jsonb,
    conditions      JSONB,
    is_active       BOOLEAN      DEFAULT true,
    is_default      BOOLEAN      DEFAULT false,
    created_by      VARCHAR(255),
    deleted_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_workflows_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflows_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_org_workflow_name UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS workflow_assignments (
    id               VARCHAR(255) PRIMARY KEY,
    organization_id  VARCHAR(255) NOT NULL,
    entity_id        VARCHAR(255) NOT NULL,
    entity_type      VARCHAR(100) NOT NULL,
    workflow_id      UUID         NOT NULL,
    workflow_version INTEGER      NOT NULL,
    current_stage    INTEGER      DEFAULT 0,
    status           VARCHAR(50)  DEFAULT 'in_progress',
    stage_history    JSONB,
    assigned_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by      VARCHAR(255) NOT NULL,
    completed_at     TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_workflow_assignments_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_assignments_workflow_id
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_assignments_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
    id                     VARCHAR(255) PRIMARY KEY,
    organization_id        VARCHAR(255) NOT NULL,
    workflow_assignment_id VARCHAR(255) NOT NULL,
    entity_id              VARCHAR(255) NOT NULL,
    entity_type            VARCHAR(100) NOT NULL,
    stage_number           INTEGER      NOT NULL,
    stage_name             VARCHAR(255) NOT NULL,
    assignment_type        VARCHAR(50)  DEFAULT 'role',
    assigned_role          VARCHAR(100),
    assigned_user_id       VARCHAR(255),
    status                 VARCHAR(50)  DEFAULT 'pending',
    priority               VARCHAR(50)  DEFAULT 'medium',
    claimed_at             TIMESTAMP WITH TIME ZONE,
    claimed_by             VARCHAR(255),
    claim_expiry           TIMESTAMP WITH TIME ZONE,
    completed_at           TIMESTAMP WITH TIME ZONE,
    due_date               TIMESTAMP WITH TIME ZONE,
    version                INTEGER      NOT NULL DEFAULT 1,
    updated_by             VARCHAR(255),
    created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_workflow_tasks_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_tasks_assignment_id
        FOREIGN KEY (workflow_assignment_id) REFERENCES workflow_assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_tasks_assigned_user_id
        FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_workflow_tasks_claimed_by
        FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_workflow_tasks_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workflow_defaults (
    id                       VARCHAR(255) PRIMARY KEY,
    organization_id          VARCHAR(255) NOT NULL,
    entity_type              VARCHAR(100) NOT NULL,
    default_workflow_id      UUID         NOT NULL,
    default_workflow_version INTEGER      NOT NULL,
    set_by                   VARCHAR(255) NOT NULL,
    set_at                   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_workflow_defaults_organization_id
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_defaults_workflow_id
        FOREIGN KEY (default_workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_defaults_set_by
        FOREIGN KEY (set_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_workflow_defaults_unique_org_entity UNIQUE (organization_id, entity_type)
);

-- Final 4-value CHECK (020 adds returned_to_draft and return_for_revision)
CREATE TABLE IF NOT EXISTS stage_approval_records (
    id               VARCHAR(255) PRIMARY KEY,
    organization_id  VARCHAR(255) NOT NULL,
    workflow_task_id VARCHAR(255) NOT NULL,
    stage_number     INTEGER      NOT NULL,
    approver_id      VARCHAR(255) NOT NULL,
    approver_name    VARCHAR(255) NOT NULL,
    approver_role    VARCHAR(255) NOT NULL,
    man_number       VARCHAR(100) NOT NULL DEFAULT '',
    position         VARCHAR(255) NOT NULL DEFAULT '',
    action           VARCHAR(50)  NOT NULL
        CHECK (action IN ('approved','rejected','returned_to_draft','returned_for_revision')),
    comments         TEXT,
    signature        TEXT,
    approved_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address       VARCHAR(45),
    user_agent       TEXT,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stage_approval_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_stage_approval_workflow_task
        FOREIGN KEY (workflow_task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_stage_approval_approver
        FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_assignment_history (
    id               VARCHAR(255) PRIMARY KEY,
    organization_id  VARCHAR(255) NOT NULL,
    role             VARCHAR(100) NOT NULL,
    assigned_user_id VARCHAR(255) NOT NULL,
    assigned_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_assignment_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignment_user
        FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- MASTER DATA TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id               VARCHAR(255) PRIMARY KEY,
    organization_id  VARCHAR(255) NOT NULL,
    vendor_code      VARCHAR(100) NOT NULL,
    name             VARCHAR(255) NOT NULL,
    email            VARCHAR(255),
    phone            VARCHAR(50),
    country          VARCHAR(100),
    city             VARCHAR(100),
    bank_account     VARCHAR(100),
    bank_name        VARCHAR(255) NOT NULL DEFAULT '',
    account_name     VARCHAR(255) NOT NULL DEFAULT '',
    account_number   VARCHAR(100) NOT NULL DEFAULT '',
    branch_code      VARCHAR(50)  NOT NULL DEFAULT '',
    swift_code       VARCHAR(20)  NOT NULL DEFAULT '',
    contact_person   VARCHAR(255) NOT NULL DEFAULT '',
    physical_address TEXT         NOT NULL DEFAULT '',
    tax_id           VARCHAR(100),
    active           BOOLEAN      DEFAULT true,
    deleted_at       TIMESTAMP WITH TIME ZONE,
    created_by       VARCHAR(255),
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vendors_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_vendors_created_by
        FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT uk_org_vendor_code UNIQUE (organization_id, vendor_code)
);

CREATE TABLE IF NOT EXISTS categories (
    id              VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    active          BOOLEAN      DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uk_org_category_name UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS category_budget_codes (
    id          VARCHAR(255) PRIMARY KEY,
    category_id VARCHAR(255) NOT NULL,
    budget_code VARCHAR(100) NOT NULL,
    active      BOOLEAN      DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_category_budget_codes_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- ============================================================================
-- UNIFIED DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255) NOT NULL,
    document_type   VARCHAR(50)  NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(50)  NOT NULL DEFAULT 'draft',
    amount          DECIMAL(15,2),
    currency        VARCHAR(3)   DEFAULT 'USD',
    department      VARCHAR(100),
    created_by      VARCHAR(255) NOT NULL,
    updated_by      VARCHAR(255),
    workflow_id     UUID,
    data            JSONB        DEFAULT '{}',
    metadata        JSONB        DEFAULT '{}',
    deleted_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_documents_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_created_by
        FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_documents_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT fk_documents_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

-- ============================================================================
-- BUSINESS DOCUMENT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS requisitions (
    id                   VARCHAR(255) PRIMARY KEY,
    organization_id      VARCHAR(255) NOT NULL,
    document_number      VARCHAR(100) NOT NULL,
    requester_id         VARCHAR(255) NOT NULL,
    title                VARCHAR(255) NOT NULL,
    description          TEXT,
    department           VARCHAR(100),
    department_id        VARCHAR(255),
    status               VARCHAR(50)  DEFAULT 'draft',
    priority             VARCHAR(20)  DEFAULT 'medium',
    items                JSONB,
    total_amount         DECIMAL(15,2),
    currency             VARCHAR(3)   DEFAULT 'USD',
    approval_stage       INTEGER      DEFAULT 0,
    approval_history     JSONB,
    action_history       JSONB,
    category_id          VARCHAR(255),
    preferred_vendor_id  VARCHAR(255),
    is_estimate          BOOLEAN      DEFAULT false,
    required_by_date     TIMESTAMP WITH TIME ZONE,
    cost_center          VARCHAR(255),
    project_code         VARCHAR(255),
    budget_code          VARCHAR(255),
    source_of_funds      VARCHAR(255),
    created_by           VARCHAR(255),
    created_by_name      VARCHAR(255),
    created_by_role      VARCHAR(255),
    metadata             JSONB,
    automation_used      BOOLEAN      DEFAULT FALSE,
    auto_created_po      JSONB,
    deleted_at           TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_requisitions_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_requisitions_requester
        FOREIGN KEY (requester_id) REFERENCES users(id),
    CONSTRAINT fk_requisitions_category
        FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_requisitions_vendor
        FOREIGN KEY (preferred_vendor_id) REFERENCES vendors(id),
    CONSTRAINT fk_requisitions_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS budgets (
    id               VARCHAR(255) PRIMARY KEY,
    organization_id  VARCHAR(255) NOT NULL,
    owner_id         VARCHAR(255) NOT NULL,
    budget_code      VARCHAR(100) NOT NULL,
    department       VARCHAR(100),
    department_id    VARCHAR(255),
    status           VARCHAR(50)  DEFAULT 'draft',
    fiscal_year      VARCHAR(10),
    total_budget     DECIMAL(15,2),
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2),
    approval_stage   INTEGER      DEFAULT 0,
    approval_history JSONB,
    name             VARCHAR(255),
    description      TEXT,
    currency         VARCHAR(3)   DEFAULT 'USD',
    created_by       VARCHAR(255),
    items            JSONB,
    action_history   JSONB,
    metadata         JSONB,
    deleted_at       TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_budgets_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_budgets_owner
        FOREIGN KEY (owner_id) REFERENCES users(id),
    CONSTRAINT fk_budgets_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id                       VARCHAR(255) PRIMARY KEY,
    organization_id          VARCHAR(255) NOT NULL,
    document_number          VARCHAR(100) NOT NULL,
    vendor_id                VARCHAR(255),
    status                   VARCHAR(50)  DEFAULT 'draft',
    items                    JSONB,
    total_amount             DECIMAL(15,2),
    currency                 VARCHAR(3)   DEFAULT 'USD',
    delivery_date            TIMESTAMP WITH TIME ZONE,
    approval_stage           INTEGER      DEFAULT 0,
    approval_history         JSONB,
    linked_requisition       VARCHAR(255),
    description              TEXT,
    department               VARCHAR(255),
    department_id            VARCHAR(255),
    gl_code                  VARCHAR(255),
    title                    VARCHAR(255),
    priority                 VARCHAR(50)  DEFAULT 'medium',
    subtotal                 DECIMAL(15,2),
    tax                      DECIMAL(15,2),
    total                    DECIMAL(15,2),
    budget_code              VARCHAR(255),
    cost_center              VARCHAR(255),
    project_code             VARCHAR(255),
    required_by_date         TIMESTAMP WITH TIME ZONE,
    source_requisition_number VARCHAR(255),
    source_requisition_id    VARCHAR(255),
    created_by               VARCHAR(255),
    owner_id                 VARCHAR(255),
    action_history           JSONB,
    metadata                 JSONB,
    estimated_cost           NUMERIC(15,2) NOT NULL DEFAULT 0,
    quotation_gate_overridden BOOLEAN      NOT NULL DEFAULT FALSE,
    bypass_justification     TEXT         NOT NULL DEFAULT '',
    automation_used          BOOLEAN      DEFAULT FALSE,
    auto_created_grn         JSONB,
    deleted_at               TIMESTAMP WITH TIME ZONE,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_orders_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_orders_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    CONSTRAINT fk_purchase_orders_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payment_vouchers (
    id                          VARCHAR(255) PRIMARY KEY,
    organization_id             VARCHAR(255) NOT NULL,
    document_number             VARCHAR(100) NOT NULL,
    vendor_id                   VARCHAR(255) NOT NULL,
    invoice_number              VARCHAR(100),
    status                      VARCHAR(50)  DEFAULT 'draft',
    amount                      DECIMAL(15,2),
    currency                    VARCHAR(3)   DEFAULT 'USD',
    payment_method              VARCHAR(50),
    gl_code                     VARCHAR(100),
    description                 TEXT,
    approval_stage              INTEGER      DEFAULT 0,
    approval_history            JSONB,
    linked_po                   VARCHAR(255),
    title                       VARCHAR(255),
    department                  VARCHAR(255),
    department_id               VARCHAR(255),
    priority                    VARCHAR(50)  DEFAULT 'medium',
    requested_by_name           VARCHAR(255),
    requested_date              TIMESTAMP WITH TIME ZONE,
    submitted_at                TIMESTAMP WITH TIME ZONE,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    paid_date                   TIMESTAMP WITH TIME ZONE,
    payment_due_date            TIMESTAMP WITH TIME ZONE,
    budget_code                 VARCHAR(255),
    cost_center                 VARCHAR(255),
    project_code                VARCHAR(255),
    tax_amount                  DECIMAL(15,2),
    withholding_tax_amount      DECIMAL(15,2),
    paid_amount                 DECIMAL(15,2),
    source_purchase_order_number VARCHAR(255),
    source_requisition_number   VARCHAR(255),
    bank_details                JSONB,
    items                       JSONB,
    created_by                  VARCHAR(255),
    owner_id                    VARCHAR(255),
    action_history              JSONB,
    metadata                    JSONB,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_vouchers_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_vouchers_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    CONSTRAINT fk_payment_vouchers_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS goods_received_notes (
    id               VARCHAR(255) PRIMARY KEY,
    organization_id  VARCHAR(255) NOT NULL,
    document_number  VARCHAR(100) NOT NULL,
    po_document_number VARCHAR(255),
    status           VARCHAR(50)  DEFAULT 'draft',
    received_date    TIMESTAMP WITH TIME ZONE,
    received_by      VARCHAR(255),
    items            JSONB,
    quality_issues   JSONB,
    approval_stage   INTEGER      DEFAULT 0,
    approval_history JSONB,
    created_by       VARCHAR(255),
    owner_id         VARCHAR(255),
    warehouse_location VARCHAR(255),
    notes            TEXT,
    stage_name       VARCHAR(255),
    approved_by      VARCHAR(255),
    automation_used  BOOLEAN      DEFAULT FALSE,
    auto_created_pv  JSONB,
    action_history   JSONB,
    metadata         JSONB,
    budget_code      VARCHAR(255),
    cost_center      VARCHAR(255),
    project_code     VARCHAR(255),
    deleted_at       TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_grns_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_grns_received_by
        FOREIGN KEY (received_by) REFERENCES users(id),
    CONSTRAINT fk_grn_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================================
-- AUDIT AND NOTIFICATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id              VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(100) NOT NULL DEFAULT '',
    document_id     VARCHAR(255) NOT NULL,
    document_type   VARCHAR(50)  NOT NULL,
    user_id         VARCHAR(255) NOT NULL,
    actor_name      VARCHAR(255) NOT NULL DEFAULT '',
    actor_role      VARCHAR(100) NOT NULL DEFAULT '',
    action          VARCHAR(50)  NOT NULL,
    changes         JSONB,
    details         JSONB,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     VARCHAR(255) NOT NULL,
    recipient_id        VARCHAR(255) NOT NULL,
    type                VARCHAR(50)  NOT NULL,
    document_id         VARCHAR(255),
    document_type       VARCHAR(50),
    subject             VARCHAR(255) NOT NULL,
    body                TEXT         NOT NULL,
    sent                BOOLEAN      DEFAULT false,
    sent_at             TIMESTAMP WITH TIME ZONE,
    entity_id           VARCHAR(255),
    entity_type         VARCHAR(50),
    entity_number       VARCHAR(255),
    related_user_id     VARCHAR(255),
    related_user_name   VARCHAR(255),
    is_read             BOOLEAN      DEFAULT false,
    read_at             TIMESTAMP WITH TIME ZONE,
    action_taken        BOOLEAN      DEFAULT false,
    action_taken_at     TIMESTAMP WITH TIME ZONE,
    importance          VARCHAR(50),
    quick_action        JSONB,
    reassignment_reason TEXT,
    message             TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User activity logs — intentionally no FK on user_id to avoid lock contention (023)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255),
    action_type     VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100),
    resource_id     VARCHAR(255),
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    metadata        JSONB,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Impersonation logs (025)
CREATE TABLE IF NOT EXISTS impersonation_logs (
    id                 TEXT PRIMARY KEY,
    impersonator_id    TEXT NOT NULL,
    impersonator_email TEXT NOT NULL,
    target_id          TEXT NOT NULL,
    target_email       TEXT NOT NULL,
    impersonation_type TEXT NOT NULL
        CHECK (impersonation_type IN ('platform_user','admin_user')),
    token_jti          TEXT NOT NULL,
    reason             TEXT,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked            BOOLEAN     NOT NULL DEFAULT false,
    revoked_at         TIMESTAMPTZ,
    revoked_by         TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FUNCTION: update_updated_at_column (defined once, reused by all triggers)
-- ============================================================================
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';
-- +goose StatementEnd

-- Separate function used by the documents table (uses NOW())
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- ============================================================================
-- TRIGGERS  (DROP IF EXISTS first so re-running on existing DBs is safe)
-- ============================================================================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_branches_updated_at ON organization_branches;
CREATE TRIGGER update_organization_branches_updated_at
    BEFORE UPDATE ON organization_branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_settings_updated_at ON organization_settings;
CREATE TRIGGER update_organization_settings_updated_at
    BEFORE UPDATE ON organization_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_departments_updated_at ON organization_departments;
CREATE TRIGGER update_organization_departments_updated_at
    BEFORE UPDATE ON organization_departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_roles_updated_at ON organization_roles;
CREATE TRIGGER update_organization_roles_updated_at
    BEFORE UPDATE ON organization_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_assignments_updated_at ON workflow_assignments;
CREATE TRIGGER update_workflow_assignments_updated_at
    BEFORE UPDATE ON workflow_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_tasks_updated_at ON workflow_tasks;
CREATE TRIGGER update_workflow_tasks_updated_at
    BEFORE UPDATE ON workflow_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON documents;
CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_documents_updated_at();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_category_budget_codes_updated_at ON category_budget_codes;
CREATE TRIGGER update_category_budget_codes_updated_at
    BEFORE UPDATE ON category_budget_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requisitions_updated_at ON requisitions;
CREATE TRIGGER update_requisitions_updated_at
    BEFORE UPDATE ON requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_vouchers_updated_at ON payment_vouchers;
CREATE TRIGGER update_payment_vouchers_updated_at
    BEFORE UPDATE ON payment_vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goods_received_notes_updated_at ON goods_received_notes;
CREATE TRIGGER update_goods_received_notes_updated_at
    BEFORE UPDATE ON goods_received_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(current_organization_id);
CREATE INDEX IF NOT EXISTS idx_users_man_number   ON users(man_number);
CREATE INDEX IF NOT EXISTS idx_users_nrc_number   ON users(nrc_number);

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug   ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);

-- Organization branches
CREATE INDEX IF NOT EXISTS idx_organization_branches_org_id ON organization_branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_branches_active  ON organization_branches(organization_id, is_active);

-- Organization departments
CREATE INDEX IF NOT EXISTS idx_org_departments_organization ON organization_departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_departments_manager_name ON organization_departments(manager_name);

-- Organization members
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id  ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_active ON organization_members(user_id, active);
CREATE INDEX IF NOT EXISTS idx_org_members_branch      ON organization_members(branch_id);

-- Organization roles — partial unique indexes replacing composite UNIQUE constraint
CREATE UNIQUE INDEX IF NOT EXISTS uk_global_system_role_name
    ON organization_roles(name)
    WHERE organization_id IS NULL AND is_system_role = true;

CREATE UNIQUE INDEX IF NOT EXISTS uk_org_custom_role_name
    ON organization_roles(organization_id, name)
    WHERE organization_id IS NOT NULL;

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires   ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Login attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_email      ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, attempted_at);

-- Account lockouts
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_active  ON account_lockouts(user_id, active);

-- Password resets
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token   ON password_resets(token);

-- User organization roles
CREATE INDEX IF NOT EXISTS idx_user_org_roles_user_id ON user_organization_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_org_id  ON user_organization_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_role_id ON user_organization_roles(role_id);

-- Workflows
CREATE INDEX IF NOT EXISTS idx_workflows_organization          ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_entity_type          ON workflows(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_entity     ON workflow_assignments(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_org_entity ON workflow_assignments(organization_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_organization     ON workflow_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_user   ON workflow_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_role   ON workflow_tasks(assigned_role);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status          ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_entity          ON workflow_tasks(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_claimed_by      ON workflow_tasks(claimed_by);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_due_date        ON workflow_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignment_id   ON workflow_tasks(workflow_assignment_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_org_completed
    ON workflow_tasks(organization_id, completed_at DESC)
    WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_stage_times
    ON workflow_tasks(organization_id, stage_number, created_at, completed_at)
    WHERE completed_at IS NOT NULL;

-- Stage approval records
CREATE INDEX IF NOT EXISTS idx_stage_approval_task_id    ON stage_approval_records(workflow_task_id);
CREATE INDEX IF NOT EXISTS idx_stage_approval_approver_id ON stage_approval_records(approver_id);
CREATE INDEX IF NOT EXISTS idx_stage_approval_org_created
    ON stage_approval_records(organization_id, approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_approval_org_action
    ON stage_approval_records(organization_id, action, approved_at DESC);

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(active);

-- Vendors & categories
CREATE INDEX IF NOT EXISTS idx_vendors_organization    ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_active          ON vendors(active);
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at      ON vendors(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_organization ON categories(organization_id);

-- Business documents
CREATE INDEX IF NOT EXISTS idx_requisitions_organization   ON requisitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status         ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_document_number ON requisitions(document_number);
CREATE INDEX IF NOT EXISTS idx_requisitions_org_status     ON requisitions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_requisitions_org_status_created
    ON requisitions(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requisitions_deleted_at
    ON requisitions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requisitions_requester         ON requisitions(requester_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_category          ON requisitions(category_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_source_of_funds   ON requisitions(source_of_funds);

CREATE INDEX IF NOT EXISTS idx_budgets_organization        ON budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_budgets_org_status_created
    ON budgets(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at
    ON budgets(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status_created
    ON purchase_orders(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted_at
    ON purchase_orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor         ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status         ON purchase_orders(status);

CREATE INDEX IF NOT EXISTS idx_payment_vouchers_organization ON payment_vouchers(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_org_status_created
    ON payment_vouchers(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_deleted_at
    ON payment_vouchers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_vendor        ON payment_vouchers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status        ON payment_vouchers(status);

CREATE INDEX IF NOT EXISTS idx_grns_organization      ON goods_received_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_grn_org_status_created
    ON goods_received_notes(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grn_deleted_at
    ON goods_received_notes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grns_status       ON goods_received_notes(status);
CREATE INDEX IF NOT EXISTS idx_grns_received_by  ON goods_received_notes(received_by);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_type         ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status       ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_by   ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_number       ON documents(document_number);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_document   ON audit_logs(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id     ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_doc_type   ON audit_logs(document_type);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_organization ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient   ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent        ON notifications(sent);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read     ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON notifications(created_at);

-- User activity logs
CREATE INDEX IF NOT EXISTS idx_ual_user_id    ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ual_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ual_action_type ON user_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_ual_user_created ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ual_org_created  ON user_activity_logs(organization_id, created_at DESC);

-- Impersonation logs
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_impersonator ON impersonation_logs(impersonator_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_target       ON impersonation_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_created_at   ON impersonation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_type         ON impersonation_logs(impersonation_type);

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================
COMMENT ON TABLE workflows IS 'Workflow definitions with frontend compatibility';
COMMENT ON TABLE workflow_assignments IS 'Tracks workflow execution for specific entities';
COMMENT ON TABLE workflow_tasks IS 'Individual approval tasks within workflow assignments with concurrency control';
COMMENT ON TABLE stage_approval_records IS 'Tracks individual approvals per workflow stage';
COMMENT ON TABLE task_assignment_history IS 'Round-robin task assignment history';
COMMENT ON TABLE workflow_defaults IS 'Default workflow mappings for entity types per organization';
COMMENT ON TABLE documents IS 'Unified document table for all business document types';
COMMENT ON TABLE vendors IS 'Organization-scoped vendors for multi-tenant security';
COMMENT ON TABLE organization_departments IS 'Organization departments with manager name support';
COMMENT ON TABLE user_activity_logs IS 'User action audit trail — no FK on user_id to avoid lock contention';
COMMENT ON TABLE impersonation_logs IS 'Impersonation events for audit/security — visible to super_admin only';

-- +goose Down
-- ============================================================================
-- ROLLBACK: 001_core_schema
-- Drop all core tables in reverse dependency order
-- ============================================================================

DROP TABLE IF EXISTS impersonation_logs CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS goods_received_notes CASCADE;
DROP TABLE IF EXISTS payment_vouchers CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS requisitions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS category_budget_codes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS task_assignment_history CASCADE;
DROP TABLE IF EXISTS stage_approval_records CASCADE;
DROP TABLE IF EXISTS workflow_defaults CASCADE;
DROP TABLE IF EXISTS workflow_tasks CASCADE;
DROP TABLE IF EXISTS workflow_assignments CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS user_organization_roles CASCADE;
DROP TABLE IF EXISTS organization_roles CASCADE;
DROP TABLE IF EXISTS account_lockouts CASCADE;
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organization_departments CASCADE;
DROP TABLE IF EXISTS organization_settings CASCADE;
DROP TABLE IF EXISTS organization_branches CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_documents_updated_at() CASCADE;
