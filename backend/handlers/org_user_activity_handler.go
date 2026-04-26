package handlers

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/utils"
	"golang.org/x/crypto/bcrypt"
)

// orgMemberGuard verifies that userID is an active member of the caller's organization.
// Returns a non-nil error response if the check fails; callers should return that value immediately.
func orgMemberGuard(c *fiber.Ctx, orgID, userID string) error {
	var count int64
	err := config.PgxDB.QueryRow(c.Context(),
		`SELECT COUNT(*) FROM organization_members
		 WHERE organization_id = $1 AND user_id = $2 AND active = true`,
		orgID, userID,
	).Scan(&count)
	if err != nil || count == 0 {
		return utils.SendNotFoundError(c, "User not found in this organization")
	}
	return nil
}

// OrgGetUserById returns a single user by ID, scoped to the caller's organization.
// GET /api/v1/organization/users/:id
func OrgGetUserById(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	ctx := c.Context()

	var (
		id, email, name, role                 string
		status                                string
		isActive, mfaEnabled                  bool
		createdAt, updatedAt                  time.Time
		lastLogin                             *time.Time
		position, manNumber, nrcNumber, phone string
		preferences                           []byte
	)

	err = config.PgxDB.QueryRow(ctx, `
		SELECT id, email, name, role,
			CASE WHEN active = true THEN 'active' ELSE 'suspended' END as status,
			active,
			created_at, updated_at, last_login,
			COALESCE(position, '') as position,
			COALESCE(man_number, '') as man_number,
			COALESCE(nrc_number, '') as nrc_number,
			COALESCE(contact, '') as contact,
			COALESCE(mfa_enabled, false) as mfa_enabled,
			preferences
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
		LIMIT 1`, userID,
	).Scan(&id, &email, &name, &role, &status, &isActive,
		&createdAt, &updatedAt, &lastLogin,
		&position, &manNumber, &nrcNumber, &phone, &mfaEnabled, &preferences)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFoundError(c, "User not found")
		}
		return utils.SendInternalError(c, "Failed to load user", err)
	}

	user := map[string]interface{}{
		"id":             id,
		"email":          email,
		"name":           name,
		"role":           role,
		"status":         status,
		"is_active":      isActive,
		"created_at":     createdAt,
		"updated_at":     updatedAt,
		"last_login":     lastLogin,
		"position":       position,
		"man_number":     manNumber,
		"nrc_number":     nrcNumber,
		"contact":        phone,
		"mfa_enabled":    mfaEnabled,
		"preferences":    json.RawMessage(preferences),
		"phone":          phone,
		"manNumber":      manNumber,
		"nrcNumber":      nrcNumber,
		"email_verified": true,
		"login_count":    0,
	}

	// Org membership block
	orgs := []map[string]interface{}{}
	rows, err := config.PgxDB.Query(ctx, `
		SELECT organization_members.organization_id,
			organizations.name as organization_name,
			COALESCE(organizations.slug, '') as organization_domain,
			organization_members.role,
			COALESCE(organization_members.department, '') as department,
			CASE WHEN organization_members.active = true THEN 'active' ELSE 'suspended' END as status,
			organization_members.joined_at
		FROM organization_members
		LEFT JOIN organizations ON organizations.id = organization_members.organization_id
		WHERE organization_members.user_id = $1 AND organization_members.organization_id = $2`,
		userID, tenant.OrganizationID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var (
				orgID, orgName, orgDomain, mRole, dept, mStatus string
				joinedAt                                        *time.Time
			)
			if err := rows.Scan(&orgID, &orgName, &orgDomain, &mRole, &dept, &mStatus, &joinedAt); err != nil {
				continue
			}
			orgs = append(orgs, map[string]interface{}{
				"organization_id":     orgID,
				"organization_name":   orgName,
				"organization_domain": orgDomain,
				"role":                mRole,
				"department":          dept,
				"status":              mStatus,
				"joined_at":           joinedAt,
			})
		}
	}

	department := ""
	for i := range orgs {
		orgs[i]["permissions"] = []string{}
		orgs[i]["is_primary"] = i == 0
		if i == 0 {
			if d, ok := orgs[i]["department"].(string); ok {
				department = d
			}
		}
	}

	user["organizations"] = orgs
	user["department"] = department

	return utils.SendSimpleSuccess(c, user, "User retrieved successfully")
}

