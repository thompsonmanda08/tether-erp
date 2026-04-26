package handlers

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
	"golang.org/x/crypto/bcrypt"
)

// platformUserEnrich adds the organizations slice the frontend PlatformUser interface expects.
func platformUserEnrich(user map[string]interface{}) map[string]interface{} {
	user["email_verified"] = true
	user["login_count"] = 0
	user["phone"] = nil
	user["profile"] = nil

	if uid, ok := user["id"].(string); ok && uid != "" {
		rows, err := config.PgxDB.Query(rootCtx(), `
			SELECT m.organization_id, COALESCE(o.name, '') as org_name, COALESCE(o.slug, '') as org_domain,
				m.role, CASE WHEN m.active = true THEN 'active' ELSE 'suspended' END as status, m.joined_at
			FROM organization_members m
			LEFT JOIN organizations o ON o.id = m.organization_id
			WHERE m.user_id = $1`, uid)
		if err == nil {
			defer rows.Close()
			orgs := []map[string]interface{}{}
			for rows.Next() {
				var (
					orgID, orgName, orgDomain, role, status string
					joinedAt                                *time.Time
				)
				if err := rows.Scan(&orgID, &orgName, &orgDomain, &role, &status, &joinedAt); err != nil {
					continue
				}
				orgs = append(orgs, map[string]interface{}{
					"organization_id":     orgID,
					"organization_name":   orgName,
					"organization_domain": orgDomain,
					"role":                role,
					"status":              status,
					"joined_at":           joinedAt,
					"permissions":         []string{},
				})
			}
			for i := range orgs {
				orgs[i]["is_primary"] = i == 0
			}
			user["organizations"] = orgs
		}
	}

	return user
}

// AdminGetAllUsers returns all platform users with filters and pagination.
func AdminGetAllUsers(c *fiber.Ctx) error {
	ctx := c.Context()
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := c.Query("search")
	status := c.Query("status")
	role := c.Query("role")
	organizationID := c.Query("organization_id")
	sortBy := c.Query("sort_by", "created_at")
	sortOrder := c.Query("sort_order", "desc")

	page, limit = utils.NormalizePaginationParams(page, limit)
	offset := (page - 1) * limit

	conds := []string{"u.deleted_at IS NULL"}
	args := []interface{}{}
	add := func(cnd string, a ...interface{}) {
		for _, v := range a {
			args = append(args, v)
			cnd = strings.Replace(cnd, "?", "$"+strconv.Itoa(len(args)), 1)
		}
		conds = append(conds, cnd)
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		add("(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)", searchTerm, searchTerm)
	}
	if status == "active" {
		add("u.active = ?", true)
	} else if status == "suspended" || status == "inactive" {
		add("u.active = ?", false)
	}
	if role != "" {
		add("u.role = ?", role)
	}
	if organizationID != "" {
		add("EXISTS (SELECT 1 FROM organization_members m WHERE m.user_id = u.id AND m.organization_id = ? AND m.active = true)", organizationID)
	}

	where := " WHERE " + strings.Join(conds, " AND ")

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users u"+where, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count users", err)
	}

	allowedSorts := map[string]string{
		"name":       "u.name",
		"email":      "u.email",
		"created_at": "u.created_at",
		"last_login": "u.last_login",
	}
	sortCol, ok := allowedSorts[sortBy]
	if !ok {
		sortCol = "u.created_at"
	}
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	args = append(args, limit, offset)
	q := fmt.Sprintf(`
		SELECT u.id, u.email, u.name, u.role,
			CASE WHEN u.active = true THEN 'active' WHEN u.active = false AND u.last_login IS NULL THEN 'pending' ELSE 'suspended' END as status,
			u.active, u.created_at, u.updated_at, u.last_login,
			COALESCE(u.position, ''), COALESCE(u.man_number, ''), COALESCE(u.nrc_number, ''), COALESCE(u.contact, ''),
			COALESCE(u.mfa_enabled, false),
			(SELECT COUNT(*) FROM organization_members m WHERE m.user_id = u.id AND m.active = true) as organization_count
		FROM users u%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`,
		where, sortCol, sortOrder, len(args)-1, len(args),
	)

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		log.Printf("Error getting users: %v", err)
		return utils.SendInternalError(c, "Failed to retrieve users", err)
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var (
			id, email, name, role, st, position, manNumber, nrcNumber, contact string
			isActive, mfaEnabled                                                bool
			lastLogin                                                           *time.Time
			createdAt, updatedAt                                                time.Time
			orgCount                                                            int64
		)
		if err := rows.Scan(&id, &email, &name, &role, &st, &isActive, &createdAt, &updatedAt, &lastLogin,
			&position, &manNumber, &nrcNumber, &contact, &mfaEnabled, &orgCount); err != nil {
			return utils.SendInternalError(c, "Failed to scan user", err)
		}
		u := map[string]interface{}{
			"id":                 id,
			"email":              email,
			"name":               name,
			"role":               role,
			"status":             st,
			"is_active":          isActive,
			"created_at":         createdAt,
			"updated_at":         updatedAt,
			"last_login":         lastLogin,
			"position":           position,
			"man_number":         manNumber,
			"nrc_number":         nrcNumber,
			"contact":            contact,
			"phone":              contact,
			"mfa_enabled":        mfaEnabled,
			"organization_count": orgCount,
		}
		users = append(users, platformUserEnrich(u))
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	response := map[string]interface{}{
		"users":      users,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": totalPages,
	}
	return utils.SendSimpleSuccess(c, response, "Users retrieved successfully")
}

