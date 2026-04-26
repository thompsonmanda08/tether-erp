package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// SystemSetting represents a system configuration setting
type SystemSetting struct {
	ID           string                 `json:"id"`
	Key          string                 `json:"key"`
	Value        string                 `json:"value"`
	Type         string                 `json:"type"`
	Category     string                 `json:"category"`
	Description  string                 `json:"description"`
	DefaultValue string                 `json:"default_value"`
	IsRequired   bool                   `json:"is_required"`
	IsSecret     bool                   `json:"is_secret"`
	Environment  string                 `json:"environment"`
	Validation   map[string]interface{} `json:"validation"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
	CreatedBy    string                 `json:"created_by"`
	UpdatedBy    string                 `json:"updated_by"`
}

// EnvironmentVariable represents an environment variable
type EnvironmentVariable struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Value       string    `json:"value"`
	Environment string    `json:"environment"`
	IsSecret    bool      `json:"is_secret"`
	Description string    `json:"description"`
	IsRequired  bool      `json:"is_required"`
	Category    string    `json:"category"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CreatedBy   string    `json:"created_by"`
	UpdatedBy   string    `json:"updated_by"`
}

func scanSystemSetting(row pgx.Row) (*SystemSetting, error) {
	var s SystemSetting
	var value, description, defaultValue, environment, createdBy, updatedBy *string
	var validation []byte
	if err := row.Scan(
		&s.ID, &s.Key, &value, &s.Type, &s.Category, &description, &defaultValue,
		&s.IsRequired, &s.IsSecret, &environment, &validation,
		&createdBy, &updatedBy, &s.CreatedAt, &s.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if value != nil {
		s.Value = *value
	}
	if description != nil {
		s.Description = *description
	}
	if defaultValue != nil {
		s.DefaultValue = *defaultValue
	}
	if environment != nil {
		s.Environment = *environment
	}
	if createdBy != nil {
		s.CreatedBy = *createdBy
	}
	if updatedBy != nil {
		s.UpdatedBy = *updatedBy
	}
	if len(validation) > 0 {
		_ = json.Unmarshal(validation, &s.Validation)
	}
	return &s, nil
}

const sysSettingCols = "id, key, value, type, category, description, default_value, is_required, is_secret, environment, validation, created_by, updated_by, created_at, updated_at"

// GetSystemSettings returns all system settings with optional filtering
func GetSystemSettings(c *fiber.Ctx) error {
	ctx := c.Context()
	conds := []string{}
	args := []interface{}{}
	add := func(cnd string, a ...interface{}) {
		for _, v := range a {
			args = append(args, v)
			cnd = strings.Replace(cnd, "?", "$"+strconv.Itoa(len(args)), 1)
		}
		conds = append(conds, cnd)
	}

	if v := c.Query("search"); v != "" {
		p := "%" + v + "%"
		add("(key ILIKE ? OR description ILIKE ?)", p, p)
	}
	if v := c.Query("category"); v != "" {
		add("category = ?", v)
	}
	if v := c.Query("environment"); v != "" {
		add("(environment = ? OR environment = 'all')", v)
	}
	if v := c.Query("type"); v != "" {
		add("type = ?", v)
	}
	if v := c.Query("is_secret"); v != "" {
		add("is_secret = ?", v == "true")
	}
	if v := c.Query("is_required"); v != "" {
		add("is_required = ?", v == "true")
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	rows, err := config.PgxDB.Query(ctx, "SELECT "+sysSettingCols+" FROM system_settings"+where+" ORDER BY category, key", args...)
	if err != nil {
		log.Printf("Error getting system settings: %v", err)
		return utils.SendInternalError(c, "Failed to fetch system settings", err)
	}
	defer rows.Close()

	settings := []SystemSetting{}
	for rows.Next() {
		s, err := scanSystemSetting(rows)
		if err != nil {
			return utils.SendInternalError(c, "Failed to scan setting", err)
		}
		if s.IsSecret {
			s.Value = "***HIDDEN***"
		}
		settings = append(settings, *s)
	}
	return utils.SendSimpleSuccess(c, settings, "System settings retrieved successfully")
}

func GetSystemSetting(c *fiber.Ctx) error {
	id := c.Params("id")
	row := config.PgxDB.QueryRow(c.Context(), "SELECT "+sysSettingCols+" FROM system_settings WHERE id = $1", id)
	s, err := scanSystemSetting(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "System setting not found")
		}
		return utils.SendInternalError(c, "Failed to fetch setting", err)
	}
	if s.IsSecret {
		s.Value = "***HIDDEN***"
	}
	return utils.SendSimpleSuccess(c, s, "System setting retrieved successfully")
}

