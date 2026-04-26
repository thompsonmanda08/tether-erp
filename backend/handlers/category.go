package handlers

import (
	"context"
	"errors"
	"time"

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

func sqlcCategoryToModel(c db.Category) models.Category {
	out := models.Category{
		ID:             c.ID,
		OrganizationID: c.OrganizationID,
		Name:           c.Name,
		Description:    strFromPtr(c.Description),
		Active:         boolFromPtr(c.Active),
	}
	if c.CreatedAt.Valid {
		out.CreatedAt = c.CreatedAt.Time
	}
	if c.UpdatedAt.Valid {
		out.UpdatedAt = c.UpdatedAt.Time
	}
	return out
}

func sqlcCategoryBudgetCodeToModel(m db.CategoryBudgetCode) models.CategoryBudgetCode {
	out := models.CategoryBudgetCode{
		ID:         m.ID,
		CategoryID: m.CategoryID,
		BudgetCode: m.BudgetCode,
		Active:     boolFromPtr(m.Active),
	}
	if m.CreatedAt.Valid {
		out.CreatedAt = m.CreatedAt.Time
	}
	if m.UpdatedAt.Valid {
		out.UpdatedAt = m.UpdatedAt.Time
	}
	return out
}

// GetCategories retrieves all categories with pagination and filtering
func GetCategories(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	active := c.Query("active")

	ctx := c.Context()
	offset := int32((page - 1) * limit)

	// Note: when tenant.OrganizationID is empty (super_admin context), sqlc
	// queries still scope to "$1 = '' OR organization_id = $1" depending on
	// the underlying SQL. Here we assume the queries enforce org scoping.
	total, err := config.Queries.CountCategories(ctx, db.CountCategoriesParams{
		OrganizationID: tenant.OrganizationID,
		Column2:        active,
		Column3:        "", // reserved
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to count categories", err)
	}

	rows, err := config.Queries.ListCategories(ctx, db.ListCategoriesParams{
		OrganizationID: tenant.OrganizationID,
		Column2:        active,
		Column3:        "", // reserved
		Limit:          int32(limit),
		Offset:         offset,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch categories", err)
	}

	responses := make([]types.CategoryResponse, 0, len(rows))
	for _, row := range rows {
		category := sqlcCategoryToModel(row)
		budgetCodes, _ := getCategoryBudgetCodes(ctx, category.ID)
		responses = append(responses, modelToCategoryResponse(category, budgetCodes))
	}

	return utils.SendPaginatedSuccess(c, responses, "Categories retrieved successfully", page, limit, total)
}

// CreateCategory creates a new category with budget code mappings
func CreateCategory(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	var req types.CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	if req.Name == "" || len(req.Name) < 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Category name is required and must be at least 3 characters",
		})
	}

	ctx := c.Context()

	if existing, err := config.Queries.GetCategoryByName(ctx, db.GetCategoryByNameParams{
		OrganizationID: tenant.OrganizationID,
		Name:           req.Name,
	}); err == nil && existing.ID != "" {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "Category with this name already exists in your organization",
		})
	}

	id := uuid.New().String()
	active := true
	row, err := config.Queries.CreateCategory(ctx, db.CreateCategoryParams{
		ID:             id,
		OrganizationID: tenant.OrganizationID,
		Name:           req.Name,
		Description:    strPtrOrNil(req.Description),
		Active:         &active,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to create category", err)
	}

	if len(req.BudgetCodes) > 0 {
		for _, bc := range req.BudgetCodes {
			activeMapping := true
			_, _ = config.Queries.CreateCategoryBudgetCode(ctx, db.CreateCategoryBudgetCodeParams{
				ID:         uuid.New().String(),
				CategoryID: id,
				BudgetCode: bc,
				Active:     &activeMapping,
			})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(types.DetailResponse{
		Success: true,
		Data:    modelToCategoryResponse(sqlcCategoryToModel(row), req.BudgetCodes),
	})
}

// GetCategory retrieves a single category by ID with its budget codes
func GetCategory(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Category ID is required",
		})
	}

	ctx := c.Context()
	row, err := config.Queries.GetCategoryByID(ctx, db.GetCategoryByIDParams{ID: id})
	if err != nil || row.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Category not found",
		})
	}

	budgetCodes, _ := getCategoryBudgetCodes(ctx, id)
	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    modelToCategoryResponse(sqlcCategoryToModel(row), budgetCodes),
	})
}

