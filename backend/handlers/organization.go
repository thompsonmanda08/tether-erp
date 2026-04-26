package handlers

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

// GetUserOrganizations returns all organizations a user belongs to
// GET /api/v1/organizations
func GetUserOrganizations(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_user_organizations_request")

	userID, ok := c.Locals("userID").(string)
	if !ok {
		logging.LogWarn(c, "user_context_missing")
		return utils.SendUnauthorizedError(c, "User context required")
	}

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation": "get_user_organizations",
		"user_id":   userID,
	})

	orgService := services.NewOrganizationService()
	orgs, err := orgService.GetUserOrganizations(userID)

	if err != nil {
		logging.LogError(c, err, "failed_to_fetch_organizations", map[string]interface{}{
			"error_type": "service_error",
		})
		return utils.SendInternalError(c, "Failed to fetch organizations", err)
	}

	if len(orgs) == 0 {
		orgs = []models.Organization{}
	}

	logger.Info("user_organizations_retrieved_successfully")

	return utils.SendSimpleSuccess(c, orgs, "Organizations retrieved successfully")
}

// CreateOrganization creates a new organization
// POST /api/v1/organizations
func CreateOrganization(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User context required")
	}

	var req struct {
		Name        string `json:"name" validate:"required"`
		Description string `json:"description"`
		LogoURL     string `json:"logoUrl"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	orgService := services.NewOrganizationService()
	org, err := orgService.CreateOrganization(req.Name, req.Description, req.LogoURL, userID)

	if err != nil {
		return utils.SendInternalError(c, err.Error(), err)
	}

	return utils.SendCreatedSuccess(c, org, "Organization created successfully")
}

// GetOrganizationByID returns organization details by ID
// GET /api/v1/organizations/:id
func GetOrganizationByID(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User context required")
	}

	orgID := c.Params("id")
	if orgID == "" {
		return utils.SendBadRequestError(c, "Organization ID is required")
	}

	orgService := services.NewOrganizationService()

	canManage, err := orgService.CanUserManageOrganization(userID, orgID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to verify permissions", err)
	}
	if !canManage {
		return utils.SendForbiddenError(c, "You don't have permission to view this organization")
	}

	org, err := orgService.GetOrganization(orgID)
	if err != nil {
		return utils.SendNotFoundError(c, "Organization not found")
	}

	return utils.SendSimpleSuccess(c, org, "Organization retrieved successfully")
}

// SwitchOrganization sets user's current organization
// POST /api/v1/organizations/:id/switch
func SwitchOrganization(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User context required")
	}

	orgID := c.Params("id")
	if orgID == "" {
		return utils.SendBadRequestError(c, "Organization ID is required")
	}

	orgService := services.NewOrganizationService()
	if err := orgService.SwitchOrganization(userID, orgID); err != nil {
		return utils.SendForbiddenError(c, "You do not have access to this organization")
	}

	return utils.SendSimpleSuccess(c, nil, "Organization switched successfully")
}

// GetOrganizationMembers returns all members of an organization
// Supports optional query params: search, role, active, page, page_size
// GET /api/v1/organization/members
func GetOrganizationMembers(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	search := c.Query("search")
	role := c.Query("role")
	activeStr := c.Query("active")
	page := c.QueryInt("page", 0)
	pageSize := c.QueryInt("page_size", 0)

	// If no pagination/filter params, fall back to existing service (preserves behavior for other callers)
	if page == 0 && pageSize == 0 && search == "" && role == "" && activeStr == "" {
		orgService := services.NewOrganizationService()
		members, err := orgService.GetOrganizationMembers(tenant.OrganizationID)
		if err != nil {
			return utils.SendInternalError(c, "Failed to fetch organization members", err)
		}
		if len(members) == 0 {
			members = []models.OrganizationMember{}
		}
		return utils.SendSimpleSuccess(c, members, "Members retrieved successfully")
	}

	// Paginated + filtered query — raw SQL via pgx
	page, pageSize = utils.NormalizePaginationParams(page, pageSize)
	offset := (page - 1) * pageSize

	ctx := c.Context()

	// Build WHERE clause incrementally with positional args
	args := []interface{}{tenant.OrganizationID}
	whereParts := []string{
		"organization_members.organization_id = $1",
		"users.deleted_at IS NULL",
	}

	if search != "" {
		args = append(args, "%"+search+"%")
		idx := len(args)
		whereParts = append(whereParts,
			fmt.Sprintf("(LOWER(users.name) LIKE LOWER($%d) OR LOWER(users.email) LIKE LOWER($%d))", idx, idx))
	}
	if role != "" {
		args = append(args, role)
		whereParts = append(whereParts, fmt.Sprintf("organization_members.role = $%d", len(args)))
	}
	if activeStr != "" {
		isActive := activeStr == "true" || activeStr == "1"
		args = append(args, isActive)
		whereParts = append(whereParts, fmt.Sprintf("organization_members.active = $%d", len(args)))
	}

	whereClause := strings.Join(whereParts, " AND ")

	// Count
	var total int64
	countSQL := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM organization_members
		INNER JOIN users ON users.id = organization_members.user_id
		WHERE %s`, whereClause)
	if err := config.PgxDB.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count organization members", err)
	}

	// Fetch with limit/offset
	args = append(args, pageSize, offset)
	listSQL := fmt.Sprintf(`
		SELECT
			organization_members.id,
			organization_members.user_id,
			organization_members.organization_id,
			organization_members.role,
			COALESCE(organization_departments.name, organization_members.department, '') as department,
			organization_members.department_id,
			organization_members.active as is_active,
			organization_members.joined_at,
			organization_members.created_at,
			organization_members.updated_at,
			users.name,
			users.email,
			users.last_login,
			COALESCE(users.position, '') as position,
			COALESCE(users.man_number, '') as man_number,
			COALESCE(users.nrc_number, '') as nrc_number,
			COALESCE(users.contact, '') as contact,
			users.preferences
		FROM organization_members
		INNER JOIN users ON users.id = organization_members.user_id
		LEFT JOIN organization_departments ON organization_departments.id = organization_members.department_id
		WHERE %s
		ORDER BY organization_members.created_at DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, len(args)-1, len(args))

	rows, err := config.PgxDB.Query(ctx, listSQL, args...)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch organization members", err)
	}
	defer rows.Close()

	results := make([]map[string]interface{}, 0)
	for rows.Next() {
		var (
			id, userID, orgID, mRole, dept          string
			departmentID                            *string
			isActive                                *bool
			joinedAt, createdAt, updatedAt          pgtype.Timestamptz
			name, email                             string
			lastLogin                               pgtype.Timestamptz
			position, manNumber, nrcNumber, contact string
			preferences                             []byte
		)
		if err := rows.Scan(
			&id, &userID, &orgID, &mRole, &dept, &departmentID, &isActive,
			&joinedAt, &createdAt, &updatedAt,
			&name, &email, &lastLogin,
			&position, &manNumber, &nrcNumber, &contact, &preferences,
		); err != nil {
			return utils.SendInternalError(c, "Failed to scan member row", err)
		}
		row := map[string]interface{}{
			"id":              id,
			"user_id":         userID,
			"organization_id": orgID,
			"role":            mRole,
			"department":      dept,
			"department_id":   departmentID,
			"is_active":       isActive,
			"joined_at":       nullableTime(joinedAt),
			"created_at":      nullableTime(createdAt),
			"updated_at":      nullableTime(updatedAt),
			"name":            name,
			"email":           email,
			"last_login":      nullableTime(lastLogin),
			"position":        position,
			"man_number":      manNumber,
			"nrc_number":      nrcNumber,
			"contact":         contact,
			"preferences":     preferences,
		}
		results = append(results, row)
	}
	if err := rows.Err(); err != nil {
		return utils.SendInternalError(c, "Failed to iterate member rows", err)
	}

	totalPages := int64(1)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}

	return c.Status(fiber.StatusOK).JSON(map[string]interface{}{
		"success": true,
		"message": "Members retrieved successfully",
		"data": map[string]interface{}{
			"members":     results,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

// AddOrganizationMember adds a user to an organization
// POST /api/v1/organization/members
func AddOrganizationMember(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	var req struct {
		UserID string `json:"userId" validate:"required"`
		Role   string `json:"role"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if req.Role == "" {
		req.Role = "requester"
	}

	orgService := services.NewOrganizationService()
	if err := orgService.AddMember(tenant.OrganizationID, req.UserID, req.Role); err != nil {
		return utils.SendInternalError(c, "Failed to add member", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Member added successfully")
}

// RemoveOrganizationMember removes a user from an organization
// DELETE /api/v1/organization/members/:userId
func RemoveOrganizationMember(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("userId")
	if userID == "" {
		return utils.SendBadRequestError(c, "User ID is required")
	}

	orgService := services.NewOrganizationService()
	if err := orgService.RemoveMember(tenant.OrganizationID, userID); err != nil {
		return utils.SendInternalError(c, "Failed to remove member", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Member removed successfully")
}

// GetOrganizationSettings retrieves organization settings
// GET /api/v1/organization/settings
func GetOrganizationSettings(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	orgService := services.NewOrganizationService()
	settings, err := orgService.GetOrganizationSettings(tenant.OrganizationID)

	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch organization settings", err)
	}

	return utils.SendSimpleSuccess(c, settings, "Settings retrieved successfully")
}

// UpdateOrganizationSettings updates organization settings
// PUT /api/v1/organization/settings
func UpdateOrganizationSettings(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	var settings struct {
		RequireDigitalSignatures bool    `json:"requireDigitalSignatures"`
		DefaultApprovalChain     string  `json:"defaultApprovalChain"`
		Currency                 string  `json:"currency"`
		FiscalYearStart          int     `json:"fiscalYearStart"`
		EnableBudgetValidation   bool    `json:"enableBudgetValidation"`
		BudgetVarianceThreshold  float64 `json:"budgetVarianceThreshold"`
		ProcurementFlow          string  `json:"procurementFlow"`
	}

	if err := c.BodyParser(&settings); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	orgService := services.NewOrganizationService()

	orgSettings := &models.OrganizationSettings{
		RequireDigitalSignatures: settings.RequireDigitalSignatures,
		DefaultApprovalChain:     settings.DefaultApprovalChain,
		Currency:                 settings.Currency,
		FiscalYearStart:          settings.FiscalYearStart,
		EnableBudgetValidation:   settings.EnableBudgetValidation,
		BudgetVarianceThreshold:  settings.BudgetVarianceThreshold,
		ProcurementFlow:          settings.ProcurementFlow,
	}

	if err := orgService.UpdateOrganizationSettings(tenant.OrganizationID, orgSettings); err != nil {
		return utils.SendInternalError(c, "Failed to update settings", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Settings updated successfully")
}

// UpdateOrganization updates organization details
// PUT /api/v1/organizations/:id
func UpdateOrganization(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User context required")
	}

	orgID := c.Params("id")
	if orgID == "" {
		return utils.SendBadRequestError(c, "Organization ID is required")
	}

	var req struct {
		Name        string  `json:"name" validate:"required"`
		Description string  `json:"description"`
		LogoURL     *string `json:"logoUrl"`
		Tagline     *string `json:"tagline"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	orgService := services.NewOrganizationService()

	canManage, err := orgService.CanUserManageOrganization(userID, orgID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to verify permissions", err)
	}
	if !canManage {
		return utils.SendForbiddenError(c, "You don't have permission to update this organization")
	}

	if err := orgService.UpdateOrganization(orgID, req.Name, req.Description, req.LogoURL, req.Tagline); err != nil {
		return utils.SendInternalError(c, err.Error(), err)
	}

	org, _ := orgService.GetOrganization(orgID)

	return utils.SendSimpleSuccess(c, org, "Organization updated successfully")
}

// DeleteOrganization soft deletes an organization
// DELETE /api/v1/organizations/:id
func DeleteOrganization(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User context required")
	}

	orgID := c.Params("id")
	if orgID == "" {
		return utils.SendBadRequestError(c, "Organization ID is required")
	}

	orgService := services.NewOrganizationService()

	canManage, err := orgService.CanUserManageOrganization(userID, orgID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to verify permissions", err)
	}
	if !canManage {
		return utils.SendForbiddenError(c, "You don't have permission to delete this organization")
	}

	if err := orgService.DeleteOrganization(orgID, userID); err != nil {
		return utils.SendInternalError(c, err.Error(), err)
	}

	return utils.SendSimpleSuccess(c, nil, "Organization deleted successfully")
}

// nullableTime returns t.Time if Valid, otherwise nil.
func nullableTime(t pgtype.Timestamptz) interface{} {
	if t.Valid {
		return t.Time
	}
	return nil
}
