package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
)

// ApprovalRule defines routing rules for document approval.
//
// NOTE: There is no `approval_rules` table in the current sqlc schema. This
// service was deprecated in favour of WorkflowExecutionService.StartWorkflow.
// The CRUD operations below operate against an `approval_rules` table that
// must be created out-of-band if this service is reactivated.
//
// TODO(post-gorm): Either drop this service entirely (preferred) or add a
// migration + sqlc queries for `approval_rules`.
type ApprovalRule struct {
	ID              string `json:"id"`
	DocumentType    string `json:"documentType"` // requisition, budget, po, pv, grn
	Department      string `json:"department"`   // department affected, or "*" for all
	AmountRange     string `json:"amountRange"`  // low, medium, high (thresholds)
	Priority        string `json:"priority"`     // low, medium, high, or "*" for all
	RequiredStages  int    `json:"requiredStages"`
	ApprovalChain   string `json:"approvalChain"` // JSON array of role names
	CanSkipStages   bool   `json:"canSkipStages"` // Can approvers skip stages
	RequiresFinance bool   `json:"requiresFinance"`
	CreatedAt       string `json:"createdAt"`
}

// ApprovalRoutingService handles routing logic for documents.
//
// Backed by ad-hoc pgx queries via the package-level config.PgxDB. The previous
// constructor accepted a *gorm.DB; callers must drop that argument.
type ApprovalRoutingService struct{}

// NewApprovalRoutingService creates a new approval routing service.
//
// NOTE: Constructor signature changed (no DB argument). Callers (none in
// production code at time of this rewrite — only referenced by tests) must be
// updated.
func NewApprovalRoutingService() *ApprovalRoutingService {
	return &ApprovalRoutingService{}
}

// GetApproversForDocument returns the list of approvers for a document.
func (ars *ApprovalRoutingService) GetApproversForDocument(docType string, department string, amount float64, priority string) ([]string, error) {
	amountRange := ars.getAmountRange(amount)

	rule, err := ars.findApprovalRule(docType, department, amountRange, priority)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":    "find_approval_rule",
			"doc_type":     docType,
			"department":   department,
			"amount_range": amountRange,
			"priority":     priority,
		}).WithError(err).Error("failed_to_find_approval_rule")
		return nil, fmt.Errorf("approval_rules: get_approvers: no approval rule found for document type %s", docType)
	}

	var approvalChain []string
	if err := json.Unmarshal([]byte(rule.ApprovalChain), &approvalChain); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "unmarshal_approval_chain",
			"rule_id":   rule.ID,
		}).WithError(err).Error("failed_to_unmarshal_approval_chain")
		return nil, fmt.Errorf("approval_rules: get_approvers: invalid approval chain configuration")
	}

	approvers, err := ars.getUsersByRoles(approvalChain)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":      "get_users_by_roles",
			"approval_chain": approvalChain,
		}).WithError(err).Error("failed_to_get_users_by_roles")
		return nil, fmt.Errorf("approval_rules: get_approvers: could not find approvers for roles: %w", err)
	}

	return approvers, nil
}

// RouteDocumentToApprovers creates approval tasks for a document.
//
// DEPRECATED: This function is part of the legacy approval system.
// Use WorkflowExecutionService.StartWorkflow() instead for new implementations.
func (ars *ApprovalRoutingService) RouteDocumentToApprovers(documentID, docType, department string, amount float64, priority string) error {
	logging.WithFields(map[string]interface{}{
		"operation":   "route_document_to_approvers",
		"document_id": documentID,
	}).Warn("deprecated_function_called_use_workflow_system_instead")

	return fmt.Errorf("approval_rules: deprecated: use WorkflowExecutionService.StartWorkflow() instead")
}

// getAmountRange categorizes amount into low, medium, high.
func (ars *ApprovalRoutingService) getAmountRange(amount float64) string {
	if amount < 10000 {
		return "low"
	} else if amount < 50000 {
		return "medium"
	}
	return "high"
}

// findApprovalRule finds the matching rule for a document.
func (ars *ApprovalRoutingService) findApprovalRule(docType, department, amountRange, priority string) (*ApprovalRule, error) {
	ctx := context.Background()

	const exactQuery = `
SELECT id, document_type, department, amount_range, priority, required_stages,
       approval_chain, can_skip_stages, requires_finance, created_at
FROM approval_rules
WHERE document_type = $1
  AND (department = $2 OR department = '*')
  AND amount_range = $3
  AND (priority = $4 OR priority = '*')
LIMIT 1
`

	rule, err := scanApprovalRule(config.PgxDB.QueryRow(ctx, exactQuery, docType, department, amountRange, priority))
	if err == nil {
		return rule, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("approval_rules: find_approval_rule: %w", err)
	}

	// Fallback: try with wildcard department only.
	const wildcardQuery = `
SELECT id, document_type, department, amount_range, priority, required_stages,
       approval_chain, can_skip_stages, requires_finance, created_at
FROM approval_rules
WHERE document_type = $1
  AND department = '*'
  AND amount_range = $2
  AND (priority = $3 OR priority = '*')
LIMIT 1
`
	rule, err = scanApprovalRule(config.PgxDB.QueryRow(ctx, wildcardQuery, docType, amountRange, priority))
	if err != nil {
		return nil, fmt.Errorf("approval_rules: find_approval_rule: %w", err)
	}
	return rule, nil
}

