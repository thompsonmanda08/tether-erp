package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
)

// BudgetConstraint represents budget rules and limits.
//
// Persisted in the `budget_constraints` table. There is currently no sqlc
// query for this table (it is not in the migration set under
// backend/database/migrations/00001_core_schema.sql); production schemas are
// expected to provide it. All access is via raw config.PgxDB SQL with $n
// placeholders.
type BudgetConstraint struct {
	ID             string    `json:"id"`
	Department     string    `json:"department"`
	FiscalYear     string    `json:"fiscalYear"`
	MaxBudget      float64   `json:"maxBudget"`
	MinBudget      float64   `json:"minBudget"`
	MaxSingleOrder float64   `json:"maxSingleOrder"`
	ReserveFunds   float64   `json:"reserveFunds"` // Percentage
	RequiresQuote  bool      `json:"requiresQuote"`
	QuoteThreshold float64   `json:"quoteThreshold"`
	CreatedAt      time.Time `json:"createdAt"`
}

// BudgetValidationService handles budget constraint checking.
//
// Migrated off GORM: uses the package-global pgx pool (config.PgxDB) and the
// sqlc-generated queries (config.Queries). The constructor takes no
// arguments — callers that previously passed a *gorm.DB must drop that
// argument.
type BudgetValidationService struct{}

// NewBudgetValidationService creates a new budget validation service.
//
// Constructor signature changed: no arguments. All DB access goes through
// config.Queries / config.PgxDB.
func NewBudgetValidationService() *BudgetValidationService {
	return &BudgetValidationService{}
}

// budgetRow is the minimal projection we need from the budgets table.
type budgetRow struct {
	ID              string
	BudgetCode      string
	Department      string
	FiscalYear      string
	TotalBudget     float64
	AllocatedAmount float64
	RemainingAmount float64
	Status          string
}

// findApprovedBudget loads the approved budget matching department/fiscal year.
//
// Returns (nil, nil) when no row matches (callers treat this as a soft "no
// budget found" rather than a hard error).
//
// TODO: there is no sqlc query keyed on (department, fiscal_year, status); we
// use raw SQL via config.PgxDB. Once sqlc.GetBudgetByDepartmentFiscalYear
// lands, swap this out.
func (bvs *BudgetValidationService) findApprovedBudget(ctx context.Context, department, fiscalYear string) (*budgetRow, error) {
	const query = `
		SELECT id, budget_code, COALESCE(department,''), COALESCE(fiscal_year,''),
		       COALESCE(total_budget, 0), COALESCE(allocated_amount, 0),
		       COALESCE(remaining_amount, 0), COALESCE(status,'')
		FROM budgets
		WHERE department = $1
		  AND fiscal_year = $2
		  AND UPPER(status) = 'APPROVED'
		  AND deleted_at IS NULL
		LIMIT 1
	`
	var b budgetRow
	var (
		total, allocated, remaining decimal.Decimal
	)
	err := config.PgxDB.QueryRow(ctx, query, department, fiscalYear).Scan(
		&b.ID, &b.BudgetCode, &b.Department, &b.FiscalYear,
		&total, &allocated, &remaining, &b.Status,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("budget_validation: find approved budget: %w", err)
	}
	b.TotalBudget, _ = total.Float64()
	b.AllocatedAmount, _ = allocated.Float64()
	b.RemainingAmount, _ = remaining.Float64()
	return &b, nil
}

// ValidateBudgetForRequisition checks if a requisition amount is within budget.
func (bvs *BudgetValidationService) ValidateBudgetForRequisition(
	department, fiscalYear string,
	amount float64,
) (bool, string, error) {
	ctx := context.Background()

	budget, err := bvs.findApprovedBudget(ctx, department, fiscalYear)
	if err != nil {
		return false, "", err
	}
	if budget == nil {
		return false, fmt.Sprintf("No approved budget found for %s in %s", department, fiscalYear), nil
	}

	if amount > budget.RemainingAmount {
		return false, fmt.Sprintf(
			"Amount %.2f exceeds remaining budget %.2f",
			amount, budget.RemainingAmount,
		), nil
	}

	constraint, err := bvs.getBudgetConstraint(ctx, department, fiscalYear)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":   "get_budget_constraint",
			"department":  department,
			"fiscal_year": fiscalYear,
		}).WithError(err).Warn("could_not_get_budget_constraint")
		return true, "", nil // Proceed if no constraint found
	}

	if amount > constraint.MaxSingleOrder {
		return false, fmt.Sprintf(
			"Amount %.2f exceeds max single order limit %.2f",
			amount, constraint.MaxSingleOrder,
		), nil
	}

	if constraint.RequiresQuote && amount >= constraint.QuoteThreshold {
		return true, "Quotes required for amounts >= threshold", nil
	}

	return true, "", nil
}

