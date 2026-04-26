package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// adminAuditLogRow represents a row from the admin_audit_logs table.
// NOTE: admin_audit_logs is NOT in migrations 00001/00003. The table is referenced
// by these handlers and may be created by an out-of-band migration; the SQL below
// uses columns id, organization_id, action, admin_user_id, details (jsonb), created_at.
// TODO: confirm columns once migration is added; flagged for review.
type adminAuditLogRow struct {
	ID             string          `json:"id"`
	OrganizationID *string         `json:"organization_id"`
	Action         string          `json:"action"`
	AdminUserID    string          `json:"admin_user_id"`
	Details        json.RawMessage `json:"details"`
	CreatedAt      time.Time       `json:"created_at"`
}

func deriveActionType(action string) string {
	parts := strings.Split(action, ".")
	if len(parts) > 1 {
		return parts[len(parts)-1]
	}
	parts = strings.Split(action, "_")
	if len(parts) > 0 {
		return parts[0]
	}
	return action
}

func deriveResourceType(action string) string {
	parts := strings.Split(action, ".")
	if len(parts) > 1 {
		return parts[0]
	}
	parts = strings.Split(action, "_")
	if len(parts) > 0 {
		return parts[0]
	}
	return "system"
}

func deriveSeverity(action string) string {
	lower := strings.ToLower(action)
	switch {
	case strings.Contains(lower, "delete") || strings.Contains(lower, "remove"):
		return "high"
	case strings.Contains(lower, "fail") || strings.Contains(lower, "error") || strings.Contains(lower, "unauthorized"):
		return "critical"
	case strings.Contains(lower, "update") || strings.Contains(lower, "edit") || strings.Contains(lower, "modify"):
		return "medium"
	case strings.Contains(lower, "login") || strings.Contains(lower, "logout") || strings.Contains(lower, "password"):
		return "medium"
	default:
		return "low"
	}
}

func deriveStatus(action string) string {
	lower := strings.ToLower(action)
	if strings.Contains(lower, "fail") || strings.Contains(lower, "error") {
		return "failure"
	}
	return "success"
}

func mapAuditLogRow(row adminAuditLogRow) map[string]interface{} {
	var detailsMap map[string]interface{}
	if row.Details != nil {
		_ = json.Unmarshal(row.Details, &detailsMap)
	}
	if detailsMap == nil {
		detailsMap = map[string]interface{}{}
	}

	userName, _ := detailsMap["user_name"].(string)
	userEmail, _ := detailsMap["user_email"].(string)
	orgName, _ := detailsMap["organization_name"].(string)
	resourceID, _ := detailsMap["resource_id"].(string)
	ipAddress, _ := detailsMap["ip_address"].(string)
	userAgent, _ := detailsMap["user_agent"].(string)

	metadata := map[string]interface{}{
		"ip_address": ipAddress,
		"user_agent": userAgent,
	}

	return map[string]interface{}{
		"id":                row.ID,
		"action":            row.Action,
		"action_type":       deriveActionType(row.Action),
		"user_id":           row.AdminUserID,
		"user_name":         userName,
		"user_email":        userEmail,
		"organization_id":   row.OrganizationID,
		"organization_name": orgName,
		"resource_type":     deriveResourceType(row.Action),
		"resource_id":       resourceID,
		"details":           detailsMap,
		"metadata":          metadata,
		"timestamp":         row.CreatedAt,
		"severity":          deriveSeverity(row.Action),
		"status":            deriveStatus(row.Action),
		"duration_ms":       nil,
	}
}

// queryFilter accumulates raw SQL where-clauses with $-style placeholders.
type queryFilter struct {
	conds []string
	args  []interface{}
}

func (q *queryFilter) add(cond string, args ...interface{}) {
	// Replace single ? with $N positional placeholders.
	for _, a := range args {
		q.args = append(q.args, a)
		ph := fmt.Sprintf("$%d", len(q.args))
		cond = strings.Replace(cond, "?", ph, 1)
	}
	q.conds = append(q.conds, cond)
}

func (q *queryFilter) addRaw(cond string) {
	q.conds = append(q.conds, cond)
}

