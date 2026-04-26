package handlers

import (
	"errors"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// branchRowToModel converts a sqlc OrganizationBranch into the legacy models.OrganizationBranch
// shape used by the API surface.
func branchRowToModel(r db.OrganizationBranch) models.OrganizationBranch {
	out := models.OrganizationBranch{
		ID:             r.ID,
		OrganizationID: r.OrganizationID,
		Name:           r.Name,
		IsActive:       r.IsActive,
		ManagerID:      r.ManagerID,
	}
	if r.Code != nil {
		out.Code = *r.Code
	}
	if r.ProvinceID != nil {
		out.ProvinceID = *r.ProvinceID
	}
	if r.TownID != nil {
		out.TownID = *r.TownID
	}
	if r.Address != nil {
		out.Address = *r.Address
	}
	if r.CreatedAt.Valid {
		out.CreatedAt = r.CreatedAt.Time
	}
	if r.UpdatedAt.Valid {
		out.UpdatedAt = r.UpdatedAt.Time
	}
	return out
}

// GetBranches lists all branches for the tenant organization.
// GET /api/v1/branches
func GetBranches(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("page_size", 10)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	ctx := c.Context()

	// Build dynamic WHERE for optional province/town/is_active filters since sqlc's
	// ListBranches only supports is_active filtering.
	conds := []string{"organization_id = $1"}
	args := []interface{}{tenant.OrganizationID}
	idx := 2
	if provinceID := c.Query("province_id"); provinceID != "" {
		conds = append(conds, fmt.Sprintf("province_id = $%d", idx))
		args = append(args, provinceID)
		idx++
	}
	if townID := c.Query("town_id"); townID != "" {
		conds = append(conds, fmt.Sprintf("town_id = $%d", idx))
		args = append(args, townID)
		idx++
	}
	if isActive := c.Query("is_active"); isActive == "true" {
		conds = append(conds, "is_active = true")
	} else if isActive == "false" {
		conds = append(conds, "is_active = false")
	}

	where := strings.Join(conds, " AND ")

	// Total count
	var total int64
	countSQL := "SELECT COUNT(*) FROM organization_branches WHERE " + where
	if err := config.PgxDB.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count branches", err)
	}

	// Paginated select
	offset := (page - 1) * pageSize
	listSQL := "SELECT id, organization_id, name, code, province_id, town_id, address, manager_id, is_active, created_at, updated_at " +
		"FROM organization_branches WHERE " + where +
		fmt.Sprintf(" ORDER BY name ASC LIMIT $%d OFFSET $%d", idx, idx+1)
	args = append(args, pageSize, offset)

	rows, err := config.PgxDB.Query(ctx, listSQL, args...)
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve branches", err)
	}
	defer rows.Close()

	branches := make([]models.OrganizationBranch, 0, pageSize)
	for rows.Next() {
		var r db.OrganizationBranch
		if err := rows.Scan(
			&r.ID, &r.OrganizationID, &r.Name, &r.Code, &r.ProvinceID, &r.TownID,
			&r.Address, &r.ManagerID, &r.IsActive, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return utils.SendInternalError(c, "Failed to scan branches", err)
		}
		branches = append(branches, branchRowToModel(r))
	}
	if err := rows.Err(); err != nil {
		return utils.SendInternalError(c, "Failed to iterate branches", err)
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)
	return utils.SendSuccess(c, fiber.StatusOK, branches, "Branches retrieved successfully", &types.PaginationMeta{
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    int64(page) < totalPages,
		HasPrev:    page > 1,
	})
}

// GetBranch returns a single branch by ID.
// GET /api/v1/branches/:id
func GetBranch(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Branch ID is required")
	}

	row, err := config.Queries.GetBranchByID(c.Context(), db.GetBranchByIDParams{ID: id})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFoundError(c, "Branch not found")
		}
		return utils.SendInternalError(c, "Failed to retrieve branch", err)
	}
	if row.OrganizationID != tenant.OrganizationID {
		return utils.SendNotFoundError(c, "Branch not found")
	}

	return utils.SendSimpleSuccess(c, branchRowToModel(row), "Branch retrieved successfully")
}