// ValidateBudgetForPurchaseOrder checks if a PO amount is within budget and constraints.
func (bvs *BudgetValidationService) ValidateBudgetForPurchaseOrder(
	department, fiscalYear string,
	amount float64,
	vendorID string,
) (bool, string, error) {
	valid, msg, err := bvs.ValidateBudgetForRequisition(department, fiscalYear, amount)
	if err != nil || !valid {
		return valid, msg, err
	}

	ctx := context.Background()

	vendorTotal, err := bvs.getVendorPOTotal(ctx, vendorID, department, fiscalYear)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":   "get_vendor_po_total",
			"vendor_id":   vendorID,
			"department":  department,
			"fiscal_year": fiscalYear,
		}).WithError(err).Warn("could_not_get_vendor_po_total")
		return true, "", nil
	}

	budget, err := bvs.findApprovedBudget(ctx, department, fiscalYear)
	if err != nil || budget == nil {
		return true, "", nil
	}

	maxPerVendor := budget.TotalBudget * 0.3
	if vendorTotal+amount > maxPerVendor {
		return true, fmt.Sprintf(
			"Vendor total will exceed 30%% of budget (current: %.2f, new: %.2f, limit: %.2f)",
			vendorTotal, amount, maxPerVendor,
		), nil // Allow but flag
	}

	return true, "", nil
}

// BudgetSnapshot is a lightweight value type passed into ValidateBudgetAllocation.
//
// It used to be *models.Budget but allocating against the GORM model created a
// cross-package dependency we no longer want here. Callers can populate this
// from either an sqlc.Budget or a domain model.
type BudgetSnapshot struct {
	ID              string
	Department      string
	FiscalYear      string
	TotalBudget     float64
	AllocatedAmount float64
	RemainingAmount float64
	Status          string
}

// ValidateBudgetAllocation checks if allocated amount doesn't exceed total budget.
func (bvs *BudgetValidationService) ValidateBudgetAllocation(
	budget *BudgetSnapshot,
	additionalAllocation float64,
) (bool, string, error) {
	if budget == nil {
		return false, "budget snapshot is nil", nil
	}

	newTotal := budget.AllocatedAmount + additionalAllocation
	if newTotal > budget.TotalBudget {
		return false, fmt.Sprintf(
			"Allocation %.2f would exceed total budget %.2f (current allocation: %.2f)",
			additionalAllocation, budget.TotalBudget, budget.AllocatedAmount,
		), nil
	}

	ctx := context.Background()
	constraint, err := bvs.getBudgetConstraint(ctx, budget.Department, budget.FiscalYear)
	if err == nil {
		reserveAmount := budget.TotalBudget * (constraint.ReserveFunds / 100)
		remainingAfterAllocation := budget.TotalBudget - newTotal

		if remainingAfterAllocation < reserveAmount {
			return false, fmt.Sprintf(
				"Allocation would violate reserve fund requirement of %.2f",
				reserveAmount,
			), nil
		}
	}

	return true, "", nil
}

// snapshotFromSQLC converts an sqlc.Budget row into a BudgetSnapshot.
func snapshotFromSQLC(b sqlc.Budget) *BudgetSnapshot {
	snap := &BudgetSnapshot{
		ID: b.ID,
	}
	if b.Department != nil {
		snap.Department = *b.Department
	}
	if b.FiscalYear != nil {
		snap.FiscalYear = *b.FiscalYear
	}
	if b.Status != nil {
		snap.Status = *b.Status
	}
	if b.TotalBudget != nil {
		snap.TotalBudget, _ = b.TotalBudget.Float64()
	}
	if b.AllocatedAmount != nil {
		snap.AllocatedAmount, _ = b.AllocatedAmount.Float64()
	}
	if b.RemainingAmount != nil {
		snap.RemainingAmount, _ = b.RemainingAmount.Float64()
	}
	return snap
}