func (q *queryFilter) where() string {
	if len(q.conds) == 0 {
		return ""
	}
	return " WHERE " + strings.Join(q.conds, " AND ")
}

func scanAuditLogRows(rows pgx.Rows) ([]adminAuditLogRow, error) {
	defer rows.Close()
	out := []adminAuditLogRow{}
	for rows.Next() {
		var r adminAuditLogRow
		var details []byte
		if err := rows.Scan(&r.ID, &r.OrganizationID, &r.Action, &r.AdminUserID, &details, &r.CreatedAt); err != nil {
			return nil, err
		}
		r.Details = json.RawMessage(details)
		out = append(out, r)
	}
	return out, rows.Err()
}

// GetAdminAuditLogs returns a paginated and filtered list of admin audit logs.
func GetAdminAuditLogs(c *fiber.Ctx) error {
	ctx := c.Context()
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	page, limit = utils.NormalizePaginationParams(page, limit)

	f := &queryFilter{}

	if v := c.Query("user_id"); v != "" {
		f.add("admin_user_id = ?", v)
	}
	if v := c.Query("organization_id"); v != "" {
		f.add("organization_id = ?", v)
	}
	if v := c.Query("action_type"); v != "" {
		f.add("action ILIKE ?", "%"+v+"%")
	}
	if v := c.Query("resource_type"); v != "" {
		f.add("action ILIKE ?", v+".%")
	}
	if v := c.Query("search"); v != "" {
		p := "%" + v + "%"
		f.add("(action ILIKE ? OR details::text ILIKE ?)", p, p)
	}
	if v := c.Query("ip_address"); v != "" {
		f.add("details->>'ip_address' = ?", v)
	}
	if v := c.Query("severity"); v != "" {
		switch v {
		case "critical":
			f.addRaw("(action ILIKE '%fail%' OR action ILIKE '%error%' OR action ILIKE '%unauthorized%')")
		case "high":
			f.addRaw("(action ILIKE '%delete%' OR action ILIKE '%remove%')")
		case "medium":
			f.addRaw("(action ILIKE '%update%' OR action ILIKE '%edit%' OR action ILIKE '%login%' OR action ILIKE '%logout%' OR action ILIKE '%password%')")
		case "low":
			f.addRaw("(action NOT ILIKE '%fail%' AND action NOT ILIKE '%error%' AND action NOT ILIKE '%unauthorized%' AND action NOT ILIKE '%delete%' AND action NOT ILIKE '%remove%' AND action NOT ILIKE '%update%' AND action NOT ILIKE '%edit%' AND action NOT ILIKE '%login%' AND action NOT ILIKE '%logout%' AND action NOT ILIKE '%password%')")
		}
	}
	if v := c.Query("status"); v != "" {
		switch v {
		case "failure":
			f.addRaw("(action ILIKE '%fail%' OR action ILIKE '%error%')")
		case "success":
			f.addRaw("(action NOT ILIKE '%fail%' AND action NOT ILIKE '%error%')")
		}
	}

	if v := c.Query("date_range"); v != "" {
		now := time.Now()
		switch v {
		case "today":
			f.add("created_at >= ?", now.Truncate(24*time.Hour))
		case "yesterday":
			yesterday := now.AddDate(0, 0, -1).Truncate(24 * time.Hour)
			f.add("created_at >= ? AND created_at < ?", yesterday, now.Truncate(24*time.Hour))
		case "last_7_days":
			f.add("created_at >= ?", now.AddDate(0, 0, -7))
		case "last_30_days":
			f.add("created_at >= ?", now.AddDate(0, 0, -30))
		case "last_90_days":
			f.add("created_at >= ?", now.AddDate(0, 0, -90))
		}
	}
	if v := c.Query("start_date"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.add("created_at >= ?", t)
		}
	}
	if v := c.Query("end_date"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.add("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	whereSQL := f.where()

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs"+whereSQL, f.args...).Scan(&total); err != nil {
		log.Printf("Error counting admin audit logs: %v", err)
		return utils.SendInternalError(c, "Failed to count audit logs", err)
	}

	offset := (page - 1) * limit
	args := append([]interface{}{}, f.args...)
	args = append(args, limit, offset)
	q := fmt.Sprintf(
		"SELECT id, organization_id, action, admin_user_id, details, created_at FROM admin_audit_logs%s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		whereSQL, len(args)-1, len(args),
	)
	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		log.Printf("Error fetching admin audit logs: %v", err)
		return utils.SendInternalError(c, "Failed to fetch audit logs", err)
	}
	scanned, err := scanAuditLogRows(rows)
	if err != nil {
		return utils.SendInternalError(c, "Failed to scan audit logs", err)
	}

	results := make([]map[string]interface{}, 0, len(scanned))
	for _, row := range scanned {
		results = append(results, mapAuditLogRow(row))
	}

	return utils.SendPaginatedSuccess(c, results, "Audit logs retrieved successfully", page, limit, total)
}

