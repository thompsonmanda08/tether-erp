-- +goose Up
-- ============================================================================
-- TETHER-ERP — ADMIN SYSTEM TABLES
-- Migration: 003_admin_system
-- ============================================================================

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id            VARCHAR(255) PRIMARY KEY,
    key           VARCHAR(255) UNIQUE NOT NULL,
    value         TEXT,
    type          VARCHAR(50)  NOT NULL DEFAULT 'string',
    category      VARCHAR(100) NOT NULL DEFAULT 'general',
    description   TEXT,
    default_value TEXT,
    is_required   BOOLEAN      DEFAULT FALSE,
    is_secret     BOOLEAN      DEFAULT FALSE,
    environment   VARCHAR(50)  DEFAULT 'all',
    validation    JSONB,
    created_by    VARCHAR(255),
    updated_by    VARCHAR(255),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ENVIRONMENT VARIABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS environment_variables (
    id          VARCHAR(255) PRIMARY KEY,
    key         VARCHAR(255) UNIQUE NOT NULL,
    value       TEXT,
    environment VARCHAR(50)  NOT NULL,
    is_secret   BOOLEAN      DEFAULT FALSE,
    description TEXT,
    is_required BOOLEAN      DEFAULT FALSE,
    category    VARCHAR(100),
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_system_settings_category    ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_environment ON system_settings(environment);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_required ON system_settings(is_required);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_secret   ON system_settings(is_secret);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at  ON system_settings(updated_at);

CREATE INDEX IF NOT EXISTS idx_environment_variables_environment ON environment_variables(environment);
CREATE INDEX IF NOT EXISTS idx_environment_variables_category    ON environment_variables(category);
CREATE INDEX IF NOT EXISTS idx_environment_variables_is_secret   ON environment_variables(is_secret);

-- ============================================================================
-- FEATURE FLAGS  (used by admin feature-flag management endpoints)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
    id               VARCHAR(255) PRIMARY KEY,
    key              VARCHAR(255) UNIQUE NOT NULL,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    type             VARCHAR(50)  NOT NULL DEFAULT 'boolean',
    default_value    TEXT,
    enabled          BOOLEAN      DEFAULT FALSE,
    environment      VARCHAR(50)  DEFAULT 'all',
    category         VARCHAR(100) DEFAULT 'feature',
    tags             JSONB        DEFAULT '[]',
    targeting        JSONB        DEFAULT '{}',
    variations       JSONB        DEFAULT '[]',
    last_evaluated   TIMESTAMP WITH TIME ZONE,
    evaluation_count BIGINT       DEFAULT 0,
    is_archived      BOOLEAN      DEFAULT FALSE,
    expires_at       TIMESTAMP WITH TIME ZONE,
    created_by       VARCHAR(255),
    updated_by       VARCHAR(255),
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_category    ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled     ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_is_archived ON feature_flags(is_archived);
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated_at  ON feature_flags(updated_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO system_settings (id, key, value, type, category, description, default_value, is_required, is_secret, environment, created_by, updated_by) VALUES
('setting_001', 'app.name',                  'Tether-ERP', 'string',  'general',      'Application name displayed in the UI',     'Tether-ERP', true,  false, 'all', 'system', 'system'),
('setting_002', 'security.session_timeout',  '3600',       'number',  'security',     'Session timeout in seconds',               '3600',       true,  false, 'all', 'system', 'system'),
('setting_003', 'performance.cache_enabled', 'true',       'boolean', 'performance',  'Enable application-level caching',         'true',       false, false, 'all', 'system', 'system'),
('setting_004', 'notification.email_enabled','true',       'boolean', 'notification', 'Enable email notifications',               'true',       false, false, 'all', 'system', 'system'),
('setting_005', 'ui.theme',                  'light',      'string',  'ui',           'Default UI theme',                         'light',      false, false, 'all', 'system', 'system')
ON CONFLICT (id) DO NOTHING;

-- +goose Down
-- ============================================================================
-- ROLLBACK: 003_admin_system
-- ============================================================================

DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS environment_variables CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