func CreateSystemSetting(c *fiber.Ctx) error {
	var s SystemSetting
	if err := c.BodyParser(&s); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}
	s.ID = utils.GenerateID()
	s.CreatedAt = time.Now()
	s.UpdatedAt = time.Now()
	uid, _ := c.Locals("userID").(string)
	s.CreatedBy = uid
	s.UpdatedBy = uid

	var validation []byte
	if s.Validation != nil {
		validation, _ = json.Marshal(s.Validation)
	}

	_, err := config.PgxDB.Exec(c.Context(), `
		INSERT INTO system_settings (id, key, value, type, category, description, default_value, is_required, is_secret, environment, validation, created_by, updated_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
		s.ID, s.Key, s.Value, s.Type, s.Category, s.Description, s.DefaultValue,
		s.IsRequired, s.IsSecret, s.Environment, validation, s.CreatedBy, s.UpdatedBy,
		s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		log.Printf("Error creating system setting: %v", err)
		return utils.SendInternalError(c, "Failed to create system setting", err)
	}

	if s.IsSecret {
		s.Value = "***HIDDEN***"
	}
	return utils.SendSimpleSuccess(c, s, "System setting created successfully")
}

func UpdateSystemSetting(c *fiber.Ctx) error {
	id := c.Params("id")
	row := config.PgxDB.QueryRow(c.Context(), "SELECT "+sysSettingCols+" FROM system_settings WHERE id = $1", id)
	existing, err := scanSystemSetting(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return utils.SendNotFound(c, "System setting not found")
		}
		return utils.SendInternalError(c, "Failed to load setting", err)
	}

	var updates SystemSetting
	if err := c.BodyParser(&updates); err != nil {
		return utils.SendBadRequest(c, "Invalid request body")
	}

	existing.Value = updates.Value
	existing.Description = updates.Description
	existing.IsRequired = updates.IsRequired
	existing.IsSecret = updates.IsSecret
	existing.Environment = updates.Environment
	existing.Validation = updates.Validation
	existing.UpdatedAt = time.Now()
	uid, _ := c.Locals("userID").(string)
	existing.UpdatedBy = uid

	var validation []byte
	if existing.Validation != nil {
		validation, _ = json.Marshal(existing.Validation)
	}

	_, err = config.PgxDB.Exec(c.Context(), `
		UPDATE system_settings SET value = $1, description = $2, is_required = $3, is_secret = $4, environment = $5, validation = $6, updated_at = $7, updated_by = $8
		WHERE id = $9`,
		existing.Value, existing.Description, existing.IsRequired, existing.IsSecret,
		existing.Environment, validation, existing.UpdatedAt, existing.UpdatedBy, id,
	)
	if err != nil {
		log.Printf("Error updating system setting: %v", err)
		return utils.SendInternalError(c, "Failed to update system setting", err)
	}

	if existing.IsSecret {
		existing.Value = "***HIDDEN***"
	}
	return utils.SendSimpleSuccess(c, existing, "System setting updated successfully")
}

func DeleteSystemSetting(c *fiber.Ctx) error {
	id := c.Params("id")
	tag, err := config.PgxDB.Exec(c.Context(), "DELETE FROM system_settings WHERE id = $1", id)
	if err != nil {
		log.Printf("Error deleting system setting: %v", err)
		return utils.SendInternalError(c, "Failed to delete system setting", err)
	}
	if tag.RowsAffected() == 0 {
		return utils.SendNotFound(c, "System setting not found")
	}
	return utils.SendSimpleSuccess(c, nil, "System setting deleted successfully")
}

const envVarCols = "id, key, value, environment, is_secret, description, is_required, category, created_by, updated_by, created_at, updated_at"

func GetEnvironmentVariables(c *fiber.Ctx) error {
	ctx := c.Context()
	conds := []string{}
	args := []interface{}{}
	if v := c.Query("environment"); v != "" {
		args = append(args, v)
		conds = append(conds, "environment = $1")
	}
	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	rows, err := config.PgxDB.Query(ctx, "SELECT "+envVarCols+" FROM environment_variables"+where+" ORDER BY category, key", args...)
	if err != nil {
		log.Printf("Error getting environment variables: %v", err)
		return utils.SendInternalError(c, "Failed to fetch environment variables", err)
	}
	defer rows.Close()

	envVars := []EnvironmentVariable{}
	for rows.Next() {
		var e EnvironmentVariable
		var value, description, category, createdBy, updatedBy *string
		if err := rows.Scan(
			&e.ID, &e.Key, &value, &e.Environment, &e.IsSecret, &description,
			&e.IsRequired, &category, &createdBy, &updatedBy, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return utils.SendInternalError(c, "Failed to scan env var", err)
		}
		if value != nil {
			e.Value = *value
		}
		if description != nil {
			e.Description = *description
		}
		if category != nil {
			e.Category = *category
		}
		if createdBy != nil {
			e.CreatedBy = *createdBy
		}
		if updatedBy != nil {
			e.UpdatedBy = *updatedBy
		}
		if e.IsSecret {
			e.Value = "***HIDDEN***"
		}
		envVars = append(envVars, e)
	}
	return utils.SendSimpleSuccess(c, envVars, "Environment variables retrieved successfully")
}

// GetSystemHealthStatus returns system health status
func GetSystemHealthStatus(c *fiber.Ctx) error {
	ctx := c.Context()

	dbHealthy := true
	if config.PgxDB == nil {
		dbHealthy = false
	} else if err := config.PgxDB.Ping(ctx); err != nil {
		dbHealthy = false
	}

	var settingsCount, missingRequired int64
	if dbHealthy {
		_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM system_settings").Scan(&settingsCount)
		_ = config.PgxDB.QueryRow(ctx,
			"SELECT COUNT(*) FROM system_settings WHERE is_required = true AND (value = '' OR value IS NULL)").Scan(&missingRequired)
	}

	status := "healthy"
	score := 100
	checks := []map[string]interface{}{
		{
			"name":         "Database Connection",
			"status":       map[bool]string{true: "pass", false: "fail"}[dbHealthy],
			"message":      map[bool]string{true: "Database is accessible", false: "Database connection failed"}[dbHealthy],
			"last_checked": time.Now(),
		},
		{
			"name":         "Configuration Validation",
			"status":       map[bool]string{true: "pass", false: "fail"}[missingRequired == 0],
			"message":      map[bool]string{true: "All required settings are configured", false: "Some required settings are missing"}[missingRequired == 0],
			"last_checked": time.Now(),
		},
	}

	if !dbHealthy {
		status = "critical"
		score = 0
	} else if missingRequired > 0 {
		status = "warning"
		score = 75
	}

	recommendations := []string{}
	if missingRequired > 0 {
		recommendations = append(recommendations, "Configure missing required settings")
	}
	if !dbHealthy {
		recommendations = append(recommendations, "Check database connectivity")
	}

	health := map[string]interface{}{
		"status":          status,
		"score":           score,
		"checks":          checks,
		"recommendations": recommendations,
		"metrics": map[string]interface{}{
			"total_settings":   settingsCount,
			"missing_required": missingRequired,
			"database_healthy": dbHealthy,
		},
	}

	return utils.SendSimpleSuccess(c, health, "System health retrieved successfully")
}

func GetSettingsStats(c *fiber.Ctx) error {
	ctx := c.Context()
	var total int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM system_settings").Scan(&total)

	byCategory := make(map[string]int64)
	if rows, err := config.PgxDB.Query(ctx, "SELECT category, COUNT(*) FROM system_settings GROUP BY category"); err == nil {
		for rows.Next() {
			var k string
			var c int64
			if err := rows.Scan(&k, &c); err == nil {
				byCategory[k] = c
			}
		}
		rows.Close()
	}

	byEnvironment := make(map[string]int64)
	if rows, err := config.PgxDB.Query(ctx, "SELECT environment, COUNT(*) FROM system_settings GROUP BY environment"); err == nil {
		for rows.Next() {
			var k string
			var c int64
			if err := rows.Scan(&k, &c); err == nil {
				byEnvironment[k] = c
			}
		}
		rows.Close()
	}

	byType := make(map[string]int64)
	if rows, err := config.PgxDB.Query(ctx, "SELECT type, COUNT(*) FROM system_settings GROUP BY type"); err == nil {
		for rows.Next() {
			var k string
			var c int64
			if err := rows.Scan(&k, &c); err == nil {
				byType[k] = c
			}
		}
		rows.Close()
	}

	var secretSettings, requiredSettings, recentlyModified int64
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM system_settings WHERE is_secret = true").Scan(&secretSettings)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM system_settings WHERE is_required = true").Scan(&requiredSettings)
	_ = config.PgxDB.QueryRow(ctx, "SELECT COUNT(*) FROM system_settings WHERE updated_at > $1", time.Now().AddDate(0, 0, -7)).Scan(&recentlyModified)

	healthScore := 100.0
	if requiredSettings > 0 {
		var requiredWithValues int64
		_ = config.PgxDB.QueryRow(ctx,
			"SELECT COUNT(*) FROM system_settings WHERE is_required = true AND value IS NOT NULL AND value != ''").Scan(&requiredWithValues)
		healthScore = (float64(requiredWithValues) / float64(requiredSettings)) * 100
	}

	stats := map[string]interface{}{
		"total":             total,
		"by_category":       byCategory,
		"by_environment":    byEnvironment,
		"by_type":           byType,
		"secret_settings":   secretSettings,
		"required_settings": requiredSettings,
		"recently_modified": recentlyModified,
		"health_score":      healthScore,
	}
	return utils.SendSimpleSuccess(c, stats, "Settings statistics retrieved successfully")
}