func GetAdminAuditLogStats(c *fiber.Ctx) error {
	ctx := c.Context()

	var totalLogs int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs").Scan(&totalLogs); err != nil {
		log.Printf("Error counting total audit logs: %v", err)
		return utils.SendInternalError(c, "Failed to fetch audit log stats", err)
	}

	today := time.Now().Truncate(24 * time.Hour)
	var logsToday, failedActions, criticalEvents, uniqueUsers int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE created_at >= $1", today).Scan(&logsToday)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE action ILIKE '%fail%' OR action ILIKE '%error%'").Scan(&failedActions)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE action ILIKE '%unauthorized%' OR action ILIKE '%delete%' OR action ILIKE '%remove%'").Scan(&criticalEvents)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(DISTINCT admin_user_id) FROM admin_audit_logs").Scan(&uniqueUsers)

	topActionsFormatted := []map[string]interface{}{}
	rows, err := config.PgxDB.Query(ctx, "SELECT action, COUNT(*) as count FROM admin_audit_logs GROUP BY action ORDER BY count DESC LIMIT 10")
	if err == nil {
		for rows.Next() {
			var a string
			var ct int64
			if err := rows.Scan(&a, &ct); err == nil {
				pct := float64(0)
				if totalLogs > 0 {
					pct = float64(ct) / float64(totalLogs) * 100
				}
				topActionsFormatted = append(topActionsFormatted, map[string]interface{}{
					"action": a, "count": ct, "percentage": pct,
				})
			}
		}
		rows.Close()
	}

	activityByHour := make([]map[string]interface{}, 0, 24)
	for h := 0; h < 24; h++ {
		hourStart := today.Add(time.Duration(h) * time.Hour)
		hourEnd := hourStart.Add(time.Hour)
		var hourCount, hourFailedCount int64
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE created_at >= $1 AND created_at < $2", hourStart, hourEnd).Scan(&hourCount)
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE created_at >= $1 AND created_at < $2 AND (action ILIKE '%fail%' OR action ILIKE '%error%')", hourStart, hourEnd).Scan(&hourFailedCount)
		activityByHour = append(activityByHour, map[string]interface{}{
			"hour": h, "count": hourCount, "failed_count": hourFailedCount,
		})
	}

	var failedLogins, suspiciousActivities, policyViolations, unauthorizedAttempts int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE action ILIKE '%login%fail%' OR action ILIKE '%login_fail%'").Scan(&failedLogins)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE action ILIKE '%suspicious%'").Scan(&suspiciousActivities)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE action ILIKE '%policy%violation%'").Scan(&policyViolations)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE action ILIKE '%unauthorized%'").Scan(&unauthorizedAttempts)

	stats := map[string]interface{}{
		"total_logs":       totalLogs,
		"logs_today":       logsToday,
		"failed_actions":   failedActions,
		"critical_events":  criticalEvents,
		"unique_users":     uniqueUsers,
		"top_actions":      topActionsFormatted,
		"activity_by_hour": activityByHour,
		"security_events": map[string]interface{}{
			"failed_logins":                failedLogins,
			"suspicious_activities":        suspiciousActivities,
			"policy_violations":            policyViolations,
			"unauthorized_access_attempts": unauthorizedAttempts,
		},
	}
	return utils.SendSimpleSuccess(c, stats, "Audit log stats retrieved successfully")
}

