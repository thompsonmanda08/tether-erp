package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// AdminPermission represents a system permission for the admin console
type AdminPermission struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// AllAdminPermissions defines the static permission list
var AllAdminPermissions = []AdminPermission{
	{ID: "users.view", Name: "users.view", DisplayName: "View Users", Description: "View user list and details", Category: "Users"},
	{ID: "users.create", Name: "users.create", DisplayName: "Create Users", Description: "Create new users", Category: "Users"},
	{ID: "users.edit", Name: "users.edit", DisplayName: "Edit Users", Description: "Edit user profiles and roles", Category: "Users"},
	{ID: "users.delete", Name: "users.delete", DisplayName: "Delete Users", Description: "Delete or deactivate users", Category: "Users"},
	{ID: "organizations.view", Name: "organizations.view", DisplayName: "View Organizations", Description: "View organization list and details", Category: "Organizations"},
	{ID: "organizations.create", Name: "organizations.create", DisplayName: "Create Organizations", Description: "Create new organizations", Category: "Organizations"},
	{ID: "organizations.edit", Name: "organizations.edit", DisplayName: "Edit Organizations", Description: "Edit organization settings", Category: "Organizations"},
	{ID: "organizations.delete", Name: "organizations.delete", DisplayName: "Delete Organizations", Description: "Delete organizations", Category: "Organizations"},
	{ID: "organizations.manage", Name: "organizations.manage", DisplayName: "Manage Organizations", Description: "Manage organization members and settings", Category: "Organizations"},
	{ID: "budgets.view", Name: "budgets.view", DisplayName: "View Budgets", Description: "View budget documents", Category: "Budgets"},
	{ID: "budgets.create", Name: "budgets.create", DisplayName: "Create Budgets", Description: "Create budget documents", Category: "Budgets"},
	{ID: "budgets.edit", Name: "budgets.edit", DisplayName: "Edit Budgets", Description: "Edit budget documents", Category: "Budgets"},
	{ID: "budgets.approve", Name: "budgets.approve", DisplayName: "Approve Budgets", Description: "Approve or reject budgets", Category: "Budgets"},
	{ID: "requisitions.view", Name: "requisitions.view", DisplayName: "View Requisitions", Description: "View requisition documents", Category: "Requisitions"},
	{ID: "requisitions.create", Name: "requisitions.create", DisplayName: "Create Requisitions", Description: "Create requisition documents", Category: "Requisitions"},
	{ID: "requisitions.edit", Name: "requisitions.edit", DisplayName: "Edit Requisitions", Description: "Edit requisition documents", Category: "Requisitions"},
	{ID: "requisitions.approve", Name: "requisitions.approve", DisplayName: "Approve Requisitions", Description: "Approve or reject requisitions", Category: "Requisitions"},
	{ID: "purchase_orders.view", Name: "purchase_orders.view", DisplayName: "View Purchase Orders", Description: "View purchase orders", Category: "Purchase Orders"},
	{ID: "purchase_orders.create", Name: "purchase_orders.create", DisplayName: "Create Purchase Orders", Description: "Create purchase orders", Category: "Purchase Orders"},
	{ID: "purchase_orders.edit", Name: "purchase_orders.edit", DisplayName: "Edit Purchase Orders", Description: "Edit purchase orders", Category: "Purchase Orders"},
	{ID: "purchase_orders.approve", Name: "purchase_orders.approve", DisplayName: "Approve Purchase Orders", Description: "Approve or reject purchase orders", Category: "Purchase Orders"},
	{ID: "payments.view", Name: "payments.view", DisplayName: "View Payments", Description: "View payment vouchers", Category: "Payments"},
	{ID: "payments.create", Name: "payments.create", DisplayName: "Create Payments", Description: "Create payment vouchers", Category: "Payments"},
	{ID: "payments.approve", Name: "payments.approve", DisplayName: "Approve Payments", Description: "Approve or reject payments", Category: "Payments"},
	{ID: "reports.view", Name: "reports.view", DisplayName: "View Reports", Description: "View analytics and reports", Category: "Reports"},
	{ID: "reports.export", Name: "reports.export", DisplayName: "Export Reports", Description: "Export reports and data", Category: "Reports"},
	{ID: "settings.view", Name: "settings.view", DisplayName: "View Settings", Description: "View system settings", Category: "Settings"},
	{ID: "settings.edit", Name: "settings.edit", DisplayName: "Edit Settings", Description: "Modify system settings", Category: "Settings"},
	{ID: "workflows.view", Name: "workflows.view", DisplayName: "View Workflows", Description: "View workflow definitions", Category: "Workflows"},
	{ID: "workflows.create", Name: "workflows.create", DisplayName: "Create Workflows", Description: "Create workflow definitions", Category: "Workflows"},
	{ID: "workflows.edit", Name: "workflows.edit", DisplayName: "Edit Workflows", Description: "Edit workflow definitions", Category: "Workflows"},
	{ID: "workflows.delete", Name: "workflows.delete", DisplayName: "Delete Workflows", Description: "Delete workflow definitions", Category: "Workflows"},
	{ID: "audit.view", Name: "audit.view", DisplayName: "View Audit Logs", Description: "View audit trail", Category: "Audit"},
}