// UpdateCategory updates an existing category and its budget code mappings
func UpdateCategory(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Category ID is required",
		})
	}

	var req types.UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	current, err := config.Queries.GetCategoryByID(ctx, db.GetCategoryByIDParams{ID: id})
	if err != nil || current.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Category not found",
		})
	}

	if req.Name != "" {
		if len(req.Name) < 3 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Category name must be at least 3 characters",
			})
		}
		// Same-org name conflict check (excluding self)
		var conflictID string
		err := config.PgxDB.QueryRow(ctx,
			`SELECT id FROM categories WHERE name = $1 AND id != $2 AND organization_id = $3 AND deleted_at IS NULL LIMIT 1`,
			req.Name, id, tenant.OrganizationID,
		).Scan(&conflictID)
		if err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"message": "Category with this name already exists in your organization",
			})
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return utils.SendInternalError(c, "Failed to check name uniqueness", err)
		}
	}

	name := current.Name
	if req.Name != "" {
		name = req.Name
	}
	description := current.Description
	if req.Description != "" {
		description = &req.Description
	}
	active := current.Active
	if req.Active != nil {
		active = req.Active
	}

	row, err := config.Queries.UpdateCategory(ctx, db.UpdateCategoryParams{
		ID:          id,
		Name:        name,
		Description: description,
		Active:      active,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to update category", err)
	}

	budgetCodes := req.BudgetCodes
	if len(req.BudgetCodes) > 0 {
		// Remove existing mappings then re-create. There is no bulk-by-category
		// sqlc query, so use raw pgx.
		if _, err := config.PgxDB.Exec(ctx,
			`DELETE FROM category_budget_codes WHERE category_id = $1`, id,
		); err != nil {
			return utils.SendInternalError(c, "Failed to clear budget code mappings", err)
		}
		for _, bc := range req.BudgetCodes {
			activeMapping := true
			_, _ = config.Queries.CreateCategoryBudgetCode(ctx, db.CreateCategoryBudgetCodeParams{
				ID:         uuid.New().String(),
				CategoryID: id,
				BudgetCode: bc,
				Active:     &activeMapping,
			})
		}
	} else {
		budgetCodes, _ = getCategoryBudgetCodes(ctx, id)
	}

	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    modelToCategoryResponse(sqlcCategoryToModel(row), budgetCodes),
	})
}

// DeleteCategory soft deletes a category by setting Active to false
func DeleteCategory(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Category ID is required",
		})
	}

	ctx := c.Context()
	current, err := config.Queries.GetCategoryByID(ctx, db.GetCategoryByIDParams{ID: id})
	if err != nil || current.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Category not found",
		})
	}

	// Soft delete by setting active=false (preserve row, matches old behavior)
	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE categories SET active = false, updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	); err != nil {
		return utils.SendInternalError(c, "Failed to delete category", err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Category deleted successfully",
	})
}

// GetCategoryBudgetCodes retrieves all budget codes for a category
func GetCategoryBudgetCodes(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Category ID is required",
		})
	}

	ctx := c.Context()
	current, err := config.Queries.GetCategoryByID(ctx, db.GetCategoryByIDParams{ID: id})
	if err != nil || current.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Category not found",
		})
	}

	budgetCodes, err := getCategoryBudgetCodes(ctx, id)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch budget codes", err)
	}
	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    budgetCodes,
	})
}

