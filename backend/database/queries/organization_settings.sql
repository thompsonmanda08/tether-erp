-- Organization settings queries
-- One row per organization (organization_id is UNIQUE).

-- name: GetOrganizationSettings :one
SELECT * FROM organization_settings WHERE organization_id = $1;

-- name: UpsertOrganizationSettings :one
INSERT INTO organization_settings (
    id, organization_id,
    require_digital_signatures, default_approval_chain, currency,
    fiscal_year_start, enable_budget_validation, budget_variance_threshold,
    procurement_flow
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
ON CONFLICT (organization_id) DO UPDATE SET
    require_digital_signatures = EXCLUDED.require_digital_signatures,
    default_approval_chain     = EXCLUDED.default_approval_chain,
    currency                   = EXCLUDED.currency,
    fiscal_year_start          = EXCLUDED.fiscal_year_start,
    enable_budget_validation   = EXCLUDED.enable_budget_validation,
    budget_variance_threshold  = EXCLUDED.budget_variance_threshold,
    procurement_flow           = EXCLUDED.procurement_flow,
    updated_at                 = NOW()
RETURNING *;