func titleCase(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func formatPermissionName(pid string) string {
	if parts := strings.SplitN(pid, ":", 2); len(parts) == 2 {
		resource := strings.ReplaceAll(parts[0], "_", " ")
		action := strings.ReplaceAll(parts[1], "_", " ")
		return titleCase(resource) + " " + titleCase(action)
	}
	if parts := strings.SplitN(pid, ".", 2); len(parts) == 2 {
		resource := strings.ReplaceAll(parts[0], "_", " ")
		action := strings.ReplaceAll(parts[1], "_", " ")
		return titleCase(resource) + " " + titleCase(action)
	}
	return pid
}

func formatPermissionCategory(pid string) string {
	if parts := strings.SplitN(pid, ":", 2); len(parts) == 2 {
		return titleCase(strings.ReplaceAll(parts[0], "_", " "))
	}
	if parts := strings.SplitN(pid, ".", 2); len(parts) == 2 {
		return titleCase(strings.ReplaceAll(parts[0], "_", " "))
	}
	return "General"
}

// roleRow holds raw scanned columns from organization_roles + a computed user_count.
type roleRow struct {
	ID             string
	OrganizationID *string
	Name           string
	Description    *string
	IsSystemRole   bool
	Permissions    []byte
	Active         bool
	CreatedBy      *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	UserCount      int64
}

func (r *roleRow) toMap() map[string]interface{} {
	m := map[string]interface{}{
		"id":              r.ID,
		"organization_id": r.OrganizationID,
		"name":            r.Name,
		"description":     r.Description,
		"is_system_role":  r.IsSystemRole,
		"permissions":     r.Permissions,
		"active":          r.Active,
		"is_active":       r.Active,
		"display_name":    titleCase(r.Name),
		"created_by":      r.CreatedBy,
		"created_at":      r.CreatedAt,
		"updated_at":      r.UpdatedAt,
		"user_count":      r.UserCount,
	}
	return m
}

// roleToFrontend transforms a role map (e.g. from roleRow.toMap) into the shape the UI expects.
func roleToFrontend(role map[string]interface{}) map[string]interface{} {
	if active, ok := role["active"]; ok {
		role["is_active"] = active
	}
	if _, ok := role["display_name"]; !ok {
		if name, ok := role["name"].(string); ok {
			role["display_name"] = titleCase(name)
		}
	}

	if permRaw, ok := role["permissions"]; ok && permRaw != nil {
		var permIDs []string
		switch v := permRaw.(type) {
		case string:
			_ = json.Unmarshal([]byte(v), &permIDs)
		case []byte:
			_ = json.Unmarshal(v, &permIDs)
		case json.RawMessage:
			_ = json.Unmarshal(v, &permIDs)
		}

		permissions := make([]map[string]interface{}, 0)
		for _, pid := range permIDs {
			found := false
			for _, ap := range AllAdminPermissions {
				if ap.ID == pid {
					permissions = append(permissions, map[string]interface{}{
						"id":                   ap.ID,
						"name":                 ap.Name,
						"display_name":         ap.DisplayName,
						"description":          ap.Description,
						"resource":             ap.Category,
						"action":               ap.Name,
						"category":             ap.Category,
						"is_system_permission": true,
					})
					found = true
					break
				}
			}
			if !found && pid != "" {
				category := formatPermissionCategory(pid)
				permissions = append(permissions, map[string]interface{}{
					"id":                   pid,
					"name":                 pid,
					"display_name":         formatPermissionName(pid),
					"description":          "",
					"resource":             category,
					"action":               pid,
					"category":             category,
					"is_system_permission": false,
				})
			}
		}
		role["permissions"] = permissions
	} else {
		role["permissions"] = []interface{}{}
	}
	return role
}

func toInt64(v interface{}) int64 {
	switch n := v.(type) {
	case int64:
		return n
	case int:
		return int64(n)
	case int32:
		return int64(n)
	case float64:
		return int64(n)
	case float32:
		return int64(n)
	default:
		return 0
	}
}

const roleSelect = `
	SELECT r.id, r.organization_id, r.name, r.description, r.is_system_role, r.permissions, r.active, r.created_by, r.created_at, r.updated_at,
		(SELECT COUNT(*) FROM user_organization_roles uor WHERE uor.role_id = r.id AND uor.active = true) as user_count
	FROM organization_roles r`

func scanRoleRow(rows pgx.Rows) (*roleRow, error) {
	var r roleRow
	if err := rows.Scan(&r.ID, &r.OrganizationID, &r.Name, &r.Description, &r.IsSystemRole, &r.Permissions, &r.Active, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt, &r.UserCount); err != nil {
		return nil, err
	}
	return &r, nil
}

// AdminGetAllRoles returns all roles with filters.
func AdminGetAllRoles(c *fiber.Ctx) error {
	ctx := c.Context()
	search := c.Query("search")
	isActiveQ := c.Query("is_active")
	isSystemRole := c.Query("is_system_role")
	adminOnly := c.Query("admin_only")

	conds := []string{}
	args := []interface{}{}
	add := func(cnd string, a ...interface{}) {
		for _, v := range a {
			args = append(args, v)
			cnd = strings.Replace(cnd, "?", "$"+strconv.Itoa(len(args)), 1)
		}
		conds = append(conds, cnd)
	}

	if search != "" {
		searchTerm := "%" + search + "%"
		add("(LOWER(r.name) LIKE LOWER(?) OR LOWER(COALESCE(r.description, '')) LIKE LOWER(?))", searchTerm, searchTerm)
	}
	if isActiveQ == "false" {
		add("r.active = ?", false)
	} else {
		add("r.active = ?", true)
	}
	if isSystemRole == "true" {
		add("r.is_system_role = ?", true)
	} else if isSystemRole == "false" {
		add("r.is_system_role = ?", false)
	}
	if adminOnly == "true" {
		add("(r.is_system_role = ? OR r.name IN ('admin', 'super_admin', 'compliance_officer'))", true)
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}
	q := roleSelect + where + " ORDER BY r.is_system_role DESC, r.name ASC"

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		log.Printf("Error getting roles: %v", err)
		return utils.SendInternalError(c, "Failed to retrieve roles", err)
	}
	defer rows.Close()

	roles := []map[string]interface{}{}
	for rows.Next() {
		r, err := scanRoleRow(rows)
		if err != nil {
			return utils.SendInternalError(c, "Failed to scan role", err)
		}
		roles = append(roles, roleToFrontend(r.toMap()))
	}
	return utils.SendSimpleSuccess(c, roles, "Roles retrieved successfully")
}