// CreateBranch creates a new branch for the tenant organization.
// POST /api/v1/branches
func CreateBranch(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	var req struct {
		Name       string  `json:"name"`
		Code       string  `json:"code"`
		ProvinceID string  `json:"province_id"`
		TownID     string  `json:"town_id"`
		Address    string  `json:"address"`
		ManagerID  *string `json:"manager_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}
	if req.Name == "" {
		return utils.SendBadRequestError(c, "Branch name is required")
	}
	if req.Code == "" {
		return utils.SendBadRequestError(c, "Branch code is required")
	}
	if req.TownID == "" || req.ProvinceID == "" {
		return utils.SendBadRequestError(c, "Town ID and Province ID are required")
	}

	ctx := c.Context()

	// Ensure code is unique within the org
	codeArg := req.Code
	_, err = config.Queries.GetBranchByCode(ctx, db.GetBranchByCodeParams{
		OrganizationID: tenant.OrganizationID,
		Code:           &codeArg,
	})
	if err == nil {
		return utils.SendConflictError(c, "A branch with this code already exists")
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return utils.SendInternalError(c, "Failed to validate branch code", err)
	}

	provinceID := req.ProvinceID
	townID := req.TownID
	address := req.Address

	row, err := config.Queries.CreateBranch(ctx, db.CreateBranchParams{
		ID:             uuid.New().String(),
		OrganizationID: tenant.OrganizationID,
		Name:           req.Name,
		Code:           &codeArg,
		ProvinceID:     &provinceID,
		TownID:         &townID,
		Address:        &address,
		ManagerID:      req.ManagerID,
		IsActive:       true,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to create branch", err)
	}

	return utils.SendCreatedSuccess(c, branchRowToModel(row), "Branch created successfully")
}

// UpdateBranch updates an existing branch.
// PUT /api/v1/branches/:id
func UpdateBranch(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Branch ID is required")
	}

	var req struct {
		Name       string  `json:"name"`
		Code       string  `json:"code"`
		ProvinceID string  `json:"province_id"`
		TownID     string  `json:"town_id"`
		Address    string  `json:"address"`
		ManagerID  *string `json:"manager_id"`
		IsActive   *bool   `json:"is_active"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	ctx := c.Context()

	// Verify branch exists and is in tenant's org
	existing, err := config.Queries.GetBranchByID(ctx, db.GetBranchByIDParams{ID: id})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFoundError(c, "Branch not found")
		}
		return utils.SendInternalError(c, "Failed to retrieve branch", err)
	}
	if existing.OrganizationID != tenant.OrganizationID {
		return utils.SendNotFoundError(c, "Branch not found")
	}

	// sqlc UpdateBranch uses COALESCE so nil pointers preserve existing values.
	params := db.UpdateBranchParams{
		ID:        id,
		Name:      req.Name, // empty string -> COALESCE keeps original (text NULL is what column defaults to; assume non-null)
		Code:      existing.Code,
		IsActive:  existing.IsActive,
		ManagerID: existing.ManagerID,
	}
	if req.Code != "" {
		c2 := req.Code
		params.Code = &c2
	}
	if req.ProvinceID != "" {
		v := req.ProvinceID
		params.ProvinceID = &v
	} else {
		params.ProvinceID = existing.ProvinceID
	}
	if req.TownID != "" {
		v := req.TownID
		params.TownID = &v
	} else {
		params.TownID = existing.TownID
	}
	if req.Address != "" {
		v := req.Address
		params.Address = &v
	} else {
		params.Address = existing.Address
	}
	if req.ManagerID != nil {
		params.ManagerID = req.ManagerID
	}
	if req.IsActive != nil {
		params.IsActive = *req.IsActive
	}
	if req.Name == "" {
		params.Name = existing.Name
	}

	row, err := config.Queries.UpdateBranch(ctx, params)
	if err != nil {
		return utils.SendInternalError(c, "Failed to update branch", err)
	}

	return utils.SendSimpleSuccess(c, branchRowToModel(row), "Branch updated successfully")
}

// DeleteBranch deletes a branch (hard delete).
// DELETE /api/v1/branches/:id
func DeleteBranch(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequestError(c, "Branch ID is required")
	}

	ctx := c.Context()

	existing, err := config.Queries.GetBranchByID(ctx, db.GetBranchByIDParams{ID: id})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFoundError(c, "Branch not found")
		}
		return utils.SendInternalError(c, "Failed to retrieve branch", err)
	}
	if existing.OrganizationID != tenant.OrganizationID {
		return utils.SendNotFoundError(c, "Branch not found")
	}

	if err := config.Queries.DeleteBranch(ctx, db.DeleteBranchParams{ID: id}); err != nil {
		return utils.SendInternalError(c, "Failed to delete branch", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Branch deleted successfully")
}