// AllocateBudget allocates funds from a budget to a requisition.
func (bvs *BudgetValidationService) AllocateBudget(
	budgetID string,
	allocationAmount float64,
	requisitionID string,
) error {
	ctx := context.Background()

	budgetRow, err := config.Queries.GetBudgetByID(ctx, sqlc.GetBudgetByIDParams{ID: budgetID})
	if err != nil {
		return fmt.Errorf("budget_validation: get budget: %w", err)
	}

	snap := snapshotFromSQLC(budgetRow)

	valid, msg, err := bvs.ValidateBudgetAllocation(snap, allocationAmount)
	if err != nil {
		return err
	}
	if !valid {
		return fmt.Errorf("allocation not allowed: %s", msg)
	}

	allocDecimal := decimal.NewFromFloat(allocationAmount)
	if _, err := config.Queries.ReserveBudget(ctx, sqlc.ReserveBudgetParams{
		ID:              budgetID,
		AllocatedAmount: &allocDecimal,
	}); err != nil {
		return fmt.Errorf("budget_validation: reserve budget: %w", err)
	}

	logging.WithFields(map[string]interface{}{
		"operation":         "allocate_budget",
		"allocation_amount": allocationAmount,
		"budget_id":         budgetID,
		"requisition_id":    requisitionID,
	}).Info("allocated_budget_for_requisition")

	return nil
}

// DeallocateBudget releases allocated funds (e.g., when requisition is rejected).
func (bvs *BudgetValidationService) DeallocateBudget(
	budgetID string,
	allocationAmount float64,
	requisitionID string,
) error {
	ctx := context.Background()

	allocDecimal := decimal.NewFromFloat(allocationAmount)
	if _, err := config.Queries.ReleaseBudget(ctx, sqlc.ReleaseBudgetParams{
		ID:              budgetID,
		AllocatedAmount: &allocDecimal,
	}); err != nil {
		return fmt.Errorf("budget_validation: release budget: %w", err)
	}

	logging.WithFields(map[string]interface{}{
		"operation":         "deallocate_budget",
		"allocation_amount": allocationAmount,
		"budget_id":         budgetID,
		"requisition_id":    requisitionID,
	}).Info("deallocated_budget_for_requisition")

	return nil
}

// GetBudgetStatus returns detailed budget status.
func (bvs *BudgetValidationService) GetBudgetStatus(budgetID string) (map[string]interface{}, error) {
	ctx := context.Background()

	budget, err := config.Queries.GetBudgetByID(ctx, sqlc.GetBudgetByIDParams{ID: budgetID})
	if err != nil {
		return nil, fmt.Errorf("budget_validation: get budget status: %w", err)
	}

	snap := snapshotFromSQLC(budget)

	utilizationPercent := 0.0
	if snap.TotalBudget > 0 {
		utilizationPercent = (snap.AllocatedAmount / snap.TotalBudget) * 100
	}

	return map[string]interface{}{
		"budgetId":           snap.ID,
		"department":         snap.Department,
		"fiscalYear":         snap.FiscalYear,
		"totalBudget":        snap.TotalBudget,
		"allocatedAmount":    snap.AllocatedAmount,
		"remainingAmount":    snap.RemainingAmount,
		"utilizationPercent": utilizationPercent,
		"status":             snap.Status,
		"canAllocateMore":    snap.RemainingAmount > 0,
	}, nil
}