func AdminGetRoleStats(c *fiber.Ctx) error {
	ctx := c.Context()
	var totalRoles, activeRoles, systemRoles, customRoles, usersWithRoles int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organization_roles").Scan(&totalRoles)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organization_roles WHERE active = true").Scan(&activeRoles)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organization_roles WHERE is_system_role = true AND organization_id IS NULL").Scan(&systemRoles)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organization_roles WHERE is_system_role = false").Scan(&customRoles)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(DISTINCT user_id) FROM user_organization_roles WHERE active = true").Scan(&usersWithRoles)

	roleDistribution := []map[string]interface{}{}
	rows, err := config.PgxDB.Query(ctx, `SELECT r.id, r.name, (SELECT COUNT(*) FROM user_organization_roles uor WHERE uor.role_id = r.id AND uor.active = true) as user_count FROM organization_roles r WHERE r.active = true`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var rid, rname string
			var ucount int64
			if err := rows.Scan(&rid, &rname, &ucount); err == nil {
				roleDistribution = append(roleDistribution, map[string]interface{}{
					"role_id":    rid,
					"role_name":  rname,
					"user_count": ucount,
				})
			}
		}
	}

	var totalAssignments int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM user_organization_roles WHERE active = true").Scan(&totalAssignments)

	for i := range roleDistribution {
		if totalAssignments > 0 {
			count := toInt64(roleDistribution[i]["user_count"])
			roleDistribution[i]["percentage"] = float64(count) / float64(totalAssignments) * 100
		} else {
			roleDistribution[i]["percentage"] = 0
		}
	}

	stats := map[string]interface{}{
		"total_roles":           totalRoles,
		"active_roles":          activeRoles,
		"system_roles":          systemRoles,
		"custom_roles":          customRoles,
		"total_permissions":     len(AllAdminPermissions),
		"roles_with_users":      usersWithRoles,
		"most_used_permissions": []interface{}{},
		"role_distribution":     roleDistribution,
	}
	return utils.SendSimpleSuccess(c, stats, "Role statistics retrieved successfully")
}

