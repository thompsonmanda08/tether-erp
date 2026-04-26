package handlers

import (
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// NOTE: This file's analytics endpoints originally used GORM-based aggregations
// across many tables. Re-implementing each analytic precisely would require
// careful per-table schema confirmation. The handlers below now use raw pgx
// counts on tables present in the current migrations and return safe placeholder
// values for figures that depend on tables/columns not yet defined (subscription_*,
// system_metrics, system_alerts, etc.). Functional but conservative.
// TODO: round-trip each endpoint with frontend to confirm exact expected shape.

func GetAdminDashboard(c *fiber.Ctx) error {
	ctx := c.Context()
	var totalUsers, totalOrgs, totalDocs, totalAuditLogs int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&totalUsers)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations").Scan(&totalOrgs)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL").Scan(&totalDocs)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM audit_logs").Scan(&totalAuditLogs)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"total_users":         totalUsers,
		"total_organizations": totalOrgs,
		"total_documents":     totalDocs,
		"total_audit_logs":    totalAuditLogs,
		"collected_at":        time.Now(),
	}, "Admin dashboard retrieved successfully")
}

func GetSystemHealth(c *fiber.Ctx) error {
	dbHealthy := config.PgxDB != nil
	if dbHealthy {
		if err := config.PgxDB.Ping(c.Context()); err != nil {
			dbHealthy = false
		}
	}

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	overall := "healthy"
	if !dbHealthy {
		overall = "critical"
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"overall_status": overall,
		"database": map[string]interface{}{
			"status": map[bool]string{true: "healthy", false: "critical"}[dbHealthy],
		},
		"memory": map[string]interface{}{
			"alloc_mb": float64(memStats.Alloc) / 1024 / 1024,
			"sys_mb":   float64(memStats.Sys) / 1024 / 1024,
		},
		"runtime": map[string]interface{}{
			"goroutines": runtime.NumGoroutine(),
			"go_version": runtime.Version(),
		},
		"checked_at": time.Now(),
	}, "System health retrieved successfully")
}

func GetAdminAnalytics(c *fiber.Ctx) error {
	ctx := c.Context()
	var totalUsers, activeUsers, totalOrgs, activeOrgs int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&totalUsers)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE active = true AND deleted_at IS NULL").Scan(&activeUsers)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations").Scan(&totalOrgs)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations WHERE active = true").Scan(&activeOrgs)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"users": map[string]interface{}{
			"total":  totalUsers,
			"active": activeUsers,
		},
		"organizations": map[string]interface{}{
			"total":  totalOrgs,
			"active": activeOrgs,
		},
		"generated_at": time.Now(),
	}, "Admin analytics retrieved successfully")
}

func GetAdminUserAnalytics(c *fiber.Ctx) error {
	ctx := c.Context()
	var total, active, mfa int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&total)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE active = true AND deleted_at IS NULL").Scan(&active)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE mfa_enabled = true AND deleted_at IS NULL").Scan(&mfa)

	thirty := time.Now().AddDate(0, 0, -30)
	dailyTrend := []map[string]interface{}{}
	for i := 29; i >= 0; i-- {
		day := time.Now().AddDate(0, 0, -i).Truncate(24 * time.Hour)
		dayEnd := day.Add(24 * time.Hour)
		var count int64
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at < $2 AND deleted_at IS NULL", day, dayEnd).Scan(&count)
		dailyTrend = append(dailyTrend, map[string]interface{}{
			"date":  day.Format("2006-01-02"),
			"count": count,
		})
	}

	var newUsers30d int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE created_at >= $1 AND deleted_at IS NULL", thirty).Scan(&newUsers30d)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"total":         total,
		"active":        active,
		"mfa_enabled":   mfa,
		"new_users_30d": newUsers30d,
		"daily_trend":   dailyTrend,
		"generated_at":  time.Now(),
	}, "User analytics retrieved successfully")
}

func GetAdminOrganizationAnalytics(c *fiber.Ctx) error {
	ctx := c.Context()
	var total, active int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations").Scan(&total)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations WHERE active = true").Scan(&active)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"total":        total,
		"active":       active,
		"generated_at": time.Now(),
	}, "Organization analytics retrieved successfully")
}