// OrgUpdateUserStatus activates or suspends a user, scoped to the caller's organization.
// PUT /api/v1/organization/users/:id/status
func OrgUpdateUserStatus(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	var request struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if err := c.BodyParser(&request); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if request.Status != "active" && request.Status != "suspended" && request.Status != "inactive" {
		return utils.SendBadRequestError(c, "Invalid status. Must be 'active', 'suspended', or 'inactive'")
	}

	active := request.Status == "active"
	ctx := c.Context()

	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE users SET active = $1, updated_at = $2 WHERE id = $3 AND deleted_at IS NULL`,
		active, time.Now(), userID,
	); err != nil {
		return utils.SendInternalError(c, "Failed to update user status", err)
	}

	adminUserID, _ := c.Locals("userID").(string)
	_, _ = config.PgxDB.Exec(ctx, `
		INSERT INTO admin_audit_logs (id, action, admin_user_id, new_value, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		utils.GenerateID(), "user_status_changed", adminUserID, request.Status, request.Reason, time.Now(),
	)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"id":     userID,
		"status": request.Status,
	}, "User status updated successfully")
}

// OrgResetUserPassword resets a user's password, scoped to the caller's organization.
// POST /api/v1/organization/users/:id/reset-password
func OrgResetUserPassword(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	var request struct {
		SendEmail bool `json:"send_email"`
	}
	_ = c.BodyParser(&request)

	ctx := c.Context()

	var existingCount int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&existingCount); err != nil || existingCount == 0 {
		return utils.SendNotFoundError(c, "User not found")
	}

	tempPassword := utils.GenerateID()[:12]
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		return utils.SendInternalError(c, "Failed to generate password", err)
	}

	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE users SET password = $1, updated_at = $2 WHERE id = $3`,
		string(hashedPassword), time.Now(), userID,
	); err != nil {
		return utils.SendInternalError(c, "Failed to reset password", err)
	}

	adminUserID, _ := c.Locals("userID").(string)
	_, _ = config.PgxDB.Exec(ctx, `
		INSERT INTO admin_audit_logs (id, action, admin_user_id, new_value, created_at)
		VALUES ($1, $2, $3, $4, $5)`,
		utils.GenerateID(), "user_password_reset", adminUserID, userID, time.Now(),
	)

	response := map[string]interface{}{}
	if !request.SendEmail {
		response["temporary_password"] = tempPassword
	}

	return utils.SendSimpleSuccess(c, response, "Password reset successfully")
}

// OrgGetUserActivity returns paginated activity logs for a user, scoped to the caller's organization.
// GET /api/v1/organization/users/:id/activity
func OrgGetUserActivity(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	ctx := c.Context()
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	page, limit = utils.NormalizePaginationParams(page, limit)
	offset := (page - 1) * limit

	actionType := c.Query("action_type")
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	// Build dynamic predicates for user_activity_logs
	conds := []string{"user_id = $1"}
	args := []interface{}{userID}
	idx := 2
	if actionType != "" {
		conds = append(conds, fmt.Sprintf("action_type = $%d", idx))
		args = append(args, actionType)
		idx++
	}
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			conds = append(conds, fmt.Sprintf("created_at >= $%d", idx))
			args = append(args, t)
			idx++
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			conds = append(conds, fmt.Sprintf("created_at <= $%d", idx))
			args = append(args, t.Add(24*time.Hour))
			idx++
		}
	}
	where := strings.Join(conds, " AND ")

	var ualTotal int64
	_ = config.PgxDB.QueryRow(ctx,
		"SELECT COUNT(*) FROM user_activity_logs WHERE "+where, args...,
	).Scan(&ualTotal)

	listSQL := `SELECT id::text, action_type, COALESCE(resource_type,'') AS resource_type,
		COALESCE(resource_id,'') AS resource_id, COALESCE(ip_address,'') AS ip_address,
		COALESCE(user_agent,'') AS user_agent, created_at
		FROM user_activity_logs WHERE ` + where +
		fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", idx, idx+1)
	listArgs := append(append([]interface{}{}, args...), limit, offset)

	activities := make([]map[string]interface{}, 0, limit)

	if rows, err := config.PgxDB.Query(ctx, listSQL, listArgs...); err == nil {
		defer rows.Close()
		for rows.Next() {
			var (
				id, atype, rtype, rid, ip, ua string
				createdAt                     time.Time
			)
			if err := rows.Scan(&id, &atype, &rtype, &rid, &ip, &ua, &createdAt); err != nil {
				continue
			}
			activities = append(activities, map[string]interface{}{
				"id":            id,
				"action_type":   atype,
				"resource_type": rtype,
				"resource_id":   rid,
				"ip_address":    ip,
				"user_agent":    ua,
				"created_at":    createdAt,
				"source":        "activity",
			})
		}
	}

	// admin_audit_logs (only when no action_type filter)
	if actionType == "" {
		auditConds := []string{"admin_user_id = $1"}
		auditArgs := []interface{}{userID}
		ai := 2
		if startDateStr != "" {
			if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
				auditConds = append(auditConds, fmt.Sprintf("created_at >= $%d", ai))
				auditArgs = append(auditArgs, t)
				ai++
			}
		}
		if endDateStr != "" {
			if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
				auditConds = append(auditConds, fmt.Sprintf("created_at <= $%d", ai))
				auditArgs = append(auditArgs, t.Add(24*time.Hour))
				ai++
			}
		}
		auditSQL := `SELECT id::text, action, COALESCE(description,'') AS description, created_at
			FROM admin_audit_logs WHERE ` + strings.Join(auditConds, " AND ") +
			" ORDER BY created_at DESC LIMIT 10"

		if arows, err := config.PgxDB.Query(ctx, auditSQL, auditArgs...); err == nil {
			defer arows.Close()
			for arows.Next() {
				var (
					id, action, desc string
					createdAt        time.Time
				)
				if err := arows.Scan(&id, &action, &desc, &createdAt); err != nil {
					continue
				}
				if desc == "" {
					desc = action
				}
				activities = append(activities, map[string]interface{}{
					"id":            id,
					"action_type":   action,
					"resource_type": "admin_action",
					"description":   desc,
					"created_at":    createdAt,
					"source":        "admin_audit",
				})
			}
		}
	}

	totalPages := int(math.Ceil(float64(ualTotal) / float64(limit)))

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"activities": activities,
		"pagination": map[string]interface{}{
			"total_records": ualTotal,
			"total_pages":   totalPages,
			"current_page":  page,
			"has_next":      page < totalPages,
			"has_prev":      page > 1,
		},
	}, "User activity retrieved successfully")
}

// OrgExportUserActivity exports a user's activity log as CSV or JSON.
// GET /api/v1/organization/users/:id/activity/export
func OrgExportUserActivity(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	ctx := c.Context()
	format := strings.ToLower(c.Query("format", "csv"))
	actionType := c.Query("action_type")
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	conds := []string{"user_id = $1"}
	args := []interface{}{userID}
	idx := 2
	if actionType != "" {
		conds = append(conds, fmt.Sprintf("action_type = $%d", idx))
		args = append(args, actionType)
		idx++
	}
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			conds = append(conds, fmt.Sprintf("created_at >= $%d", idx))
			args = append(args, t)
			idx++
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			conds = append(conds, fmt.Sprintf("created_at <= $%d", idx))
			args = append(args, t.Add(24*time.Hour))
			idx++
		}
	}

	sql := `SELECT id::text, action_type, COALESCE(resource_type,'') AS resource_type,
		COALESCE(resource_id,'') AS resource_id, COALESCE(ip_address,'') AS ip_address,
		COALESCE(user_agent,'') AS user_agent, created_at
		FROM user_activity_logs WHERE ` + strings.Join(conds, " AND ") +
		" ORDER BY created_at DESC LIMIT 10000"

	type exportRow struct {
		ID           string    `json:"id"`
		ActionType   string    `json:"action_type"`
		ResourceType string    `json:"resource_type"`
		ResourceID   string    `json:"resource_id"`
		IPAddress    string    `json:"ip_address"`
		UserAgent    string    `json:"user_agent"`
		CreatedAt    time.Time `json:"created_at"`
	}

	var rows []exportRow
	if pgRows, err := config.PgxDB.Query(ctx, sql, args...); err == nil {
		defer pgRows.Close()
		for pgRows.Next() {
			var r exportRow
			if err := pgRows.Scan(&r.ID, &r.ActionType, &r.ResourceType, &r.ResourceID,
				&r.IPAddress, &r.UserAgent, &r.CreatedAt); err != nil {
				continue
			}
			rows = append(rows, r)
		}
	}

	if format == "json" {
		data, err := json.Marshal(rows)
		if err != nil {
			return utils.SendInternalError(c, "Failed to serialize activity data", err)
		}
		filename := fmt.Sprintf("activity_%s_%s.json", userID, time.Now().Format("20060102"))
		c.Set("Content-Disposition", "attachment; filename="+filename)
		c.Set("Content-Type", "application/json")
		return c.Send(data)
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write([]string{"id", "action_type", "resource_type", "resource_id", "ip_address", "user_agent", "created_at"})
	for _, r := range rows {
		_ = w.Write([]string{
			r.ID, r.ActionType, r.ResourceType, r.ResourceID, r.IPAddress, r.UserAgent,
			r.CreatedAt.Format(time.RFC3339),
		})
	}
	w.Flush()

	filename := fmt.Sprintf("activity_%s_%s.csv", userID, time.Now().Format("20060102"))
	c.Set("Content-Disposition", "attachment; filename="+filename)
	c.Set("Content-Type", "text/csv")
	return c.Send(buf.Bytes())
}

// queryActivityEvents fetches activity events filtered by an IN list of action_types.
func queryActivityEvents(ctx context.Context, userID string, actionTypes []string, page, limit int) ([]map[string]interface{}, int64, error) {
	// Build placeholders for IN clause: $2, $3, ...
	phs := make([]string, 0, len(actionTypes))
	args := []interface{}{userID}
	for i, t := range actionTypes {
		phs = append(phs, fmt.Sprintf("$%d", i+2))
		args = append(args, t)
	}
	inClause := strings.Join(phs, ", ")

	var total int64
	if err := config.PgxDB.QueryRow(ctx,
		"SELECT COUNT(*) FROM user_activity_logs WHERE user_id = $1 AND action_type IN ("+inClause+")",
		args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	listArgs := append(append([]interface{}{}, args...), limit, offset)
	limitIdx := len(args) + 1
	offsetIdx := len(args) + 2
	sql := fmt.Sprintf(`SELECT id::text, action_type, COALESCE(ip_address,'') AS ip_address,
		COALESCE(user_agent,'') AS user_agent, metadata, created_at
		FROM user_activity_logs
		WHERE user_id = $1 AND action_type IN (%s)
		ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, inClause, limitIdx, offsetIdx)

	pgRows, err := config.PgxDB.Query(ctx, sql, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer pgRows.Close()

	out := []map[string]interface{}{}
	for pgRows.Next() {
		var (
			id, atype, ip, ua string
			metadata          []byte
			createdAt         time.Time
		)
		if err := pgRows.Scan(&id, &atype, &ip, &ua, &metadata, &createdAt); err != nil {
			continue
		}
		out = append(out, map[string]interface{}{
			"id":          id,
			"action_type": atype,
			"ip_address":  ip,
			"user_agent":  ua,
			"metadata":    json.RawMessage(metadata),
			"created_at":  createdAt,
		})
	}
	return out, total, nil
}