func AdminGetRoleById(c *fiber.Ctx) error {
	roleID := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), roleSelect+" WHERE r.id = $1", roleID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to load role", err)
	}
	defer rows.Close()
	if !rows.Next() {
		return utils.SendNotFound(c, "Role not found")
	}
	r, err := scanRoleRow(rows)
	if err != nil {
		return utils.SendInternalError(c, "Failed to scan role", err)
	}
	return utils.SendSimpleSuccess(c, roleToFrontend(r.toMap()), "Role retrieved successfully")
}

func AdminCreateRole(c *fiber.Ctx) error {
	var request struct {
		Name          string   `json:"name"`
		DisplayName   string   `json:"display_name"`
		Description   string   `json:"description"`
		PermissionIDs []string `json:"permission_ids"`
		IsActive      bool     `json:"is_active"`
	}
	if err := c.BodyParser(&request); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if request.Name == "" {
		return utils.SendBadRequest(c, "Role name is required")
	}

	permissionsJSON, _ := json.Marshal(request.PermissionIDs)
	adminUserID, _ := c.Locals("userID").(string)
	id := uuid.New().String()
	now := time.Now()

	_, err := config.PgxDB.Exec(c.Context(), `
		INSERT INTO organization_roles (id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at)
		VALUES ($1, NULL, $2, $3, false, $4, $5, $6, $7, $7)`,
		id, request.Name, request.Description, permissionsJSON, request.IsActive, adminUserID, now,
	)
	if err != nil {
		log.Printf("Error creating role: %v", err)
		return utils.SendInternalError(c, "Failed to create role", err)
	}

	role := map[string]interface{}{
		"id":              id,
		"organization_id": nil,
		"name":            request.Name,
		"description":     request.Description,
		"is_system_role":  false,
		"permissions":     json.RawMessage(permissionsJSON),
		"active":          request.IsActive,
		"created_by":      adminUserID,
		"created_at":      now,
		"updated_at":      now,
	}
	return utils.SendCreatedSuccess(c, role, "Role created successfully")
}

func AdminUpdateRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	ctx := c.Context()

	var isSystem bool
	if err := config.PgxDB.QueryRow(ctx, "SELECT is_system_role FROM organization_roles WHERE id = $1", roleID).Scan(&isSystem); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Role not found")
		}
		return utils.SendInternalError(c, "Failed to load role", err)
	}
	if isSystem {
		userRole, _ := c.Locals("userRole").(string)
		if userRole != "super_admin" {
			return utils.SendBadRequest(c, "Only super admins can modify system roles")
		}
	}

	var request struct {
		Name          *string  `json:"name,omitempty"`
		DisplayName   *string  `json:"display_name,omitempty"`
		Description   *string  `json:"description,omitempty"`
		PermissionIDs []string `json:"permission_ids,omitempty"`
		IsActive      *bool    `json:"is_active,omitempty"`
	}
	if err := c.BodyParser(&request); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}

	setClauses := []string{"updated_at = $1"}
	args := []interface{}{time.Now()}
	add := func(col string, val interface{}) {
		args = append(args, val)
		setClauses = append(setClauses, col+" = $"+strconv.Itoa(len(args)))
	}
	if request.Name != nil {
		add("name", *request.Name)
	}
	if request.Description != nil {
		add("description", *request.Description)
	}
	if request.PermissionIDs != nil {
		permissionsJSON, _ := json.Marshal(request.PermissionIDs)
		add("permissions", permissionsJSON)
	}
	if request.IsActive != nil {
		add("active", *request.IsActive)
	}

	args = append(args, roleID)
	q := "UPDATE organization_roles SET " + strings.Join(setClauses, ", ") + " WHERE id = $" + strconv.Itoa(len(args))
	if _, err := config.PgxDB.Exec(ctx, q, args...); err != nil {
		return utils.SendInternalError(c, "Failed to update role", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": roleID}, "Role updated successfully")
}

func AdminDeleteRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	ctx := c.Context()

	var isSystem bool
	_ = config.PgxDB.QueryRow(ctx, "SELECT is_system_role FROM organization_roles WHERE id = $1", roleID).Scan(&isSystem)
	if isSystem {
		return utils.SendBadRequest(c, "Cannot delete system roles")
	}

	var assignedCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM user_organization_roles WHERE role_id = $1 AND active = true", roleID).Scan(&assignedCount)
	if assignedCount > 0 {
		return utils.SendBadRequest(c, "Cannot delete role with assigned users. Remove users from this role first.")
	}

	if _, err := config.PgxDB.Exec(ctx, "UPDATE organization_roles SET active = false, updated_at = $1 WHERE id = $2", time.Now(), roleID); err != nil {
		return utils.SendInternalError(c, "Failed to delete role", err)
	}
	return utils.SendSimpleSuccess(c, nil, "Role deleted successfully")
}

func AdminGetAllPermissions(c *fiber.Ctx) error {
	return utils.SendSimpleSuccess(c, AllAdminPermissions, "Permissions retrieved successfully")
}

func AdminGetPermissionsByCategory(c *fiber.Ctx) error {
	grouped := make(map[string][]AdminPermission)
	for _, perm := range AllAdminPermissions {
		grouped[perm.Category] = append(grouped[perm.Category], perm)
	}
	return utils.SendSimpleSuccess(c, grouped, "Permissions by category retrieved successfully")
}