func GetAdminAuditLogAnalytics(c *fiber.Ctx) error {
	ctx := c.Context()

	var totalLogs int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs").Scan(&totalLogs)

	dailyTrend := make([]map[string]interface{}, 0, 30)
	for i := 29; i >= 0; i-- {
		day := time.Now().AddDate(0, 0, -i).Truncate(24 * time.Hour)
		dayEnd := day.Add(24 * time.Hour)
		var dayCount int64
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs WHERE created_at >= $1 AND created_at < $2", day, dayEnd).Scan(&dayCount)
		dailyTrend = append(dailyTrend, map[string]interface{}{
			"date": day.Format("2006-01-02"), "count": dayCount,
		})
	}

	actionDistribution := []map[string]interface{}{}
	rows, err := config.PgxDB.Query(ctx, "SELECT action, COUNT(*) as count FROM admin_audit_logs GROUP BY action ORDER BY count DESC LIMIT 15")
	if err == nil {
		for rows.Next() {
			var a string
			var ct int64
			if err := rows.Scan(&a, &ct); err == nil {
				pct := float64(0)
				if totalLogs > 0 {
					pct = float64(ct) / float64(totalLogs) * 100
				}
				actionDistribution = append(actionDistribution, map[string]interface{}{
					"action": a, "count": ct, "percentage": pct,
				})
			}
		}
		rows.Close()
	}

	topUsersFormatted := []map[string]interface{}{}
	rows2, err := config.PgxDB.Query(ctx, "SELECT admin_user_id, COUNT(*) as count FROM admin_audit_logs GROUP BY admin_user_id ORDER BY count DESC LIMIT 10")
	if err == nil {
		for rows2.Next() {
			var uid string
			var ct int64
			if err := rows2.Scan(&uid, &ct); err == nil {
				topUsersFormatted = append(topUsersFormatted, map[string]interface{}{
					"user_id": uid, "count": ct,
				})
			}
		}
		rows2.Close()
	}

	peakHoursFormatted := []map[string]interface{}{}
	rows3, err := config.PgxDB.Query(ctx, "SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as count FROM admin_audit_logs GROUP BY hour ORDER BY count DESC")
	if err == nil {
		for rows3.Next() {
			var h int
			var ct int64
			if err := rows3.Scan(&h, &ct); err == nil {
				peakHoursFormatted = append(peakHoursFormatted, map[string]interface{}{
					"hour": h, "count": ct,
				})
			}
		}
		rows3.Close()
	}

	analytics := map[string]interface{}{
		"total_logs":          totalLogs,
		"daily_trend":         dailyTrend,
		"action_distribution": actionDistribution,
		"top_users":           topUsersFormatted,
		"peak_hours":          peakHoursFormatted,
		"generated_at":        time.Now(),
	}
	return utils.SendSimpleSuccess(c, analytics, "Audit log analytics retrieved successfully")
}

func GetAdminAuditLogByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.SendBadRequest(c, "Audit log ID is required")
	}

	var r adminAuditLogRow
	var details []byte
	err := config.PgxDB.QueryRow(c.Context(),
		"SELECT id, organization_id, action, admin_user_id, details, created_at FROM admin_audit_logs WHERE id = $1", id).
		Scan(&r.ID, &r.OrganizationID, &r.Action, &r.AdminUserID, &details, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Audit log not found")
		}
		return utils.SendInternalError(c, "Failed to fetch audit log", err)
	}
	r.Details = json.RawMessage(details)
	return utils.SendSimpleSuccess(c, mapAuditLogRow(r), "Audit log retrieved successfully")
}