func AdminGetUserStatistics(c *fiber.Ctx) error {
	ctx := c.Context()
	var total, active, inactive, locked, mfaEnabled int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&total)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE active = true AND deleted_at IS NULL").Scan(&active)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE active = false AND deleted_at IS NULL").Scan(&inactive)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(DISTINCT user_id) FROM account_lockouts WHERE active = true").Scan(&locked)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE mfa_enabled = true AND deleted_at IS NULL").Scan(&mfaEnabled)

	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	var newThisMonth int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE created_at >= $1 AND deleted_at IS NULL", thirtyDaysAgo).Scan(&newThisMonth)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"total":          total,
		"active":         active,
		"inactive":       inactive,
		"locked":         locked,
		"mfa_enabled":    mfaEnabled,
		"new_this_month": newThisMonth,
		"collected_at":   time.Now(),
	}, "User statistics retrieved successfully")
}

func AdminGetUserById(c *fiber.Ctx) error {
	id := c.Params("id")
	var (
		uid, email, name, role                          string
		active, mfa, isSuper                            bool
		lastLogin                                       *time.Time
		createdAt, updatedAt                            time.Time
		position, manNumber, nrcNumber, contact         *string
	)
	err := config.PgxDB.QueryRow(c.Context(), `
		SELECT id, email, name, role, active, last_login, mfa_enabled, is_super_admin,
			position, man_number, nrc_number, contact, created_at, updated_at
		FROM users WHERE id = $1 AND deleted_at IS NULL`, id).
		Scan(&uid, &email, &name, &role, &active, &lastLogin, &mfa, &isSuper,
			&position, &manNumber, &nrcNumber, &contact, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "User not found")
		}
		return utils.SendInternalError(c, "Failed to load user", err)
	}

	user := map[string]interface{}{
		"id":             uid,
		"email":          email,
		"name":           name,
		"role":           role,
		"is_active":      active,
		"last_login":     lastLogin,
		"mfa_enabled":    mfa,
		"is_super_admin": isSuper,
		"position":       position,
		"man_number":     manNumber,
		"nrc_number":     nrcNumber,
		"contact":        contact,
		"created_at":     createdAt,
		"updated_at":     updatedAt,
	}
	return utils.SendSimpleSuccess(c, platformUserEnrich(user), "User retrieved successfully")
}

func AdminUpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}

	allowed := map[string]string{
		"name":       "name",
		"email":      "email",
		"role":       "role",
		"position":   "position",
		"man_number": "man_number",
		"nrc_number": "nrc_number",
		"contact":    "contact",
		"active":     "active",
	}

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
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "User updated successfully")
}

func AdminUpdateUserStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	active := req.Status == "active"
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE users SET active = $1, updated_at = $2 WHERE id = $3", active, time.Now(), id); err != nil {
		return utils.SendInternalError(c, "Failed to update user status", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id, "status": req.Status}, "User status updated successfully")
}

