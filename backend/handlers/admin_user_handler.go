package handlers

import (
	"errors"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

// CreateOrganizationUser creates a new user directly in the current organization.
// POST /api/v1/organization/users
func CreateOrganizationUser(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("admin_user_creation_attempt")
	ctx := c.Context()

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}
	creatorID, _ := c.Locals("userID").(string)

	var req struct {
		Email        string  `json:"email" validate:"required,email"`
		Password     string  `json:"password" validate:"required,min=8"`
		Name         string  `json:"name" validate:"required"`
		FirstName    string  `json:"first_name"`
		LastName     string  `json:"last_name"`
		Role         string  `json:"role"`
		DepartmentID string  `json:"department_id"`
		BranchID     *string `json:"branch_id"`
		Position     string  `json:"position"`
		ManNumber    string  `json:"manNumber"`
		NrcNumber    string  `json:"nrcNumber"`
		Contact      string  `json:"contact"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	if req.Email == "" {
		return utils.SendBadRequestError(c, "Email is required")
	}
	if req.Password == "" {
		return utils.SendBadRequestError(c, "Password is required")
	}
	if err := utils.ValidatePasswordStrength(req.Password); err != nil {
		return utils.SendBadRequestError(c, "Password validation failed: "+err.Error())
	}
	if req.Name == "" && req.FirstName == "" {
		return utils.SendBadRequestError(c, "Name or first name is required")
	}
	if req.Position == "" {
		return utils.SendBadRequestError(c, "Position is required")
	}
	if req.ManNumber == "" {
		return utils.SendBadRequestError(c, "Man Number is required")
	}
	if req.NrcNumber == "" {
		return utils.SendBadRequestError(c, "NRC Number is required")
	}
	if req.Contact == "" {
		return utils.SendBadRequestError(c, "Contact is required")
	}
	if req.Role == "" {
		req.Role = "requester"
	}
	if req.FirstName == "" && req.LastName == "" {
		req.FirstName = req.Name
	}

	if req.DepartmentID != "" {
		var deptCount int64
		_ = config.PgxDB.QueryRow(ctx,
			"SELECT COUNT(*) FROM organization_departments WHERE id = $1 AND organization_id = $2 AND is_active = true",
			req.DepartmentID, tenant.OrganizationID).Scan(&deptCount)
		if deptCount == 0 {
			return utils.SendBadRequestError(c, "Department not found in this organization")
		}
	}
	if req.BranchID != nil && *req.BranchID != "" {
		var branchCount int64
		_ = config.PgxDB.QueryRow(ctx,
			"SELECT COUNT(*) FROM organization_branches WHERE id = $1 AND organization_id = $2 AND is_active = true",
			*req.BranchID, tenant.OrganizationID).Scan(&branchCount)
		if branchCount == 0 {
			return utils.SendBadRequestError(c, "Branch not found in this organization")
		}
	}

	preCheckService := services.NewUserService()
	emailLookup, err := preCheckService.LookupUserByEmailForOrg(tenant.OrganizationID, req.Email)
	if err != nil {
		logging.LogError(c, err, "email_lookup_failed", nil)
		return utils.SendInternalError(c, "Failed to validate email", err)
	}
	if emailLookup.User != nil {
		if emailLookup.IsMember {
			return utils.SendConflictError(c, "This user is already a member of your organization")
		}
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "This email belongs to an existing Tether-ERP user",
			"code":    "email_already_exists",
			"data": fiber.Map{
				"userId": emailLookup.User.ID,
				"name":   emailLookup.User.Name,
				"email":  emailLookup.User.Email,
			},
		})
	}

	var manCount int64
	_ = config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM users u
		JOIN organization_members om ON om.user_id = u.id
		WHERE om.organization_id = $1 AND om.active = true AND u.man_number = $2 AND u.deleted_at IS NULL`,
		tenant.OrganizationID, req.ManNumber).Scan(&manCount)
	if manCount > 0 {
		return utils.SendConflictError(c, "A user with this Man Number already exists in this organization")
	}

	var nrcCount int64
	_ = config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM users u
		JOIN organization_members om ON om.user_id = u.id
		WHERE om.organization_id = $1 AND om.active = true AND u.nrc_number = $2 AND u.deleted_at IS NULL`,
		tenant.OrganizationID, req.NrcNumber).Scan(&nrcCount)
	if nrcCount > 0 {
		return utils.SendConflictError(c, "A user with this NRC Number already exists in this organization")
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		logging.LogError(c, err, "password_hashing_failed", nil)
		return utils.SendInternalError(c, "Failed to process password", err)
	}

	roleName := req.Role
	roleID := ""
	if _, err := uuid.Parse(req.Role); err == nil {
		roleID = req.Role
		roleService := services.NewRoleManagementService()
		role, err := roleService.GetOrganizationRole(req.Role)
		if err != nil {
			logging.LogError(c, err, "role_lookup_failed", map[string]interface{}{"role_id": req.Role})
			return utils.SendBadRequestError(c, "Invalid role ID")
		}
		roleName = role.Name
	}

	userID := uuid.New().String()
	now := time.Now()

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return utils.SendInternalError(c, "Failed to start transaction", err)
	}
	defer tx.Rollback(ctx)

	log.Printf("[CreateUser] creating user email=%s org=%s", req.Email, tenant.OrganizationID)
	_, err = tx.Exec(ctx, `
		INSERT INTO users (id, email, name, password, role, active, must_change_password, current_organization_id, position, man_number, nrc_number, contact, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, true, true, $6, $7, $8, $9, $10, $11, $11)`,
		userID, req.Email, req.Name, hashedPassword, roleName,
		tenant.OrganizationID, req.Position, req.ManNumber, req.NrcNumber, req.Contact, now,
	)
	if err != nil {
		logging.LogError(c, err, "user_creation_failed", map[string]interface{}{"email": req.Email})
		return utils.SendInternalError(c, "Failed to create user", err)
	}

	memberID := uuid.New().String()
	var deptValue interface{}
	if req.DepartmentID != "" {
		deptValue = req.DepartmentID
	}
	var branchValue interface{}
	if req.BranchID != nil && *req.BranchID != "" {
		branchValue = *req.BranchID
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO organization_members (id, organization_id, user_id, role, department_id, branch_id, active, joined_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7, $7)`,
		memberID, tenant.OrganizationID, userID, roleName, deptValue, branchValue, now,
	)
	if err != nil {
		logging.LogError(c, err, "organization_member_addition_failed", map[string]interface{}{
			"user_id":         userID,
			"organization_id": tenant.OrganizationID,
		})
		return utils.SendInternalError(c, "Failed to add user to organization", err)
	}

	if err := tx.Commit(ctx); err != nil {
		logging.LogError(c, err, "transaction_commit_failed", nil)
		return utils.SendInternalError(c, "Failed to complete user creation", err)
	}
	log.Printf("[CreateUser] committed user=%s email=%s org=%s", userID, req.Email, tenant.OrganizationID)

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"created_user_id":  userID,
		"created_by":       creatorID,
		"organization_id":  tenant.OrganizationID,
		"role":             roleName,
		"creation_success": true,
	})
	logger.Info("admin_user_creation_successful")

	userResponse := map[string]interface{}{
		"id":                 userID,
		"email":              req.Email,
		"name":               req.Name,
		"role":               roleName,
		"roleId":             roleID,
		"is_active":          true,
		"mustChangePassword": true,
		"createdAt":          now,
	}
	return utils.SendCreatedSuccess(c, userResponse, "User created successfully")
}