// GetBudgetsByDepartment returns all approved budgets for a department.
//
// NOTE: this used to return []models.Budget. The signature now returns the
// generated sqlc Budget rows. Handlers that previously consumed
// []models.Budget must adapt (or use a mapper).
func (bvs *BudgetValidationService) GetBudgetsByDepartment(department string) ([]sqlc.Budget, error) {
	ctx := context.Background()

	const query = `
		SELECT id, organization_id, owner_id, budget_code, department, department_id,
		       status, fiscal_year, total_budget, allocated_amount, remaining_amount,
		       approval_stage, approval_history, name, description, currency,
		       created_by, items, action_history, metadata, deleted_at, created_at,
		       updated_at
		FROM budgets
		WHERE department = $1
		  AND UPPER(status) = 'APPROVED'
		  AND deleted_at IS NULL
		ORDER BY fiscal_year DESC
	`
	rows, err := config.PgxDB.Query(ctx, query, department)
	if err != nil {
		return nil, fmt.Errorf("budget_validation: list budgets by department: %w", err)
	}
	defer rows.Close()

	var out []sqlc.Budget
	for rows.Next() {
		var b sqlc.Budget
		if err := rows.Scan(
			&b.ID, &b.OrganizationID, &b.OwnerID, &b.BudgetCode,
			&b.Department, &b.DepartmentID, &b.Status, &b.FiscalYear,
			&b.TotalBudget, &b.AllocatedAmount, &b.RemainingAmount,
			&b.ApprovalStage, &b.ApprovalHistory, &b.Name, &b.Description,
			&b.Currency, &b.CreatedBy, &b.Items, &b.ActionHistory,
			&b.Metadata, &b.DeletedAt, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("budget_validation: scan budget row: %w", err)
		}
		out = append(out, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("budget_validation: iterate budgets: %w", err)
	}
	return out, nil
}

// getBudgetConstraint retrieves constraint rules for a department.
//
// TODO: There is no sqlc query for budget_constraints. The table is expected
// to exist in production but is NOT in the local migration set. Raw SQL is
// used here.
func (bvs *BudgetValidationService) getBudgetConstraint(
	ctx context.Context,
	department, fiscalYear string,
) (*BudgetConstraint, error) {
	const query = `
		SELECT id, department, fiscal_year, max_budget, min_budget,
		       max_single_order, reserve_funds, requires_quote, quote_threshold,
		       created_at
		FROM budget_constraints
		WHERE department = $1 AND fiscal_year = $2
		LIMIT 1
	`
	var c BudgetConstraint
	err := config.PgxDB.QueryRow(ctx, query, department, fiscalYear).Scan(
		&c.ID, &c.Department, &c.FiscalYear, &c.MaxBudget, &c.MinBudget,
		&c.MaxSingleOrder, &c.ReserveFunds, &c.RequiresQuote, &c.QuoteThreshold,
		&c.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("budget_validation: get budget constraint: %w", err)
	}
	return &c, nil
}

// getVendorPOTotal calculates total PO amount for a vendor in a period.
//
// Note: the original GORM implementation filtered by vendor only and ignored
// (department, fiscal_year). We preserve that exact behaviour to avoid
// surprising callers.
func (bvs *BudgetValidationService) getVendorPOTotal(
	ctx context.Context,
	vendorID, _ /*department*/, _ /*fiscalYear*/ string,
) (float64, error) {
	const query = `
		SELECT COALESCE(SUM(total_amount), 0)
		FROM purchase_orders
		WHERE vendor_id = $1
		  AND UPPER(status) IN ('APPROVED', 'FULFILLED', 'COMPLETED')
		  AND deleted_at IS NULL
	`
	var total decimal.Decimal
	if err := config.PgxDB.QueryRow(ctx, query, vendorID).Scan(&total); err != nil {
		return 0, fmt.Errorf("budget_validation: get vendor PO total: %w", err)
	}
	out, _ := total.Float64()
	return out, nil
}

// CreateDefaultBudgetConstraints creates default constraints.
//
// Skips rows that already exist (by id). Uses raw SQL because there is no
// sqlc binding for budget_constraints.
func (bvs *BudgetValidationService) CreateDefaultBudgetConstraints() error {
	ctx := context.Background()

	constraints := []BudgetConstraint{
		{
			ID:             "constraint-it-2025",
			Department:     "IT",
			FiscalYear:     "2025",
			MaxBudget:      500000,
			MinBudget:      10000,
			MaxSingleOrder: 50000,
			ReserveFunds:   10,
			RequiresQuote:  true,
			QuoteThreshold: 25000,
		},
		{
			ID:             "constraint-hr-2025",
			Department:     "HR",
			FiscalYear:     "2025",
			MaxBudget:      300000,
			MinBudget:      5000,
			MaxSingleOrder: 30000,
			ReserveFunds:   15,
			RequiresQuote:  true,
			QuoteThreshold: 15000,
		},
		{
			ID:             "constraint-ops-2025",
			Department:     "Operations",
			FiscalYear:     "2025",
			MaxBudget:      750000,
			MinBudget:      20000,
			MaxSingleOrder: 100000,
			ReserveFunds:   10,
			RequiresQuote:  true,
			QuoteThreshold: 50000,
		},
	}

	const insertQuery = `
		INSERT INTO budget_constraints (
			id, department, fiscal_year, max_budget, min_budget,
			max_single_order, reserve_funds, requires_quote, quote_threshold,
			created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
		ON CONFLICT (id) DO NOTHING
	`

	for _, c := range constraints {
		if _, err := config.PgxDB.Exec(ctx, insertQuery,
			c.ID, c.Department, c.FiscalYear, c.MaxBudget, c.MinBudget,
			c.MaxSingleOrder, c.ReserveFunds, c.RequiresQuote, c.QuoteThreshold,
		); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation":   "create_budget_constraint",
				"department":  c.Department,
				"fiscal_year": c.FiscalYear,
			}).WithError(err).Error("failed_to_create_budget_constraint")
			return fmt.Errorf("budget_validation: create budget constraint: %w", err)
		}
	}

	return nil
}