// OrgGetUserSecurityEvents returns security-relevant activity events for a user.
// GET /api/v1/organization/users/:id/security-events
func OrgGetUserSecurityEvents(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	page, limit = utils.NormalizePaginationParams(page, limit)

	securityTypes := []string{
		"login", "failed_login", "logout",
		"password_change", "password_reset_request",
		"session_terminate", "account_lockout",
	}

	events, total, err := queryActivityEvents(c.Context(), userID, securityTypes, page, limit)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch security events", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"events": events,
		"pagination": map[string]interface{}{
			"total_records": total,
			"total_pages":   totalPages,
			"current_page":  page,
			"has_next":      page < totalPages,
			"has_prev":      page > 1,
		},
	}, "Security events retrieved successfully")
}

// OrgGetUserLoginHistory returns login and failed-login events for a user.
// GET /api/v1/organization/users/:id/login-history
func OrgGetUserLoginHistory(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	page, limit = utils.NormalizePaginationParams(page, limit)

	logins, total, err := queryActivityEvents(c.Context(), userID, []string{"login", "failed_login"}, page, limit)
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch login history", err)
	}

	for i := range logins {
		logins[i]["success"] = logins[i]["action_type"] == "login"
		ua, _ := logins[i]["user_agent"].(string)
		logins[i]["device"] = parseDeviceHint(ua)
		logins[i]["browser"] = parseBrowserHint(ua)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"logins": logins,
		"pagination": map[string]interface{}{
			"total_records": total,
			"total_pages":   totalPages,
			"current_page":  page,
			"has_next":      page < totalPages,
			"has_prev":      page > 1,
		},
	}, "Login history retrieved successfully")
}

