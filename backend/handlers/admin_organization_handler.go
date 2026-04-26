package handlers

import (
	"errors"
	"fmt"
	"log"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
	"golang.org/x/crypto/bcrypt"
)

// NOTE: This handler file references several columns on `organizations` that
// are NOT in migration 00001_core_schema.sql:
//   subscription_tier, tier, subscription_status, trial_start_date, trial_end_date
// Queries below COALESCE/guard them so they degrade gracefully on the current
// schema. TODO: confirm and add a migration once the subscription model is
// finalized; flagged for review.

// AdminGetAllOrganizations returns all organizations with filters and pagination.
func AdminGetAllOrganizations(c *fiber.Ctx) error {
	ctx := c.Context()
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := c.Query("search")
	status := c.Query("status")
	subscriptionTier := c.Query("subscription_tier")
	trialStatus := c.Query("trial_status")
	sortBy := c.Query("sort_by", "created_at")
	sortOrder := c.Query("sort_order", "desc")

	page, limit = utils.NormalizePaginationParams(page, limit)
	offset := (page - 1) * limit

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
		searchTerm := "%" + strings.ToLower(search) + "%"
		add("(LOWER(o.name) LIKE ? OR LOWER(o.slug) LIKE ?)", searchTerm, searchTerm)
	}
	if status != "" && status != "all" {
		if status == "active" {
			add("o.active = ?", true)
		} else if status == "suspended" {
			add("o.active = ?", false)
		}
	}
	_ = subscriptionTier
	_ = trialStatus

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	var total int64
	if err := config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations o"+where, args...).Scan(&total); err != nil {
		return utils.SendInternalError(c, "Failed to count organizations", err)
	}

	allowedSorts := map[string]string{
		"name":       "o.name",
		"created_at": "o.created_at",
		"user_count": "user_count",
	}
	sortCol, ok := allowedSorts[sortBy]
	if !ok {
		sortCol = "o.created_at"
	}
	if sortOrder != "asc" {
		sortOrder = "desc"
	}

	args = append(args, limit, offset)
	q := fmt.Sprintf(`
		SELECT o.id, o.name, COALESCE(o.slug, '') as domain,
			o.description, o.created_at, o.updated_at,
			CASE WHEN o.active = true THEN 'active' ELSE 'suspended' END as status,
			(SELECT COUNT(*) FROM organization_members m WHERE m.organization_id = o.id AND m.active = true) as user_count
		FROM organizations o%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`,
		where, sortCol, sortOrder, len(args)-1, len(args),
	)

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		log.Printf("Error getting organizations: %v", err)
		return utils.SendInternalError(c, "Failed to retrieve organizations", err)
	}
	defer rows.Close()

	organizations := []map[string]interface{}{}
	for rows.Next() {
		var (
			id, name, domain, st string
			desc                 *string
			createdAt, updatedAt time.Time
			userCount            int64
		)
		if err := rows.Scan(&id, &name, &domain, &desc, &createdAt, &updatedAt, &st, &userCount); err != nil {
			return utils.SendInternalError(c, "Failed to scan org", err)
		}
		organizations = append(organizations, map[string]interface{}{
			"id":                id,
			"name":              name,
			"domain":            domain,
			"description":       desc,
			"created_at":        createdAt,
			"updated_at":        updatedAt,
			"status":            st,
			"subscription_tier": "basic",
			"trial_status":      "trial",
			"user_count":        userCount,
		})
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	response := map[string]interface{}{
		"organizations": organizations,
		"total":         total,
		"page":          page,
		"limit":         limit,
		"totalPages":    totalPages,
	}
	return utils.SendSimpleSuccess(c, response, "Organizations retrieved successfully")
}