// GetOrganizationUsers returns all users in the current organization.
func GetOrganizationUsers(c *fiber.Ctx) error {
	return GetOrganizationMembers(c)
}

// UpdateOrganizationUser updates a user within the current organization.
// PUT /api/v1/organization/users/:id
func UpdateOrganizationUser(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	ctx := c.Context()

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}
	userID := c.Params("id")
	if userID == "" {
		return utils.SendBadRequestError(c, "User ID is required")
	}

	var req struct {
		Name         string  `json:"name"`
		Email        string  `json:"email"`
		Role         string  `json:"role"`
		DepartmentID string  `json:"department_id"`
		BranchID     *string `json:"branch_id"`
		Position     string  `json:"position"`
		ManNumber    string  `json:"manNumber"`
		NrcNumber    string  `json:"nrcNumber"`
		Contact      string  `json:"contact"`
		Status       string  `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	var memberCount int64
	_ = config.PgxDB.QueryRow(ctx,
		"SELECT COUNT(*) FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND active = true",
		tenant.OrganizationID, userID).Scan(&memberCount)
	if memberCount == 0 {
		return utils.SendNotFoundError(c, "User not found in this organization")
	}

	if req.ManNumber != "" {
		var manCount int64
		_ = config.PgxDB.QueryRow(ctx, `
			SELECT COUNT(*) FROM users u
			JOIN organization_members om ON om.user_id = u.id
			WHERE om.organization_id = $1 AND om.active = true AND u.man_number = $2 AND u.id != $3 AND u.deleted_at IS NULL`,
			tenant.OrganizationID, req.ManNumber, userID).Scan(&manCount)
		if manCount > 0 {
			return utils.SendConflictError(c, "A user with this Man Number already exists in this organization")
		}
	}

	if req.NrcNumber != "" {
		var nrcCount int64
		_ = config.PgxDB.QueryRow(ctx, `
			SELECT COUNT(*) FROM users u
			JOIN organization_members om ON om.user_id = u.id
			WHERE om.organization_id = $1 AND om.active = true AND u.nrc_number = $2 AND u.id != $3 AND u.deleted_at IS NULL`,
			tenant.OrganizationID, req.NrcNumber, userID).Scan(&nrcCount)
		if nrcCount > 0 {
			return utils.SendConflictError(c, "A user with this NRC Number already exists in this organization")
		}
	}

	if req.Email != "" {
		emailLookup, err := services.NewUserService().LookupUserByEmailForOrg(tenant.OrganizationID, req.Email)
		if err != nil {
			return utils.SendInternalError(c, "Failed to validate email", err)
		}
		if emailLookup.User != nil && emailLookup.User.ID != userID {
			if emailLookup.IsMember {
				return utils.SendConflictError(c, "This email belongs to another member of your organization")
			}
			return utils.SendConflictError(c, "This email is already registered on the platform")
		}
	}

	roleName := req.Role
	if roleName != "" {
		if _, err := uuid.Parse(roleName); err == nil {
			roleService := services.NewRoleManagementService()
			role, err := roleService.GetOrganizationRole(roleName)
			if err != nil {
				return utils.SendBadRequestError(c, "Invalid role ID")
			}
			roleName = role.Name
		}
	}

	// Build dynamic UPDATE for users
	setClauses := []string{}
	args := []interface{}{}
	add := func(col string, val interface{}) {
		args = append(args, val)
		setClauses = append(setClauses, col+" = $"+itoa(len(args)))
	}
	if req.Name != "" {
		add("name", req.Name)
	}
	if req.Email != "" {
		add("email", req.Email)
	}
	if roleName != "" {
		add("role", roleName)
	}
	if req.Position != "" {
		add("position", req.Position)
	}
	if req.ManNumber != "" {
		add("man_number", req.ManNumber)
	}
	if req.NrcNumber != "" {
		add("nrc_number", req.NrcNumber)
	}
	if req.Contact != "" {
		add("contact", req.Contact)
	}
	if req.Status == "active" {
		add("active", true)
	} else if req.Status == "inactive" {
		add("active", false)
	}

	if len(setClauses) > 0 {
		args = append(args, userID)
		q := "UPDATE users SET " + strings.Join(setClauses, ", ") + " WHERE id = $" + itoa(len(args))
		if _, err := config.PgxDB.Exec(ctx, q, args...); err != nil {
			logging.LogError(c, err, "org_user_update_failed", map[string]interface{}{"user_id": userID})
			return utils.SendInternalError(c, "Failed to update user", err)
		}
	}

	// Update department/role on org_members
	if req.DepartmentID != "" {
		_, err := config.PgxDB.Exec(ctx,
			"UPDATE organization_members SET department_id = $1, role = COALESCE(NULLIF($2, ''), role) WHERE organization_id = $3 AND user_id = $4",
			req.DepartmentID, roleName, tenant.OrganizationID, userID,
		)
		if err != nil {
			logging.LogError(c, err, "org_member_dept_update_failed", map[string]interface{}{"user_id": userID})
		}
	} else if roleName != "" {
		_, _ = config.PgxDB.Exec(ctx,
			"UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3",
			roleName, tenant.OrganizationID, userID,
		)
	}

	// Update branch if provided (nil = keep current; non-nil pointer = set or clear)
	if req.BranchID != nil {
		_, _ = config.PgxDB.Exec(ctx,
			"UPDATE organization_members SET branch_id = $1 WHERE organization_id = $2 AND user_id = $3",
			req.BranchID, tenant.OrganizationID, userID,
		)
	}

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":         userID,
		"organization_id": tenant.OrganizationID,
	})
	logger.Info("org_user_update_successful")

	return utils.SendSuccess(c, fiber.StatusOK, map[string]interface{}{"id": userID}, "User updated successfully", nil)
}

// itoa is a tiny shortcut for strconv.Itoa to keep dynamic-SQL builders compact.
func itoa(i int) string {
	// import-free path: build digit string manually for small ints
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	var buf [20]byte
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}

var _ = errors.Is // keep errors import if other helpers above use it (kept for parity with sibling files)
var _ = pgx.ErrNoRows