// OrgGetUserWorkStats returns work statistics for a user, scoped to the caller's organization.
// GET /api/v1/organization/users/:id/work-stats
//
// Assumes the following columns exist on the listed tables:
//   - requisitions, purchase_orders, payment_vouchers, goods_received_notes, budgets:
//     created_by, organization_id, deleted_at
//   - workflow_assignments: approver_id, status
//   - user_activity_logs: user_id, created_at
func OrgGetUserWorkStats(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	ctx := c.Context()
	orgID := tenant.OrganizationID

	docTypes := []struct {
		table string
		key   string
	}{
		{"requisitions", "requisitions"},
		{"purchase_orders", "purchase_orders"},
		{"payment_vouchers", "payment_vouchers"},
		{"goods_received_notes", "grns"},
		{"budgets", "budgets"},
	}

	docCounts := map[string]int64{}
	var totalDocs int64
	for _, dt := range docTypes {
		var cnt int64
		// table name is from a fixed in-code list, safe to interpolate
		sql := fmt.Sprintf(
			`SELECT COUNT(*) FROM %s WHERE created_by = $1 AND organization_id = $2 AND deleted_at IS NULL`,
			dt.table,
		)
		if err := config.PgxDB.QueryRow(ctx, sql, userID, orgID).Scan(&cnt); err == nil {
			docCounts[dt.key] = cnt
			totalDocs += cnt
		}
	}

	var totalApprovals, approvedCount, rejectedCount int64
	_ = config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_assignments WHERE approver_id = $1 AND UPPER(status) IN ('APPROVED','REJECTED')`,
		userID,
	).Scan(&totalApprovals)
	_ = config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_assignments WHERE approver_id = $1 AND UPPER(status) = 'APPROVED'`,
		userID,
	).Scan(&approvedCount)
	_ = config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_assignments WHERE approver_id = $1 AND UPPER(status) = 'REJECTED'`,
		userID,
	).Scan(&rejectedCount)

	var pendingTasks int64
	_ = config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_assignments WHERE approver_id = $1 AND UPPER(status) IN ('PENDING','CLAIMED')`,
		userID,
	).Scan(&pendingTasks)

	var recentActivity int64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	_ = config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM user_activity_logs WHERE user_id = $1 AND created_at >= $2`,
		userID, thirtyDaysAgo,
	).Scan(&recentActivity)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"documents_created": map[string]interface{}{
			"total":     totalDocs,
			"breakdown": docCounts,
		},
		"approvals": map[string]interface{}{
			"total":    totalApprovals,
			"approved": approvedCount,
			"rejected": rejectedCount,
		},
		"pending_tasks":         pendingTasks,
		"activity_last_30_days": recentActivity,
	}, "User statistics retrieved successfully")
}

// OrgGetUserSessions returns active sessions for a user, scoped to the caller's organization.
// GET /api/v1/organization/users/:id/sessions
func OrgGetUserSessions(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	rows, err := config.PgxDB.Query(c.Context(),
		`SELECT id, user_id, COALESCE(ip_address,'') AS ip_address,
			COALESCE(user_agent,'') AS user_agent, created_at, expires_at
		 FROM sessions WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to load sessions", err)
	}
	defer rows.Close()

	now := time.Now()
	sessions := []map[string]interface{}{}
	for rows.Next() {
		var (
			id, uid, ip, ua      string
			createdAt, expiresAt time.Time
		)
		if err := rows.Scan(&id, &uid, &ip, &ua, &createdAt, &expiresAt); err != nil {
			continue
		}
		sessions = append(sessions, map[string]interface{}{
			"id":          id,
			"user_id":     uid,
			"ip_address":  ip,
			"user_agent":  ua,
			"created_at":  createdAt,
			"expires_at":  expiresAt,
			"browser":     parseBrowserHint(ua),
			"os":          parseOSHint(ua),
			"device_type": parseDeviceHint(ua),
			"is_expired":  expiresAt.Before(now),
		})
	}

	return utils.SendSimpleSuccess(c, sessions, "User sessions retrieved successfully")
}