func AdminGetOrganizationStatistics(c *fiber.Ctx) error {
	ctx := c.Context()
	var totalOrgs, activeOrgs, suspendedOrgs, createdThisMonth, totalUsersAcrossOrgs int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations").Scan(&totalOrgs)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations WHERE active = true").Scan(&activeOrgs)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations WHERE active = false").Scan(&suspendedOrgs)

	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations WHERE created_at >= $1", thirtyDaysAgo).Scan(&createdThisMonth)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organization_members WHERE active = true").Scan(&totalUsersAcrossOrgs)

	topOrgs := []map[string]interface{}{}
	rows, err := config.PgxDB.Query(ctx, `
		SELECT om.organization_id, COUNT(*) as user_count, COALESCE(o.name, '') as org_name
		FROM organization_members om
		LEFT JOIN organizations o ON o.id = om.organization_id
		WHERE om.active = true
		GROUP BY om.organization_id, o.name
		ORDER BY user_count DESC LIMIT 5`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var orgID, orgName string
			var count int64
			if err := rows.Scan(&orgID, &count, &orgName); err == nil {
				topOrgs = append(topOrgs, map[string]interface{}{
					"organization_id":   orgID,
					"user_count":        count,
					"organization_name": orgName,
				})
			}
		}
	}

	stats := map[string]interface{}{
		"total_organizations":              totalOrgs,
		"active_organizations":             activeOrgs,
		"suspended_organizations":          suspendedOrgs,
		"trial_organizations":              0, // TODO: subscription columns missing
		"organizations_created_this_month": createdThisMonth,
		"total_users_across_organizations": totalUsersAcrossOrgs,
		"trials_expiring_soon":             0, // TODO
		"top_organizations_by_users":       topOrgs,
	}
	return utils.SendSimpleSuccess(c, stats, "Organization statistics retrieved successfully")
}

func AdminGetOrganizationById(c *fiber.Ctx) error {
	orgID := c.Params("id")
	ctx := c.Context()

	var (
		id, name, domain string
		desc             *string
		active           bool
		createdAt        time.Time
		updatedAt        time.Time
	)
	err := config.PgxDB.QueryRow(ctx,
		"SELECT id, name, COALESCE(slug, ''), description, active, created_at, updated_at FROM organizations WHERE id = $1", orgID).
		Scan(&id, &name, &domain, &desc, &active, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "Organization not found")
		}
		return utils.SendInternalError(c, "Failed to retrieve organization", err)
	}

	st := "active"
	if !active {
		st = "suspended"
	}

	var userCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organization_members WHERE organization_id = $1 AND active = true", orgID).Scan(&userCount)

	org := map[string]interface{}{
		"id":                id,
		"name":              name,
		"domain":            domain,
		"description":       desc,
		"created_at":        createdAt,
		"updated_at":        updatedAt,
		"status":            st,
		"subscription_tier": "basic",
		"trial_status":      "trial",
		"user_count":        userCount,
	}

	// Settings
	var (
		settingsID, currency string
		fyStart              int
		bvt                  float64
	)
	if err := config.PgxDB.QueryRow(ctx,
		"SELECT id, COALESCE(currency, 'USD'), COALESCE(fiscal_year_start, 1), COALESCE(budget_variance_threshold, 5.00) FROM organization_settings WHERE organization_id = $1", orgID).
		Scan(&settingsID, &currency, &fyStart, &bvt); err == nil {
		org["settings"] = map[string]interface{}{
			"id":                        settingsID,
			"currency":                  currency,
			"fiscal_year_start":         fyStart,
			"budget_variance_threshold": bvt,
		}
	}

	// Admin contact info
	var (
		adminEmail, adminName, adminPhone *string
	)
	_ = config.PgxDB.QueryRow(ctx, `
		SELECT u.email, u.name, COALESCE(u.contact, '')
		FROM users u
		INNER JOIN organization_members m ON m.user_id = u.id
		WHERE m.organization_id = $1 AND m.role = 'admin' AND m.active = true AND u.deleted_at IS NULL
		ORDER BY m.joined_at ASC LIMIT 1`, orgID).
		Scan(&adminEmail, &adminName, &adminPhone)

	org["contact_info"] = map[string]interface{}{
		"admin_name":  adminName,
		"admin_email": adminEmail,
		"phone":       adminPhone,
		"address":     nil,
	}
	org["billing_info"] = map[string]interface{}{
		"billing_email":   adminEmail,
		"payment_method":  nil,
		"billing_address": nil,
	}

	return utils.SendSimpleSuccess(c, org, "Organization retrieved successfully")
}