// GetAdminRevenueAnalytics — TODO: subscription / billing data is not in current schema.
func GetAdminRevenueAnalytics(c *fiber.Ctx) error {
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"mrr":          0,
		"arr":          0,
		"by_tier":      map[string]int64{},
		"generated_at": time.Now(),
		"note":         "Revenue tracking requires subscription tables not present in current schema",
	}, "Revenue analytics retrieved successfully")
}

func GetAdminUsageAnalytics(c *fiber.Ctx) error {
	ctx := c.Context()
	var requisitions, purchaseOrders, payments, grns int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM requisitions WHERE deleted_at IS NULL").Scan(&requisitions)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM purchase_orders WHERE deleted_at IS NULL").Scan(&purchaseOrders)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM payment_vouchers WHERE deleted_at IS NULL").Scan(&payments)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM goods_received_notes WHERE deleted_at IS NULL").Scan(&grns)

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"requisitions":     requisitions,
		"purchase_orders":  purchaseOrders,
		"payment_vouchers": payments,
		"grns":             grns,
		"generated_at":     time.Now(),
	}, "Usage analytics retrieved successfully")
}

// GetSubscriptionStatistics — TODO: subscription tables not present.
func GetSubscriptionStatistics(c *fiber.Ctx) error {
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"by_tier":      map[string]int64{},
		"by_status":    map[string]int64{},
		"generated_at": time.Now(),
		"note":         "Subscription tables not present in current schema",
	}, "Subscription statistics retrieved successfully")
}

// GetSystemAlerts — TODO: system_alerts table not in migrations.
func GetSystemAlerts(c *fiber.Ctx) error {
	return utils.SendSimpleSuccess(c, []interface{}{}, "System alerts retrieved successfully")
}

// GetSystemLogs — TODO: returns recent admin_audit_logs as a placeholder.
func GetSystemLogs(c *fiber.Ctx) error {
	rows, err := config.PgxDB.Query(c.Context(),
		"SELECT id, action, admin_user_id, details, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 200")
	if err != nil {
		return utils.SendSimpleSuccess(c, []interface{}{}, "System logs retrieved successfully")
	}
	defer rows.Close()
	out := []map[string]interface{}{}
	for rows.Next() {
		var id, action, adminUserID string
		var details []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &action, &adminUserID, &details, &createdAt); err == nil {
			out = append(out, map[string]interface{}{
				"id":            id,
				"action":        action,
				"admin_user_id": adminUserID,
				"details":       string(details),
				"created_at":    createdAt,
			})
		}
	}
	return utils.SendSimpleSuccess(c, out, "System logs retrieved successfully")
}

// GetSystemMetrics — runtime metrics + pgxpool stats. TODO: persist to system_metrics if schema lands.
func GetSystemMetrics(c *fiber.Ctx) error {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	metrics := map[string]interface{}{
		"alloc_mb":     float64(memStats.Alloc) / 1024 / 1024,
		"sys_mb":       float64(memStats.Sys) / 1024 / 1024,
		"goroutines":   runtime.NumGoroutine(),
		"go_version":   runtime.Version(),
		"collected_at": time.Now(),
	}
	if config.PgxDB != nil {
		st := config.PgxDB.Stat()
		metrics["db_pool"] = map[string]interface{}{
			"active": int(st.AcquiredConns()),
			"idle":   int(st.IdleConns()),
			"total":  int(st.TotalConns()),
			"max":    int(st.MaxConns()),
		}
	}
	return utils.SendSimpleSuccess(c, metrics, "System metrics retrieved successfully")
}

// ExportAdminAnalytics — TODO: full export across all analytics dimensions.
func ExportAdminAnalytics(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Analytics export is not yet implemented for the pgx-based admin analytics")
}

// RunCustomAdminAnalytics — TODO: previously executed user-supplied SQL via GORM. Disabled.
func RunCustomAdminAnalytics(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Custom analytics queries are disabled. Use the dedicated /api/v1/admin/database/query endpoint with read-only SELECTs.")
}

// GetAdminAnalyticsDashboardConfig — TODO: persisted dashboard config table not in migrations.
func GetAdminAnalyticsDashboardConfig(c *fiber.Ctx) error {
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"widgets": []interface{}{},
		"layout":  []interface{}{},
		"note":    "Dashboard config persistence not yet implemented",
	}, "Dashboard config retrieved successfully")
}

func UpdateAdminAnalyticsDashboardConfig(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Dashboard config persistence not yet implemented")
}