// AddBudgetCodeToCategory adds a new budget code mapping to a category
func AddBudgetCodeToCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Category ID is required",
		})
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	ctx := c.Context()
	current, err := config.Queries.GetCategoryByID(ctx, db.GetCategoryByIDParams{ID: id})
	if err != nil || current.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Category not found",
		})
	}

	var req struct {
		BudgetCode string `json:"budgetCode" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}
	if req.BudgetCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Budget code is required",
		})
	}

	// Existing mapping check (no dedicated sqlc query, use raw pgx)
	var existingID string
	err = config.PgxDB.QueryRow(ctx,
		`SELECT id FROM category_budget_codes WHERE category_id = $1 AND budget_code = $2 LIMIT 1`,
		id, req.BudgetCode,
	).Scan(&existingID)
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "Budget code is already mapped to this category",
		})
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return utils.SendInternalError(c, "Failed to check existing mapping", err)
	}

	active := true
	row, err := config.Queries.CreateCategoryBudgetCode(ctx, db.CreateCategoryBudgetCodeParams{
		ID:         uuid.New().String(),
		CategoryID: id,
		BudgetCode: req.BudgetCode,
		Active:     &active,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to add budget code", err)
	}

	return c.Status(fiber.StatusCreated).JSON(types.DetailResponse{
		Success: true,
		Data:    modelToCategoryBudgetCodeResponse(sqlcCategoryBudgetCodeToModel(row)),
	})
}

// RemoveBudgetCodeFromCategory removes a budget code mapping from a category
func RemoveBudgetCodeFromCategory(c *fiber.Ctx) error {
	id := c.Params("id")
	budgetCode := c.Params("budgetCode")

	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Category ID is required",
		})
	}
	if budgetCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Budget code is required",
		})
	}

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	ctx := c.Context()
	current, err := config.Queries.GetCategoryByID(ctx, db.GetCategoryByIDParams{ID: id})
	if err != nil || current.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Category not found",
		})
	}

	tag, err := config.PgxDB.Exec(ctx,
		`DELETE FROM category_budget_codes WHERE category_id = $1 AND budget_code = $2`,
		id, budgetCode,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to remove budget code", err)
	}
	if tag.RowsAffected() == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Budget code mapping not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Budget code removed successfully",
	})
}

// getCategoryBudgetCodes retrieves all active budget codes for a given category ID.
func getCategoryBudgetCodes(ctx context.Context, categoryID string) ([]string, error) {
	rows, err := config.PgxDB.Query(ctx,
		`SELECT budget_code FROM category_budget_codes WHERE category_id = $1 AND active = true`,
		categoryID,
	)
	if err != nil {
		return []string{}, err
	}
	defer rows.Close()
	out := make([]string, 0)
	for rows.Next() {
		var bc string
		if err := rows.Scan(&bc); err != nil {
			return []string{}, err
		}
		out = append(out, bc)
	}
	return out, rows.Err()
}

// modelToCategoryResponse converts a Category model to a CategoryResponse
func modelToCategoryResponse(category models.Category, budgetCodes []string) types.CategoryResponse {
	if budgetCodes == nil {
		budgetCodes = []string{}
	}
	return types.CategoryResponse{
		ID:          category.ID,
		Name:        category.Name,
		Description: category.Description,
		BudgetCodes: budgetCodes,
		Active:      category.Active,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}
}

// modelToCategoryBudgetCodeResponse converts a CategoryBudgetCode model to a response
func modelToCategoryBudgetCodeResponse(mapping models.CategoryBudgetCode) types.CategoryBudgetCodeResponse {
	return types.CategoryBudgetCodeResponse{
		ID:         mapping.ID,
		CategoryID: mapping.CategoryID,
		BudgetCode: mapping.BudgetCode,
		Active:     mapping.Active,
		CreatedAt:  mapping.CreatedAt,
		UpdatedAt:  mapping.UpdatedAt,
	}
}