// OrgTerminateUserSession terminates a specific session for a user.
// DELETE /api/v1/organization/users/:id/sessions/:sessionId
func OrgTerminateUserSession(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	sessionID := c.Params("sessionId")
	_, _ = config.PgxDB.Exec(c.Context(),
		`DELETE FROM sessions WHERE id = $1 AND user_id = $2`, sessionID, userID,
	)

	return utils.SendSimpleSuccess(c, nil, "Session terminated successfully")
}

// OrgTerminateAllUserSessions terminates all sessions for a user.
// DELETE /api/v1/organization/users/:id/sessions
func OrgTerminateAllUserSessions(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	userID := c.Params("id")
	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	_, _ = config.PgxDB.Exec(c.Context(),
		`DELETE FROM sessions WHERE user_id = $1`, userID,
	)

	return utils.SendSimpleSuccess(c, nil, "All sessions terminated successfully")
}

// OrgImpersonateUser generates a short-lived impersonation token for a user in the caller's organization.
// Only the org admin may call this. The token is valid for 15 minutes and all usage is audit-logged.
// POST /api/v1/organization/users/:id/impersonate
func OrgImpersonateUser(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	if tenant.UserRole != "admin" {
		return utils.SendForbiddenError(c, "Admin access required to impersonate users")
	}

	callerID, _ := c.Locals("userID").(string)
	userID := c.Params("id")

	if userID == callerID {
		return utils.SendBadRequestError(c, "You cannot impersonate yourself")
	}

	if err := orgMemberGuard(c, tenant.OrganizationID, userID); err != nil {
		return err
	}

	ctx := c.Context()

	var (
		uid, email, name string
		role             string
		active           bool
	)
	err = config.PgxDB.QueryRow(ctx,
		`SELECT id, email, name, COALESCE(role, ''), active FROM users
		 WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
		userID,
	).Scan(&uid, &email, &name, &role, &active)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFoundError(c, "User not found")
		}
		return utils.SendInternalError(c, "Failed to load user", err)
	}

	if !active {
		return utils.SendBadRequestError(c, "Cannot impersonate an inactive or suspended user")
	}

	if role == "" {
		role = "requester"
	}

	const impersonationDuration = 15 * time.Minute
	orgID := tenant.OrganizationID
	tokenInfo, err := utils.GenerateTokenWithInfo(userID, email, name, role, &orgID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to generate impersonation token", err)
	}

	now := time.Now()
	expiresAt := now.Add(impersonationDuration)

	// Caller email for audit log
	var callerEmail string
	_ = config.PgxDB.QueryRow(ctx,
		`SELECT email FROM users WHERE id = $1 LIMIT 1`, callerID,
	).Scan(&callerEmail)

	// Dedicated impersonation_logs table
	_, _ = config.PgxDB.Exec(ctx, `
		INSERT INTO impersonation_logs (
			id, impersonator_id, impersonator_email, target_id, target_email,
			impersonation_type, token_jti, expires_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		utils.GenerateID(), callerID, callerEmail, userID, email,
		"platform_user", tokenInfo.JTI, expiresAt, now,
	)

	// Generic admin audit log
	_, _ = config.PgxDB.Exec(ctx, `
		INSERT INTO admin_audit_logs (id, action, admin_user_id, new_value, description, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		utils.GenerateID(), "user_impersonation", callerID, userID,
		"Org admin impersonated user: "+email, now,
	)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"token":      tokenInfo.Token,
		"expires_in": int(impersonationDuration.Seconds()),
		"impersonated_user": map[string]interface{}{
			"id":    userID,
			"email": email,
			"name":  name,
		},
		"warning": "This is a short-lived token for impersonation purposes. All actions will be logged.",
	}, "Impersonation token generated successfully")
}