func AdminCreateOrganization(c *fiber.Ctx) error {
	ctx := c.Context()

	var request struct {
		Name             string `json:"name"`
		Domain           string `json:"domain"`
		Description      string `json:"description"`
		AdminUserID      string `json:"admin_user_id"`
		AdminName        string `json:"admin_name"`
		AdminEmail       string `json:"admin_email"`
		SubscriptionTier string `json:"subscription_tier"`
		TrialDays        int    `json:"trial_days"`
		MaxUsers         int    `json:"max_users"`
	}
	if err := c.BodyParser(&request); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	if request.Name == "" {
		return utils.SendBadRequest(c, "Organization name is required")
	}
	if request.AdminUserID == "" && request.AdminEmail == "" {
		return utils.SendBadRequest(c, "Either admin_user_id or admin_email is required")
	}

	slug := strings.ToLower(request.Name)
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	slug = reg.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if request.Domain != "" {
		slug = request.Domain
	}

	var existingCount int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM organizations WHERE slug = $1", slug).Scan(&existingCount)
	if existingCount > 0 {
		slug = fmt.Sprintf("%s-%s", slug, utils.GenerateID()[:6])
	}

	now := time.Now()
	orgID := utils.GenerateID()
	createdBy, _ := c.Locals("userID").(string)

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return utils.SendInternalError(c, "Failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		INSERT INTO organizations (id, name, slug, description, active, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, true, $5, $6, $6)`,
		orgID, request.Name, slug, request.Description, createdBy, now,
	)
	if err != nil {
		log.Printf("Error creating organization: %v", err)
		return utils.SendInternalError(c, "Failed to create organization", err)
	}

	var resolvedUserID string
	if request.AdminUserID != "" {
		var userCount int64
		_ = tx.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE id = $1", request.AdminUserID).Scan(&userCount)
		if userCount == 0 {
			return utils.SendNotFound(c, "Admin user not found")
		}
		resolvedUserID = request.AdminUserID
	} else {
		adminName := request.AdminName
		if adminName == "" {
			adminName = "Admin"
		}
		_ = tx.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", request.AdminEmail).Scan(&resolvedUserID)
		if resolvedUserID == "" {
			tempPassword := utils.GenerateID()[:12]
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
			userID := utils.GenerateID()
			_, err := tx.Exec(ctx, `
				INSERT INTO users (id, email, name, password, role, active, current_organization_id, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, true, $6, $7, $7)`,
				userID, request.AdminEmail, adminName, string(hashedPassword), "admin", orgID, now,
			)
			if err != nil {
				return utils.SendInternalError(c, "Failed to create admin user", err)
			}
			resolvedUserID = userID
		}
	}

	memberID := utils.GenerateID()
	_, err = tx.Exec(ctx, `
		INSERT INTO organization_members (id, organization_id, user_id, role, active, joined_at, created_at, updated_at)
		VALUES ($1, $2, $3, 'admin', true, $4, $4, $4)`,
		memberID, orgID, resolvedUserID, now,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to add admin member", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return utils.SendInternalError(c, "Failed to commit transaction", err)
	}

	return utils.SendCreatedSuccess(c, map[string]interface{}{
		"id":                orgID,
		"name":              request.Name,
		"slug":              slug,
		"description":       request.Description,
		"active":            true,
		"subscription_tier": request.SubscriptionTier,
		"created_at":        now,
	}, "Organization created successfully")
}