func AdminGetRoleUsers(c *fiber.Ctx) error {
	roleID := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT uor.id as assignment_id, uor.user_id, u.name as user_name, u.email as user_email,
			uor.organization_id, COALESCE(o.name, '') as organization_name, uor.assigned_at, uor.active
		FROM user_organization_roles uor
		LEFT JOIN users u ON u.id = uor.user_id
		LEFT JOIN organizations o ON o.id = uor.organization_id
		WHERE uor.role_id = $1 AND uor.active = true`, roleID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve role users", err)
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var (
			assignmentID, userID, orgName string
			orgID                         *string
			userName, userEmail           *string
			assignedAt                    *time.Time
			active                        bool
		)
		if err := rows.Scan(&assignmentID, &userID, &userName, &userEmail, &orgID, &orgName, &assignedAt, &active); err != nil {
			return utils.SendInternalError(c, "Failed to scan user", err)
		}
		users = append(users, map[string]interface{}{
			"assignment_id":     assignmentID,
			"user_id":           userID,
			"user_name":         userName,
			"user_email":        userEmail,
			"organization_id":   orgID,
			"organization_name": orgName,
			"assigned_at":       assignedAt,
			"active":            active,
		})
	}
	return utils.SendSimpleSuccess(c, users, "Role users retrieved successfully")
}

func AdminAssignRoleToUsers(c *fiber.Ctx) error {
	roleID := c.Params("id")
	ctx := c.Context()

	var request struct {
		UserIDs []string `json:"user_ids"`
	}
	if err := c.BodyParser(&request); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if len(request.UserIDs) == 0 {
		return utils.SendBadRequest(c, "At least one user ID is required")
	}

	adminUserID, _ := c.Locals("userID").(string)
	now := time.Now()

	for _, userID := range request.UserIDs {
		var existingCount int64
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM user_organization_roles WHERE user_id = $1 AND role_id = $2 AND active = true", userID, roleID).Scan(&existingCount)
		if existingCount > 0 {
			continue
		}
		// NOTE: organization_id is NOT NULL per migration, but for system-level
		// assignments we have no org. We use empty string as a sentinel here.
		// TODO: confirm correct value (or migration change to allow NULL).
		_, _ = config.PgxDB.Exec(ctx, `
			INSERT INTO user_organization_roles (id, user_id, organization_id, role_id, assigned_by, assigned_at, active)
			VALUES ($1, $2, '', $3, $4, $5, true)`,
			uuid.New().String(), userID, roleID, adminUserID, now,
		)
	}

	return utils.SendSimpleSuccess(c, nil, "Role assigned to users successfully")
}

func AdminRemoveRoleFromUsers(c *fiber.Ctx) error {
	roleID := c.Params("id")

	var request struct {
		UserIDs []string `json:"user_ids"`
	}
	if err := c.BodyParser(&request); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if len(request.UserIDs) == 0 {
		return utils.SendBadRequest(c, "At least one user ID is required")
	}

	_, err := config.PgxDB.Exec(c.Context(),
		"UPDATE user_organization_roles SET active = false WHERE role_id = $1 AND user_id = ANY($2) AND active = true",
		roleID, request.UserIDs,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to remove role from users", err)
	}
	return utils.SendSimpleSuccess(c, nil, "Role removed from users successfully")
}

func AdminCloneRole(c *fiber.Ctx) error {
	roleID := c.Params("id")
	ctx := c.Context()

	var request struct {
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
	}
	if err := c.BodyParser(&request); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if request.Name == "" {
		return utils.SendBadRequest(c, "Name is required for cloned role")
	}

	var description *string
	var permissions []byte
	err := config.PgxDB.QueryRow(ctx, "SELECT description, permissions FROM organization_roles WHERE id = $1", roleID).
		Scan(&description, &permissions)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Original role not found")
		}
		return utils.SendInternalError(c, "Failed to load role", err)
	}

	adminUserID, _ := c.Locals("userID").(string)
	id := uuid.New().String()
	now := time.Now()

	_, err = config.PgxDB.Exec(ctx, `
		INSERT INTO organization_roles (id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at)
		VALUES ($1, NULL, $2, $3, false, $4, true, $5, $6, $6)`,
		id, request.Name, description, permissions, adminUserID, now,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to clone role", err)
	}

	cloned := map[string]interface{}{
		"id":              id,
		"organization_id": nil,
		"name":            request.Name,
		"description":     description,
		"is_system_role":  false,
		"permissions":     json.RawMessage(permissions),
		"active":          true,
		"created_by":      adminUserID,
		"created_at":      now,
		"updated_at":      now,
	}
	return utils.SendCreatedSuccess(c, cloned, "Role cloned successfully")
}

func AdminExportRoles(c *fiber.Ctx) error {
	ctx := c.Context()

	conds := []string{}
	args := []interface{}{}
	if search := c.Query("search"); search != "" {
		args = append(args, "%"+search+"%", "%"+search+"%")
		conds = append(conds, "(name ILIKE $1 OR COALESCE(description, '') ILIKE $2)")
	}
	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	rows, err := config.PgxDB.Query(ctx, roleSelect+where+" ORDER BY r.created_at DESC LIMIT 10000", args...)
	if err != nil {
		log.Printf("Error exporting roles: %v", err)
		return utils.SendInternalError(c, "Failed to export roles", err)
	}
	defer rows.Close()

	enrichedRoles := []map[string]interface{}{}
	for rows.Next() {
		r, err := scanRoleRow(rows)
		if err != nil {
			return utils.SendInternalError(c, "Failed to scan role", err)
		}
		enrichedRoles = append(enrichedRoles, roleToFrontend(r.toMap()))
	}

	exportData := map[string]interface{}{
		"roles":       enrichedRoles,
		"total_count": len(enrichedRoles),
		"exported_at": time.Now().Format(time.RFC3339),
	}
	c.Set("Content-Disposition", "attachment; filename=roles-export-"+time.Now().Format("2006-01-02")+".json")
	c.Set("Content-Type", "application/json")
	return c.JSON(exportData)
}

func AdminBulkUpdateRoles(c *fiber.Ctx) error {
	var req struct {
		RoleIDs []string `json:"role_ids"`
		Action  string   `json:"action"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if len(req.RoleIDs) == 0 {
		return utils.SendBadRequest(c, "No role IDs provided")
	}
	if req.Action == "" {
		return utils.SendBadRequest(c, "Action is required")
	}

	ctx := c.Context()
	var affected int64
	switch req.Action {
	case "activate":
		tag, err := config.PgxDB.Exec(ctx, "UPDATE organization_roles SET active = true WHERE id = ANY($1) AND COALESCE(is_system_role, false) = false", req.RoleIDs)
		if err != nil {
			return utils.SendInternalError(c, "Failed to activate roles", err)
		}
		affected = tag.RowsAffected()
	case "deactivate":
		tag, err := config.PgxDB.Exec(ctx, "UPDATE organization_roles SET active = false WHERE id = ANY($1) AND COALESCE(is_system_role, false) = false", req.RoleIDs)
		if err != nil {
			return utils.SendInternalError(c, "Failed to deactivate roles", err)
		}
		affected = tag.RowsAffected()
	case "delete":
		tag, err := config.PgxDB.Exec(ctx, "DELETE FROM organization_roles WHERE id = ANY($1) AND COALESCE(is_system_role, false) = false", req.RoleIDs)
		if err != nil {
			return utils.SendInternalError(c, "Failed to delete roles", err)
		}
		affected = tag.RowsAffected()
	default:
		return utils.SendBadRequest(c, "Invalid action. Supported: activate, deactivate, delete")
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"action":   req.Action,
		"affected": affected,
		"total":    len(req.RoleIDs),
	}, "Bulk operation completed successfully")
}