// getUsersByRoles fetches active users with any of the specified roles.
// Roles are matched against the legacy `users.role` column.
func (ars *ApprovalRoutingService) getUsersByRoles(roles []string) ([]string, error) {
	if len(roles) == 0 {
		return nil, nil
	}
	ctx := context.Background()

	const query = `
SELECT id FROM users
WHERE role = ANY($1::text[])
  AND active = true
  AND deleted_at IS NULL
`
	rows, err := config.PgxDB.Query(ctx, query, roles)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "fetch_users_by_roles",
			"roles":     roles,
		}).WithError(err).Error("failed_to_fetch_users_by_roles")
		return nil, fmt.Errorf("approval_rules: get_users_by_roles: %w", err)
	}
	defer rows.Close()

	approverIDs := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("approval_rules: get_users_by_roles: scan: %w", err)
		}
		approverIDs = append(approverIDs, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("approval_rules: get_users_by_roles: %w", err)
	}
	return approverIDs, nil
}

// CreateDefaultApprovalRules creates default routing rules.
func (ars *ApprovalRoutingService) CreateDefaultApprovalRules() error {
	ctx := context.Background()

	rules := []ApprovalRule{
		{
			ID:              "rule-req-low",
			DocumentType:    "requisition",
			Department:      "*",
			AmountRange:     "low",
			Priority:        "*",
			RequiredStages:  2,
			ApprovalChain:   `["approver", "finance"]`,
			CanSkipStages:   false,
			RequiresFinance: true,
		},
		{
			ID:              "rule-req-medium",
			DocumentType:    "requisition",
			Department:      "*",
			AmountRange:     "medium",
			Priority:        "*",
			RequiredStages:  3,
			ApprovalChain:   `["approver", "finance", "admin"]`,
			CanSkipStages:   false,
			RequiresFinance: true,
		},
		{
			ID:              "rule-req-high",
			DocumentType:    "requisition",
			Department:      "*",
			AmountRange:     "high",
			Priority:        "*",
			RequiredStages:  4,
			ApprovalChain:   `["approver", "finance", "admin", "admin"]`,
			CanSkipStages:   false,
			RequiresFinance: true,
		},
		{
			ID:              "rule-po-low",
			DocumentType:    "po",
			Department:      "*",
			AmountRange:     "low",
			Priority:        "*",
			RequiredStages:  2,
			ApprovalChain:   `["finance", "approver"]`,
			CanSkipStages:   false,
			RequiresFinance: true,
		},
		{
			ID:              "rule-pv-all",
			DocumentType:    "pv",
			Department:      "*",
			AmountRange:     "*",
			Priority:        "*",
			RequiredStages:  2,
			ApprovalChain:   `["finance", "admin"]`,
			CanSkipStages:   false,
			RequiresFinance: true,
		},
		{
			ID:              "rule-grn-all",
			DocumentType:    "grn",
			Department:      "*",
			AmountRange:     "*",
			Priority:        "*",
			RequiredStages:  1,
			ApprovalChain:   `["approver"]`,
			CanSkipStages:   false,
			RequiresFinance: false,
		},
		{
			ID:              "rule-budget-all",
			DocumentType:    "budget",
			Department:      "*",
			AmountRange:     "*",
			Priority:        "*",
			RequiredStages:  2,
			ApprovalChain:   `["finance", "admin"]`,
			CanSkipStages:   false,
			RequiresFinance: true,
		},
	}

	const upsertQuery = `
INSERT INTO approval_rules (
    id, document_type, department, amount_range, priority,
    required_stages, approval_chain, can_skip_stages, requires_finance, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
)
ON CONFLICT (id) DO NOTHING
`

	for _, rule := range rules {
		if _, err := config.PgxDB.Exec(ctx, upsertQuery,
			rule.ID,
			rule.DocumentType,
			rule.Department,
			rule.AmountRange,
			rule.Priority,
			rule.RequiredStages,
			rule.ApprovalChain,
			rule.CanSkipStages,
			rule.RequiresFinance,
		); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation":  "create_approval_rule",
				"doc_type":   rule.DocumentType,
				"department": rule.Department,
			}).WithError(err).Error("failed_to_create_approval_rule")
			return fmt.Errorf("approval_rules: create_default_rules: %w", err)
		}
	}

	return nil
}

// scanApprovalRule scans a single approval_rules row from a pgx Row.
func scanApprovalRule(row pgx.Row) (*ApprovalRule, error) {
	var r ApprovalRule
	if err := row.Scan(
		&r.ID,
		&r.DocumentType,
		&r.Department,
		&r.AmountRange,
		&r.Priority,
		&r.RequiredStages,
		&r.ApprovalChain,
		&r.CanSkipStages,
		&r.RequiresFinance,
		&r.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &r, nil
}
