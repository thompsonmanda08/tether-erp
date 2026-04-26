package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
	"golang.org/x/crypto/bcrypt"
)

// Admin console user management - manages users with admin roles.
// Admin users are regular users filtered by role IN ('admin', 'super_admin', 'compliance_officer').
// NOTE: many handlers below originally pulled `display_name` from organization_roles
// and other columns that are not in current migrations; we COALESCE to safe defaults.
// TODO: confirm columns and add proper joins where needed.

var adminRoles = []string{"admin", "super_admin", "compliance_officer"}

// adminUserToFrontend transforms a raw user row into the AdminUser shape the frontend expects.
func adminUserToFrontend(user map[string]interface{}) map[string]interface{} {
	name, _ := user["name"].(string)
	parts := strings.SplitN(name, " ", 2)
	firstName := ""
	lastName := ""
	if len(parts) >= 1 {
		firstName = parts[0]
	}
	if len(parts) >= 2 {
		lastName = parts[1]
	}

	uid, _ := user["id"].(string)

	var sessionCount int64
	if uid != "" {
		_ = config.PgxDB.QueryRow(rootCtx(), "SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND expires_at > $2", uid, time.Now()).Scan(&sessionCount)
	}

	var lockCount int64
	if uid != "" {
		_ = config.PgxDB.QueryRow(rootCtx(), "SELECT COUNT(*) FROM account_lockouts WHERE user_id = $1 AND active = true", uid).Scan(&lockCount)
	}

	result := map[string]interface{}{
		"id":              user["id"],
		"email":           user["email"],
		"first_name":      firstName,
		"last_name":       lastName,
		"display_name":    name,
		"role":            user["role"],
		"is_active":       user["active"],
		"last_login":      user["last_login"],
		"created_at":      user["created_at"],
		"updated_at":      user["updated_at"],
		"session_count":   sessionCount,
		"is_locked":       lockCount > 0,
		"is_super_admin":  user["is_super_admin"],
		"mfa_enabled":     user["mfa_enabled"],
		"roles":           []map[string]interface{}{},
		"all_permissions": []string{},
	}
	return result
}

// rootCtx returns a background context for helpers that don't have a Fiber ctx in scope.
func rootCtx() context.Context { return context.Background() }

// AdminGetAdminUsers returns paginated admin users.
func AdminGetAdminUsers(c *fiber.Ctx) error {
	ctx := c.Context()
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	page, limit = utils.NormalizePaginationParams(page, limit)

	conds := []string{"deleted_at IS NULL", "role = ANY($1)"}
	args := []interface{}{adminRoles}
	add := func(cnd string, a ...interface{}) {
		for _, v := range a {
			args = append(args, v)
			cnd = strings.Replace(cnd, "?", "$"+strconv.Itoa(len(args)), 1)
		}
		conds = append(conds, cnd)
	}

	if v := c.Query("search"); v != "" {
		p := "%" + strings.ToLower(v) + "%"
		add("(LOWER(name) LIKE ? OR LOWER(email) LIKE ?)", p, p)
	}
	if v := c.Query("status"); v == "active" {
		add("active = ?", true)
	} else if v == "inactive" {
		add("active = ?", false)
	}

	where := " WHERE " + strings.Join(conds, " AND ")

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users"+where, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count admin users", err)
	}

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	q := "SELECT id, email, name, role, active, last_login, is_super_admin, mfa_enabled, created_at, updated_at FROM users" +
		where + " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		return utils.SendInternalError(c, "Failed to load admin users", err)
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var (
			id, email, name, role string
			active, isSuper, mfa  bool
			lastLogin             *time.Time
			createdAt, updatedAt  time.Time
		)
		if err := rows.Scan(&id, &email, &name, &role, &active, &lastLogin, &isSuper, &mfa, &createdAt, &updatedAt); err != nil {
			return utils.SendInternalError(c, "Failed to scan user", err)
		}
		users = append(users, adminUserToFrontend(map[string]interface{}{
			"id":             id,
			"email":          email,
			"name":           name,
			"role":           role,
			"active":         active,
			"last_login":     lastLogin,
			"is_super_admin": isSuper,
			"mfa_enabled":    mfa,
			"created_at":     createdAt,
			"updated_at":     updatedAt,
		}))
	}
	return utils.SendPaginatedSuccess(c, users, "Admin users retrieved successfully", page, limit, total)
}

func AdminGetAdminUserStats(c *fiber.Ctx) error {
	ctx := c.Context()
	var total, active, inactive, locked, superAdmins int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = ANY($1) AND deleted_at IS NULL", adminRoles).Scan(&total)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = ANY($1) AND active = true AND deleted_at IS NULL", adminRoles).Scan(&active)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = ANY($1) AND active = false AND deleted_at IS NULL", adminRoles).Scan(&inactive)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(DISTINCT user_id) FROM account_lockouts WHERE active = true").Scan(&locked)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE is_super_admin = true AND deleted_at IS NULL").Scan(&superAdmins)

	stats := map[string]interface{}{
		"total":         total,
		"active":        active,
		"inactive":      inactive,
		"locked":        locked,
		"super_admins":  superAdmins,
		"collected_at":  time.Now(),
	}
	return utils.SendSimpleSuccess(c, stats, "Admin user stats retrieved successfully")
}

func AdminGetAdminUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var (
		uid, email, name, role string
		active, isSuper, mfa   bool
		lastLogin              *time.Time
		createdAt, updatedAt   time.Time
	)
	err := config.PgxDB.QueryRow(c.Context(),
		"SELECT id, email, name, role, active, last_login, is_super_admin, mfa_enabled, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL", id).
		Scan(&uid, &email, &name, &role, &active, &lastLogin, &isSuper, &mfa, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Admin user not found")
		}
		return utils.SendInternalError(c, "Failed to load admin user", err)
	}
	return utils.SendSimpleSuccess(c, adminUserToFrontend(map[string]interface{}{
		"id": uid, "email": email, "name": name, "role": role, "active": active,
		"last_login": lastLogin, "is_super_admin": isSuper, "mfa_enabled": mfa,
		"created_at": createdAt, "updated_at": updatedAt,
	}), "Admin user retrieved successfully")
}

func AdminCreateAdminUser(c *fiber.Ctx) error {
	ctx := c.Context()
	var req struct {
		Email     string `json:"email"`
		Name      string `json:"name"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Password  string `json:"password"`
		Role      string `json:"role"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if req.Email == "" || req.Password == "" {
		return utils.SendBadRequest(c, "Email and password are required")
	}
	if req.Role == "" {
		req.Role = "admin"
	}
	name := req.Name
	if name == "" {
		name = strings.TrimSpace(req.FirstName + " " + req.LastName)
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return utils.SendInternalError(c, "Failed to hash password", err)
	}

	id := utils.GenerateID()
	now := time.Now()
	_, err = config.PgxDB.Exec(ctx, `
		INSERT INTO users (id, email, name, password, role, active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, true, $6, $6)`,
		id, req.Email, name, string(hashed), req.Role, now,
	)
	if err != nil {
		log.Printf("Error creating admin user: %v", err)
		return utils.SendInternalError(c, "Failed to create admin user", err)
	}
	return utils.SendCreatedSuccess(c, map[string]interface{}{
		"id": id, "email": req.Email, "name": name, "role": req.Role,
	}, "Admin user created successfully")
}

func AdminUpdateAdminUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}

	allowed := map[string]string{"name": "name", "email": "email", "role": "role", "active": "active"}
	setClauses := []string{"updated_at = $1"}
	args := []interface{}{time.Now()}
	for key, col := range allowed {
		if v, ok := req[key]; ok {
			args = append(args, v)
			setClauses = append(setClauses, col+" = $"+strconv.Itoa(len(args)))
		}
	}
	if len(setClauses) <= 1 {
		return utils.SendBadRequest(c, "No updatable fields provided")
	}
	args = append(args, id)
	q := "UPDATE users SET " + strings.Join(setClauses, ", ") + " WHERE id = $" + strconv.Itoa(len(args))
	if _, err := config.PgxDB.Exec(c.Context(), q, args...); err != nil {
		return utils.SendInternalError(c, "Failed to update user", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Admin user updated successfully")
}

func AdminDeleteAdminUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE users SET active = false, deleted_at = $1, updated_at = $1 WHERE id = $2", time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to delete admin user", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Admin user deleted successfully")
}

func AdminActivateAdminUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(), "UPDATE users SET active = true, updated_at = $1 WHERE id = $2", time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to activate user", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Admin user activated successfully")
}

func AdminDeactivateAdminUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(), "UPDATE users SET active = false, updated_at = $1 WHERE id = $2", time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to deactivate user", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Admin user deactivated successfully")
}

func AdminUnlockAdminUser(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE account_lockouts SET active = false WHERE user_id = $1 AND active = true", id); err != nil {
		return utils.SendInternalError(c, "Failed to unlock user", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Admin user unlocked successfully")
}

func AdminResetAdminPassword(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil || req.NewPassword == "" {
		return utils.SendBadRequest(c, "new_password is required")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return utils.SendInternalError(c, "Failed to hash password", err)
	}
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE users SET password = $1, must_change_password = true, updated_at = $2 WHERE id = $3",
		string(hashed), time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to reset password", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Password reset successfully")
}

func AdminToggleTwoFactor(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE users SET mfa_enabled = NOT mfa_enabled, updated_at = $1 WHERE id = $2", time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to toggle 2FA", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Two-factor authentication toggled successfully")
}

