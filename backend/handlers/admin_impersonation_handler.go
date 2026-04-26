package handlers

import (
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/utils"
)

func impersonationRowToMap(r db.ImpersonationLog) map[string]interface{} {
	out := map[string]interface{}{
		"id":                 r.ID,
		"impersonator_id":    r.ImpersonatorID,
		"impersonator_email": r.ImpersonatorEmail,
		"target_id":          r.TargetID,
		"target_email":       r.TargetEmail,
		"impersonation_type": r.ImpersonationType,
		"token_jti":          r.TokenJti,
		"reason":             r.Reason,
		"revoked":            r.Revoked,
		"revoked_by":         r.RevokedBy,
	}
	if r.ExpiresAt.Valid {
		out["expires_at"] = r.ExpiresAt.Time
	}
	if r.RevokedAt.Valid {
		out["revoked_at"] = r.RevokedAt.Time
	}
	if r.CreatedAt.Valid {
		out["created_at"] = r.CreatedAt.Time
	}
	return out
}

// GetImpersonationLogs returns a paginated list of impersonation events.
func GetImpersonationLogs(c *fiber.Ctx) error {
	impersonatorID := c.Query("impersonator_id")
	targetID := c.Query("target_id")
	impersonationType := c.Query("impersonation_type")
	revokedParam := c.Query("revoked")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Build raw filter SQL because the sqlc query treats column4 as bool (no IS NULL semantics for Go zero-value)
	// We use a raw query with COALESCE-like logic.
	ctx := c.Context()
	args := []interface{}{}
	where := "WHERE 1=1"

	if impersonatorID != "" {
		args = append(args, impersonatorID)
		where += " AND impersonator_id = $" + strconv.Itoa(len(args))
	}
	if targetID != "" {
		args = append(args, targetID)
		where += " AND target_id = $" + strconv.Itoa(len(args))
	}
	if impersonationType != "" {
		args = append(args, impersonationType)
		where += " AND impersonation_type = $" + strconv.Itoa(len(args))
	}
	if revokedParam == "true" {
		where += " AND revoked = true"
	} else if revokedParam == "false" {
		where += " AND revoked = false"
	}

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM impersonation_logs "+where, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count impersonation logs", err)
	}

	args = append(args, limit, offset)
	q := "SELECT id, impersonator_id, impersonator_email, target_id, target_email, impersonation_type, token_jti, reason, expires_at, revoked, revoked_at, revoked_by, created_at FROM impersonation_logs " +
		where + " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		return utils.SendInternalError(c, "Failed to retrieve impersonation logs", err)
	}
	defer rows.Close()

	logs := make([]map[string]interface{}, 0)
	for rows.Next() {
		var i db.ImpersonationLog
		if err := rows.Scan(
			&i.ID, &i.ImpersonatorID, &i.ImpersonatorEmail, &i.TargetID, &i.TargetEmail,
			&i.ImpersonationType, &i.TokenJti, &i.Reason, &i.ExpiresAt, &i.Revoked,
			&i.RevokedAt, &i.RevokedBy, &i.CreatedAt,
		); err != nil {
			return utils.SendInternalError(c, "Failed to scan impersonation log", err)
		}
		logs = append(logs, impersonationRowToMap(i))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    logs,
		"meta": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
		"message": "Impersonation logs retrieved successfully",
	})
}

// GetImpersonationLog returns a single impersonation log entry.
func GetImpersonationLog(c *fiber.Ctx) error {
	id := c.Params("id")

	row, err := config.Queries.GetImpersonationLogByID(c.Context(), db.GetImpersonationLogByIDParams{ID: id})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Impersonation log not found")
		}
		return utils.SendInternalError(c, "Failed to retrieve impersonation log", err)
	}

	return utils.SendSimpleSuccess(c, impersonationRowToMap(row), "Impersonation log retrieved successfully")
}

// RevokeImpersonationLog marks an impersonation log entry as revoked.
func RevokeImpersonationLog(c *fiber.Ctx) error {
	id := c.Params("id")
	revokerID, _ := c.Locals("userID").(string)

	existing, err := config.Queries.GetImpersonationLogByID(c.Context(), db.GetImpersonationLogByIDParams{ID: id})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Impersonation log not found")
		}
		return utils.SendInternalError(c, "Failed to load impersonation log", err)
	}

	if existing.Revoked {
		return utils.SendBadRequest(c, "Impersonation log is already revoked")
	}

	revBy := revokerID
	if err := config.Queries.RevokeImpersonationLog(c.Context(), db.RevokeImpersonationLogParams{
		ID:        id,
		RevokedBy: &revBy,
	}); err != nil {
		return utils.SendInternalError(c, "Failed to revoke impersonation log", err)
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": id}, "Impersonation log revoked successfully")
}

// GetImpersonationStats returns aggregate statistics for impersonation events.
func GetImpersonationStats(c *fiber.Ctx) error {
	ctx := c.Context()
	now := time.Now()

	var total, revoked, platformUser, adminUser, active int64
	_ = config.PgxDB.QueryRow(ctx, `SELECT COUNT(*) FROM impersonation_logs`).Scan(&total)
	_ = config.PgxDB.QueryRow(ctx, `SELECT COUNT(*) FROM impersonation_logs WHERE revoked = true`).Scan(&revoked)
	_ = config.PgxDB.QueryRow(ctx, `SELECT COUNT(*) FROM impersonation_logs WHERE impersonation_type = $1`, "platform_user").Scan(&platformUser)
	_ = config.PgxDB.QueryRow(ctx, `SELECT COUNT(*) FROM impersonation_logs WHERE impersonation_type = $1`, "admin_user").Scan(&adminUser)
	_ = config.PgxDB.QueryRow(ctx, `SELECT COUNT(*) FROM impersonation_logs WHERE expires_at > $1 AND revoked = false`, now).Scan(&active)

	thirtyDaysAgo := now.AddDate(0, 0, -30)
	topImpersonators := []map[string]interface{}{}
	rows, err := config.PgxDB.Query(ctx, `
		SELECT impersonator_id, impersonator_email, COUNT(*) as count
		FROM impersonation_logs
		WHERE created_at >= $1
		GROUP BY impersonator_id, impersonator_email
		ORDER BY count DESC
		LIMIT 5`, thirtyDaysAgo)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var impID, impEmail string
			var count int64
			if err := rows.Scan(&impID, &impEmail, &count); err == nil {
				topImpersonators = append(topImpersonators, map[string]interface{}{
					"impersonator_id":    impID,
					"impersonator_email": impEmail,
					"count":              count,
				})
			}
		}
	}

	stats := map[string]interface{}{
		"total":                 total,
		"active":                active,
		"revoked":               revoked,
		"platform_user":         platformUser,
		"admin_user":            adminUser,
		"top_impersonators_30d": topImpersonators,
	}

	return utils.SendSimpleSuccess(c, stats, "Impersonation stats retrieved successfully")
}