func AdminUpdateOrganization(c *fiber.Ctx) error {
	orgID := c.Params("id")
	ctx := c.Context()

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}

	allowed := map[string]string{
		"name":          "name",
		"description":   "description",
		"slug":          "slug",
		"domain":        "slug",
		"logo_url":      "logo_url",
		"tagline":       "tagline",
		"primary_color": "primary_color",
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
	args = append(args, orgID)
	q := "UPDATE organizations SET " + strings.Join(setClauses, ", ") + " WHERE id = $" + strconv.Itoa(len(args))
	if _, err := config.PgxDB.Exec(ctx, q, args...); err != nil {
		return utils.SendInternalError(c, "Failed to update organization", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": orgID}, "Organization updated successfully")
}

func AdminUpdateOrganizationStatus(c *fiber.Ctx) error {
	orgID := c.Params("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	active := req.Status == "active"
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE organizations SET active = $1, updated_at = $2 WHERE id = $3",
		active, time.Now(), orgID); err != nil {
		return utils.SendInternalError(c, "Failed to update status", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": orgID, "status": req.Status}, "Organization status updated successfully")
}

func AdminGetOrganizationUsers(c *fiber.Ctx) error {
	orgID := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT u.id, u.name, u.email, u.role, u.active, m.joined_at, m.role as member_role
		FROM users u
		JOIN organization_members m ON m.user_id = u.id
		WHERE m.organization_id = $1 AND m.active = true AND u.deleted_at IS NULL
		ORDER BY m.joined_at DESC`, orgID)
	if err != nil {
		return utils.SendInternalError(c, "Failed to load org users", err)
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var (
			id, name, email, role, memberRole string
			active                            bool
			joinedAt                          *time.Time
		)
		if err := rows.Scan(&id, &name, &email, &role, &active, &joinedAt, &memberRole); err != nil {
			return utils.SendInternalError(c, "Failed to scan user", err)
		}
		users = append(users, map[string]interface{}{
			"id":          id,
			"name":        name,
			"email":       email,
			"role":        role,
			"member_role": memberRole,
			"active":      active,
			"joined_at":   joinedAt,
		})
	}
	return utils.SendSimpleSuccess(c, users, "Organization users retrieved successfully")
}

// AdminGetOrganizationActivity — TODO: requires admin_audit_logs table.
func AdminGetOrganizationActivity(c *fiber.Ctx) error {
	orgID := c.Params("id")
	rows, err := config.PgxDB.Query(c.Context(), `
		SELECT id, action, admin_user_id, details, created_at
		FROM admin_audit_logs
		WHERE organization_id = $1
		ORDER BY created_at DESC LIMIT 100`, orgID)
	if err != nil {
		// Table may not exist; return empty
		return utils.SendSimpleSuccess(c, []interface{}{}, "Organization activity retrieved successfully")
	}
	defer rows.Close()

	activities := []map[string]interface{}{}
	for rows.Next() {
		var id, action, adminUserID string
		var details []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &action, &adminUserID, &details, &createdAt); err != nil {
			continue
		}
		activities = append(activities, map[string]interface{}{
			"id":            id,
			"action":        action,
			"admin_user_id": adminUserID,
			"details":       string(details),
			"created_at":    createdAt,
		})
	}
	return utils.SendSimpleSuccess(c, activities, "Organization activity retrieved successfully")
}

// AdminGetOrgTrialStatus — subscription columns are not in current migrations.
// TODO: implement once a subscription model is added.
func AdminGetOrgTrialStatus(c *fiber.Ctx) error {
	orgID := c.Params("id")
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"organization_id": orgID,
		"trial_status":    "trial",
		"trial_end_date":  nil,
		"days_remaining":  0,
		"note":            "subscription columns not present in current schema",
	}, "Trial status retrieved successfully")
}

func AdminGetOrgSubscription(c *fiber.Ctx) error {
	orgID := c.Params("id")
	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"organization_id":     orgID,
		"subscription_tier":   "basic",
		"subscription_status": "trial",
		"note":                "subscription columns not present in current schema",
	}, "Subscription retrieved successfully")
}

func AdminDeleteOrganization(c *fiber.Ctx) error {
	orgID := c.Params("id")
	if _, err := config.PgxDB.Exec(c.Context(),
		"UPDATE organizations SET active = false, updated_at = $1 WHERE id = $2",
		time.Now(), orgID); err != nil {
		return utils.SendInternalError(c, "Failed to delete organization", err)
	}
	return utils.SendSimpleSuccess(c, map[string]interface{}{"id": orgID}, "Organization deleted successfully")
}

// AdminResetOrganizationTrial / AdminExtendOrganizationTrial — no-ops until subscription columns exist.
func AdminResetOrganizationTrial(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Trial management requires subscription columns not present in current schema")
}

func AdminExtendOrganizationTrial(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "Trial management requires subscription columns not present in current schema")
}