func ExportAdminAuditLogs(c *fiber.Ctx) error {
	ctx := c.Context()
	f := &queryFilter{}

	if v := c.Query("user_id"); v != "" {
		f.add("admin_user_id = ?", v)
	}
	if v := c.Query("organization_id"); v != "" {
		f.add("organization_id = ?", v)
	}
	if v := c.Query("action_type"); v != "" {
		f.add("action ILIKE ?", "%"+v+"%")
	}
	if v := c.Query("search"); v != "" {
		p := "%" + v + "%"
		f.add("(action ILIKE ? OR details::text ILIKE ?)", p, p)
	}
	if v := c.Query("date_range"); v != "" {
		now := time.Now()
		switch v {
		case "1h":
			f.add("created_at >= ?", now.Add(-1*time.Hour))
		case "24h":
			f.add("created_at >= ?", now.Add(-24*time.Hour))
		case "7d":
			f.add("created_at >= ?", now.AddDate(0, 0, -7))
		case "30d":
			f.add("created_at >= ?", now.AddDate(0, 0, -30))
		case "90d":
			f.add("created_at >= ?", now.AddDate(0, 0, -90))
		}
	}
	if v := c.Query("start_date"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.add("created_at >= ?", t)
		}
	}
	if v := c.Query("end_date"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.add("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	q := "SELECT id, organization_id, action, admin_user_id, details, created_at FROM admin_audit_logs" +
		f.where() + " ORDER BY created_at DESC LIMIT 10000"
	rows, err := config.PgxDB.Query(ctx, q, f.args...)
	if err != nil {
		log.Printf("Error exporting audit logs: %v", err)
		return utils.SendInternalError(c, "Failed to export audit logs", err)
	}
	scanned, err := scanAuditLogRows(rows)
	if err != nil {
		return utils.SendInternalError(c, "Failed to scan audit logs", err)
	}

	results := make([]map[string]interface{}, 0, len(scanned))
	for _, row := range scanned {
		results = append(results, mapAuditLogRow(row))
	}

	exportData := map[string]interface{}{
		"logs":        results,
		"total_count": len(results),
		"exported_at": time.Now().Format(time.RFC3339),
		"filters_applied": map[string]string{
			"user_id":     c.Query("user_id"),
			"action_type": c.Query("action_type"),
			"date_range":  c.Query("date_range"),
			"search":      c.Query("search"),
		},
	}
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=audit-logs-export-%s.json", time.Now().Format("2006-01-02")))
	c.Set("Content-Type", "application/json")
	return c.JSON(exportData)
}

func GetAdminAuditLogSecurityEvents(c *fiber.Ctx) error {
	ctx := c.Context()
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	page, limit = utils.NormalizePaginationParams(page, limit)

	patterns := []string{
		"%login%", "%logout%", "%password%", "%reset%",
		"%unauthorized%", "%permission%", "%role%",
		"%token%", "%session%", "%mfa%", "%2fa%",
		"%lock%", "%ban%", "%suspend%",
	}
	conds := make([]string, 0, len(patterns))
	args := make([]interface{}, 0, len(patterns))
	for i, p := range patterns {
		conds = append(conds, fmt.Sprintf("action ILIKE $%d", i+1))
		args = append(args, p)
	}
	whereClause := " WHERE " + strings.Join(conds, " OR ")

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM admin_audit_logs"+whereClause, args...).Scan(&total); err != nil {
		log.Printf("Error counting security events: %v", err)
		return utils.SendInternalError(c, "Failed to count security events", err)
	}

	offset := (page - 1) * limit
	args = append(args, limit, offset)
	q := fmt.Sprintf(
		"SELECT id, organization_id, action, admin_user_id, details, created_at FROM admin_audit_logs%s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		whereClause, len(args)-1, len(args),
	)
	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		log.Printf("Error fetching security events: %v", err)
		return utils.SendInternalError(c, "Failed to fetch security events", err)
	}
	scanned, err := scanAuditLogRows(rows)
	if err != nil {
		return utils.SendInternalError(c, "Failed to scan security events", err)
	}

	results := make([]map[string]interface{}, 0, len(scanned))
	for _, row := range scanned {
		results = append(results, mapAuditLogRow(row))
	}
	return utils.SendPaginatedSuccess(c, results, "Security events retrieved successfully", page, limit, total)
}