// AdminGetRoleAuditHistory returns audit history for a role.
// NOTE: filters on details->>'new_value' or details->>'old_value' equal to roleID,
// which is the canonical jsonb shape used by CreateAuditLog. The legacy schema
// referenced top-level new_value/old_value columns; switched to jsonb extraction.
func AdminGetRoleAuditHistory(c *fiber.Ctx) error {
	roleID := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT id, action, admin_user_id, organization_id, details, created_at
		FROM admin_audit_logs
		WHERE action LIKE '%role%'
			AND (details->>'new_value' = $1 OR details->>'old_value' = $1)
		ORDER BY created_at DESC LIMIT 50`, roleID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to load audit history", err)
	}
	defer rows.Close()

	activities := []map[string]interface{}{}
	for rows.Next() {
		var (
			id, action, adminUserID string
			orgID                   *string
			details                 []byte
			createdAt               time.Time
		)
		if err := rows.Scan(&id, &action, &adminUserID, &orgID, &details, &createdAt); err != nil {
			return utils.SendInternalError(c, "Failed to scan audit row", err)
		}
		activities = append(activities, map[string]interface{}{
			"id":              id,
			"action":          action,
			"admin_user_id":   adminUserID,
			"organization_id": orgID,
			"details":         json.RawMessage(details),
			"created_at":      createdAt,
		})
	}
	return utils.SendSimpleSuccess(c, activities, "Role audit history retrieved successfully")
}