// AdminGetAdminUserActivity — TODO: requires user_activity_logs query.
func AdminGetAdminUserActivity(c *fiber.Ctx) error {
	id := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT id, action_type, resource_type, resource_id, ip_address, user_agent, metadata, created_at
		FROM user_activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, id)
	if err != nil {
		return utils.SendSimpleSuccess(c, []interface{}{}, "Activity retrieved successfully")
	}
	defer rows.Close()
	out := []map[string]interface{}{}
	for rows.Next() {
		var (
			actID, actionType                              string
			resourceType, resourceID, ipAddress, userAgent *string
			metadata                                       []byte
			createdAt                                      time.Time
		)
		if err := rows.Scan(&actID, &actionType, &resourceType, &resourceID, &ipAddress, &userAgent, &metadata, &createdAt); err == nil {
			out = append(out, map[string]interface{}{
				"id":            actID,
				"action_type":   actionType,
				"resource_type": resourceType,
				"resource_id":   resourceID,
				"ip_address":    ipAddress,
				"user_agent":    userAgent,
				"metadata":      string(metadata),
				"created_at":    createdAt,
			})
		}
	}
	return utils.SendSimpleSuccess(c, out, "Activity retrieved successfully")
}

func AdminGetAdminUserSessions(c *fiber.Ctx) error {
	id := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(),
		"SELECT id, ip_address, user_agent, expires_at, created_at FROM sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC", id, time.Now())
	if err != nil {
		return utils.SendInternalError(c, "Failed to load sessions", err)
	}
	defer rows.Close()
	out := []map[string]interface{}{}
	for rows.Next() {
		var (
			sid                    string
			ipAddress, userAgent   *string
			expiresAt, createdAt   time.Time
		)
		if err := rows.Scan(&sid, &ipAddress, &userAgent, &expiresAt, &createdAt); err == nil {
			out = append(out, map[string]interface{}{
				"id":         sid,
				"ip_address": ipAddress,
				"user_agent": userAgent,
				"expires_at": expiresAt,
				"created_at": createdAt,
			})
		}
	}
	return utils.SendSimpleSuccess(c, out, "Sessions retrieved successfully")
}

func AdminTerminateAdminSession(c *fiber.Ctx) error {
	sid := c.Params("session_id")
	if _, err := config.PgxDB.Exec(c.Context(), "DELETE FROM sessions WHERE id = $1", sid); err != nil {
		return utils.SendInternalError(c, "Failed to terminate session", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": sid}, "Session terminated successfully")
}

func AdminTerminateAllAdminSessions(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(), "DELETE FROM sessions WHERE user_id = $1", id); err != nil {
		return utils.SendInternalError(c, "Failed to terminate sessions", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "All sessions terminated successfully")
}

func AdminExportAdminUsers(c *fiber.Ctx) error {
	rows, err := config.PgxDB.Query(c.Context(),
		"SELECT id, email, name, role, active, created_at FROM users WHERE role = ANY($1) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10000",
		adminRoles)
	if err != nil {
		return utils.SendInternalError(c, "Failed to export admin users", err)
	}
	defer rows.Close()
	out := []map[string]interface{}{}
	for rows.Next() {
		var id, email, name, role string
		var active bool
		var createdAt time.Time
		if err := rows.Scan(&id, &email, &name, &role, &active, &createdAt); err == nil {
			out = append(out, map[string]interface{}{
				"id": id, "email": email, "name": name, "role": role, "active": active, "created_at": createdAt,
			})
		}
	}

	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=admin-users-%s.json", time.Now().Format("2006-01-02")))
	c.Set("Content-Type", "application/json")
	return c.JSON(map[string]interface{}{
		"users":       out,
		"total_count": len(out),
		"exported_at": time.Now().Format(time.RFC3339),
	})
}

func AdminBulkUpdateAdminUsers(c *fiber.Ctx) error {
	var req struct {
		UserIDs []string `json:"user_ids"`
		Action  string   `json:"action"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if len(req.UserIDs) == 0 || req.Action == "" {
		return utils.SendBadRequest(c, "user_ids and action are required")
	}

	var q string
	switch req.Action {
	case "activate":
		q = "UPDATE users SET active = true, updated_at = NOW() WHERE id = ANY($1)"
	case "deactivate":
		q = "UPDATE users SET active = false, updated_at = NOW() WHERE id = ANY($1)"
	case "delete":
		q = "UPDATE users SET deleted_at = NOW(), active = false, updated_at = NOW() WHERE id = ANY($1)"
	default:
		return utils.SendBadRequest(c, "Invalid action")
	}

	tag, err := config.PgxDB.Exec(c.Context(), q, req.UserIDs)
	if err != nil {
		return utils.SendInternalError(c, "Failed to apply bulk action", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"action":   req.Action,
		"affected": tag.RowsAffected(),
	}, "Bulk action completed successfully")
}

// AdminImpersonateAdminUser — TODO: full impersonation flow lives in admin_impersonation_handler.go
// and the impersonation service. This endpoint is left as a stub.
func AdminImpersonateAdminUser(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Use the dedicated impersonation endpoints under /api/v1/admin/impersonation")
}

func AdminPromoteToSuperAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE users SET is_super_admin = true, updated_at = $1 WHERE id = $2", time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to promote user", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "User promoted to super admin successfully")
}

func AdminDemoteFromSuperAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE users SET is_super_admin = false, updated_at = $1 WHERE id = $2", time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to demote user", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "User demoted from super admin successfully")
}