func CreateAdminAuditLog(c *fiber.Ctx) error {
	userID, _ := c.Locals("userID").(string)

	var req struct {
		Action         string                 `json:"action"`
		OrganizationID *string                `json:"organization_id"`
		Details        map[string]interface{} `json:"details"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if req.Action == "" {
		return utils.SendBadRequest(c, "Action is required")
	}

	var detailsJSON []byte
	if req.Details != nil {
		b, err := json.Marshal(req.Details)
		if err != nil {
			return utils.SendBadRequest(c, "Invalid details format")
		}
		detailsJSON = b
	} else {
		detailsJSON = []byte("{}")
	}

	id := utils.GenerateID()
	now := time.Now()

	_, err := config.PgxDB.Exec(c.Context(),
		`INSERT INTO admin_audit_logs (id, organization_id, action, admin_user_id, details, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		id, req.OrganizationID, req.Action, userID, detailsJSON, now,
	)
	if err != nil {
		log.Printf("Error creating admin audit log: %v", err)
		return utils.SendInternalError(c, "Failed to create audit log entry", err)
	}

	row := adminAuditLogRow{
		ID:             id,
		OrganizationID: req.OrganizationID,
		Action:         req.Action,
		AdminUserID:    userID,
		Details:        detailsJSON,
		CreatedAt:      now,
	}
	return utils.SendCreatedSuccess(c, mapAuditLogRow(row), "Audit log entry created successfully")
}

func retentionSettingsDefaults() map[string]interface{} {
	return map[string]interface{}{
		"retention_days":        90,
		"auto_archive_enabled":  false,
		"archive_after_days":    60,
		"auto_delete_enabled":   false,
		"delete_after_days":     365,
		"compress_after_days":   30,
		"export_before_delete":  true,
		"excluded_action_types": []string{},
	}
}

func GetAdminAuditLogRetentionSettings(c *fiber.Ctx) error {
	defaults := retentionSettingsDefaults()

	var valueStr string
	var updatedAt time.Time
	err := config.PgxDB.QueryRow(c.Context(),
		`SELECT value, updated_at FROM system_settings WHERE key = $1`, "audit_log_retention").
		Scan(&valueStr, &updatedAt)

	if err == nil {
		var persisted map[string]interface{}
		if jsonErr := json.Unmarshal([]byte(valueStr), &persisted); jsonErr == nil {
			for k, v := range persisted {
				defaults[k] = v
			}
			defaults["updated_at"] = updatedAt
		}
	} else {
		defaults["updated_at"] = nil
		defaults["updated_by"] = nil
	}

	return utils.SendSimpleSuccess(c, defaults, "Retention settings retrieved successfully")
}

func UpdateAdminAuditLogRetentionSettings(c *fiber.Ctx) error {
	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}

	userID, _ := c.Locals("userID").(string)

	defaults := retentionSettingsDefaults()
	for k, v := range req {
		defaults[k] = v
	}

	settingsJSON, err := json.Marshal(defaults)
	if err != nil {
		return utils.SendInternalError(c, "Failed to serialize settings", err)
	}

	now := time.Now()
	valueStr := string(settingsJSON)
	ctx := c.Context()

	// Upsert via exists-check
	var existsID string
	checkErr := config.PgxDB.QueryRow(ctx, `SELECT id FROM system_settings WHERE key = $1`, "audit_log_retention").Scan(&existsID)
	if errors.Is(checkErr, pgx.ErrNoRows) {
		_, _ = config.PgxDB.Exec(ctx,
			`INSERT INTO system_settings (id, key, value, category, description, created_at, updated_at, created_by, updated_by)
			 VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $7)`,
			utils.GenerateID(), "audit_log_retention", valueStr, "audit",
			"Audit log retention configuration", now, userID,
		)
	} else if checkErr == nil {
		_, _ = config.PgxDB.Exec(ctx,
			`UPDATE system_settings SET value = $1, updated_at = $2, updated_by = $3 WHERE key = $4`,
			valueStr, now, userID, "audit_log_retention",
		)
	}

	// Log the change in admin_audit_logs (best-effort)
	logDetails, _ := json.Marshal(map[string]interface{}{
		"new_value":   valueStr,
		"description": fmt.Sprintf("Audit log retention settings updated by admin %s", userID),
	})
	_, _ = config.PgxDB.Exec(ctx,
		`INSERT INTO admin_audit_logs (id, action, admin_user_id, details, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		utils.GenerateID(), "retention_settings_updated", userID, logDetails, now,
	)

	defaults["updated_at"] = now
	defaults["updated_by"] = userID
	return utils.SendSimpleSuccess(c, defaults, "Retention settings updated successfully")
}

func getMapValueOrDefault(m map[string]interface{}, key string, defaultVal interface{}) interface{} {
	if val, ok := m[key]; ok {
		return val
	}
	return defaultVal
}