func AdminGetUserActivity(c *fiber.Ctx) error {
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

func AdminGetUserSessions(c *fiber.Ctx) error {
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
			sid                  string
			ipAddress, userAgent *string
			expiresAt, createdAt time.Time
		)
		if err := rows.Scan(&sid, &ipAddress, &userAgent, &expiresAt, &createdAt); err == nil {
			ua := ""
			if userAgent != nil {
				ua = *userAgent
			}
			out = append(out, map[string]interface{}{
				"id":         sid,
				"ip_address": ipAddress,
				"user_agent": ua,
				"device":     parseDeviceHint(ua),
				"os":         parseOSHint(ua),
				"browser":    parseBrowserHint(ua),
				"expires_at": expiresAt,
				"created_at": createdAt,
			})
		}
	}
	return utils.SendSimpleSuccess(c, out, "Sessions retrieved successfully")
}

func AdminTerminateUserSession(c *fiber.Ctx) error {
	sid := c.Params("session_id")
	if _, err := config.PgxDB.Exec(c.Context(), "DELETE FROM sessions WHERE id = $1", sid); err != nil {
		return utils.SendInternalError(c, "Failed to terminate session", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": sid}, "Session terminated successfully")
}

func AdminTerminateAllUserSessions(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(), "DELETE FROM sessions WHERE user_id = $1", id); err != nil {
		return utils.SendInternalError(c, "Failed to terminate sessions", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "All sessions terminated successfully")
}

func AdminResetUserPassword(c *fiber.Ctx) error {
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

// AdminImpersonateUser — TODO: full impersonation flow lives in the impersonation service.
func AdminImpersonateUser(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Use the dedicated impersonation endpoints under /api/v1/admin/impersonation")
}

// AdminGetUserWorkStats — best-effort, returns counts across documents tables.
func AdminGetUserWorkStats(c *fiber.Ctx) error {
	id := c.Params("id")
	ctx := c.Context()

	stats := map[string]interface{}{}
	var requisitions, purchaseOrders, payments int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM requisitions WHERE requester_id = $1 AND deleted_at IS NULL", id).Scan(&requisitions)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM purchase_orders WHERE created_by = $1 AND deleted_at IS NULL", id).Scan(&purchaseOrders)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM payment_vouchers WHERE created_by = $1 AND deleted_at IS NULL", id).Scan(&payments)

	stats["requisitions_created"] = requisitions
	stats["purchase_orders_created"] = purchaseOrders
	stats["payment_vouchers_created"] = payments
	stats["collected_at"] = time.Now()
	return utils.SendSimpleSuccess(c, stats, "User work stats retrieved successfully")
}

func AdminGetUserSecurityEvents(c *fiber.Ctx) error {
	id := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT email, success, attempted_at, ip_address, COALESCE(failure_reason, '') as reason
		FROM login_attempts
		WHERE email = (SELECT email FROM users WHERE id = $1)
		ORDER BY attempted_at DESC LIMIT 100`, id)
	if err != nil {
		return utils.SendSimpleSuccess(c, []interface{}{}, "Security events retrieved successfully")
	}
	defer rows.Close()
	out := []map[string]interface{}{}
	for rows.Next() {
		var (
			email, ipAddress, reason string
			success                  bool
			attemptedAt              time.Time
		)
		if err := rows.Scan(&email, &success, &attemptedAt, &ipAddress, &reason); err == nil {
			out = append(out, map[string]interface{}{
				"email":        email,
				"success":      success,
				"attempted_at": attemptedAt,
				"ip_address":   ipAddress,
				"reason":       reason,
			})
		}
	}
	return utils.SendSimpleSuccess(c, out, "Security events retrieved successfully")
}

func AdminGetUserLoginHistory(c *fiber.Ctx) error {
	id := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT email, success, attempted_at, ip_address
		FROM login_attempts
		WHERE email = (SELECT email FROM users WHERE id = $1)
		ORDER BY attempted_at DESC LIMIT 100`, id)
	if err != nil {
		return utils.SendSimpleSuccess(c, []interface{}{}, "Login history retrieved successfully")
	}
	defer rows.Close()
	out := []map[string]interface{}{}
	for rows.Next() {
		var (
			email, ipAddress string
			success          bool
			attemptedAt      time.Time
		)
		if err := rows.Scan(&email, &success, &attemptedAt, &ipAddress); err == nil {
			out = append(out, map[string]interface{}{
				"email":        email,
				"success":      success,
				"attempted_at": attemptedAt,
				"ip_address":   ipAddress,
			})
		}
	}
	return utils.SendSimpleSuccess(c, out, "Login history retrieved successfully")
}

func parseDeviceHint(ua string) string {
	ua = strings.ToLower(ua)
	if strings.Contains(ua, "mobile") || strings.Contains(ua, "android") || strings.Contains(ua, "iphone") {
		return "mobile"
	}
	if strings.Contains(ua, "tablet") || strings.Contains(ua, "ipad") {
		return "tablet"
	}
	return "desktop"
}

func parseOSHint(ua string) string {
	ua = strings.ToLower(ua)
	switch {
	case strings.Contains(ua, "windows"):
		return "Windows"
	case strings.Contains(ua, "mac os x") || strings.Contains(ua, "macintosh"):
		return "macOS"
	case strings.Contains(ua, "android"):
		return "Android"
	case strings.Contains(ua, "iphone") || strings.Contains(ua, "ipad"):
		return "iOS"
	case strings.Contains(ua, "linux"):
		return "Linux"
	}
	return "Unknown"
}

func parseBrowserHint(ua string) string {
	ua = strings.ToLower(ua)
	switch {
	case strings.Contains(ua, "edg/"):
		return "Edge"
	case strings.Contains(ua, "chrome/"):
		return "Chrome"
	case strings.Contains(ua, "firefox/"):
		return "Firefox"
	case strings.Contains(ua, "safari/"):
		return "Safari"
	}
	return "Unknown"
}

func AdminExportUserActivity(c *fiber.Ctx) error {
	id := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT id, action_type, COALESCE(resource_type, ''), COALESCE(resource_id, ''), COALESCE(ip_address, ''), created_at
		FROM user_activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10000`, id)
	if err != nil {
		return utils.SendInternalError(c, "Failed to export activity", err)
	}
	defer rows.Close()

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"id", "action_type", "resource_type", "resource_id", "ip_address", "created_at"})
	for rows.Next() {
		var actID, actionType, resourceType, resourceID, ipAddress string
		var createdAt time.Time
		if err := rows.Scan(&actID, &actionType, &resourceType, &resourceID, &ipAddress, &createdAt); err == nil {
			_ = w.Write([]string{actID, actionType, resourceType, resourceID, ipAddress, createdAt.Format(time.RFC3339)})
		}
	}
	w.Flush()

	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=user-activity-%s-%s.csv", id, time.Now().Format("2006-01-02")))
	c.Set("Content-Type", "text/csv")
	return c.Send(buf.Bytes())
}

func AdminGetUserOrganizations(c *fiber.Ctx) error {
	id := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT m.organization_id, COALESCE(o.name, '') as org_name, COALESCE(o.slug, '') as org_domain,
			m.role, m.active, m.joined_at
		FROM organization_members m
		LEFT JOIN organizations o ON o.id = m.organization_id
		WHERE m.user_id = $1`, id)
	if err != nil {
		return utils.SendInternalError(c, "Failed to load user organizations", err)
	}
	defer rows.Close()

	out := []map[string]interface{}{}
	for rows.Next() {
		var (
			orgID, orgName, orgDomain, role string
			active                          bool
			joinedAt                        *time.Time
		)
		if err := rows.Scan(&orgID, &orgName, &orgDomain, &role, &active, &joinedAt); err == nil {
			out = append(out, map[string]interface{}{
				"organization_id":     orgID,
				"organization_name":   orgName,
				"organization_domain": orgDomain,
				"role":                role,
				"active":              active,
				"joined_at":           joinedAt,
			})
		}
	}
	return utils.SendSimpleSuccess(c, out, "User organizations retrieved successfully")
}

func AdminUpdateUserOrgRole(c *fiber.Ctx) error {
	userID := c.Params("id")
	orgID := c.Params("org_id")
	var req struct {
		Role string `json:"role"`
	}
	if err := c.BodyParser(&req); err != nil || req.Role == "" {
		return utils.SendBadRequest(c, "role is required")
	}
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE organization_members SET role = $1, updated_at = $2 WHERE user_id = $3 AND organization_id = $4",
		req.Role, time.Now(), userID, orgID); err != nil {
		return utils.SendInternalError(c, "Failed to update role", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"user_id": userID, "organization_id": orgID, "role": req.Role}, "Role updated successfully")
}

func AdminRemoveUserFromOrg(c *fiber.Ctx) error {
	userID := c.Params("id")
	orgID := c.Params("org_id")
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE organization_members SET active = false, updated_at = $1 WHERE user_id = $2 AND organization_id = $3",
		time.Now(), userID, orgID); err != nil {
		return utils.SendInternalError(c, "Failed to remove user from organization", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"user_id": userID, "organization_id": orgID}, "User removed from organization successfully")
}
