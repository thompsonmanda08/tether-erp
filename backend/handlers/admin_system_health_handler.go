package handlers

import (
	"fmt"
	"os"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/config"
	"github.com/tether-erp/utils"
)

// processStartTime tracks when the server started for uptime calculation
var processStartTime = time.Now()

// AcknowledgeSystemAlert acknowledges a system alert by ID
// NOTE: system_alerts table is not present in current migrations; this handler is a stub.
func AcknowledgeSystemAlert(c *fiber.Ctx) error {
	id := c.Params("id")

	if id == "" {
		return utils.SendBadRequest(c, "Alert ID is required")
	}

	tag, err := config.PgxDB.Exec(c.Context(),
		`UPDATE system_alerts SET status = $1, acknowledged_at = $2, updated_at = $2 WHERE id = $3`,
		"acknowledged", time.Now(), id,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to acknowledge alert", err)
	}
	if tag.RowsAffected() == 0 {
		return utils.SendNotFound(c, "Alert not found")
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"id":              id,
		"status":          "acknowledged",
		"acknowledged_at": time.Now().Format(time.RFC3339),
	}, "Alert acknowledged successfully")
}

// ResolveSystemAlert resolves a system alert by ID
// NOTE: system_alerts table is not present in current migrations; this handler is a stub.
func ResolveSystemAlert(c *fiber.Ctx) error {
	id := c.Params("id")

	if id == "" {
		return utils.SendBadRequest(c, "Alert ID is required")
	}

	tag, err := config.PgxDB.Exec(c.Context(),
		`UPDATE system_alerts SET status = $1, resolved_at = $2, updated_at = $2 WHERE id = $3`,
		"resolved", time.Now(), id,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to resolve alert", err)
	}
	if tag.RowsAffected() == 0 {
		return utils.SendNotFound(c, "Alert not found")
	}

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"id":          id,
		"status":      "resolved",
		"resolved_at": time.Now().Format(time.RFC3339),
	}, "Alert resolved successfully")
}

// GetPerformanceMetrics returns real performance metrics using Go runtime and DB pool stats
func GetPerformanceMetrics(c *fiber.Ctx) error {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	allocMB := float64(memStats.Alloc) / 1024 / 1024
	sysMB := float64(memStats.Sys) / 1024 / 1024
	heapInUseMB := float64(memStats.HeapInuse) / 1024 / 1024
	memUsagePercent := (allocMB / sysMB) * 100

	numGoroutines := runtime.NumGoroutine()

	var dbOpenConns, dbInUse, dbIdle int
	if config.PgxDB != nil {
		st := config.PgxDB.Stat()
		dbOpenConns = int(st.TotalConns())
		dbInUse = int(st.AcquiredConns())
		dbIdle = int(st.IdleConns())
	}

	metrics := []map[string]interface{}{
		{
			"metric_name":        "Memory Allocated",
			"current_value":      round2(allocMB),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              "stable",
			"threshold_warning":  500,
			"threshold_critical": 1000,
			"unit":               "MB",
		},
		{
			"metric_name":        "Memory Usage",
			"current_value":      round2(memUsagePercent),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              trendFromValue(memUsagePercent, 80),
			"threshold_warning":  80,
			"threshold_critical": 95,
			"unit":               "%",
		},
		{
			"metric_name":        "Heap In Use",
			"current_value":      round2(heapInUseMB),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              "stable",
			"threshold_warning":  400,
			"threshold_critical": 800,
			"unit":               "MB",
		},
		{
			"metric_name":        "Goroutines",
			"current_value":      float64(numGoroutines),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              trendFromValue(float64(numGoroutines), 1000),
			"threshold_warning":  1000,
			"threshold_critical": 5000,
			"unit":               "count",
		},
		{
			"metric_name":        "DB Open Connections",
			"current_value":      float64(dbOpenConns),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              "stable",
			"threshold_warning":  80,
			"threshold_critical": 95,
			"unit":               "count",
		},
		{
			"metric_name":        "DB In-Use Connections",
			"current_value":      float64(dbInUse),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              "stable",
			"threshold_warning":  50,
			"threshold_critical": 80,
			"unit":               "count",
		},
		{
			"metric_name":        "DB Idle Connections",
			"current_value":      float64(dbIdle),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              "stable",
			"threshold_warning":  nil,
			"threshold_critical": nil,
			"unit":               "count",
		},
		{
			"metric_name":        "GC Cycles",
			"current_value":      float64(memStats.NumGC),
			"previous_value":     nil,
			"change_percentage":  nil,
			"trend":              "stable",
			"threshold_warning":  nil,
			"threshold_critical": nil,
			"unit":               "count",
		},
	}

	return utils.SendSimpleSuccess(c, metrics, "Performance metrics retrieved successfully")
}

// RunSystemHealthCheck performs real health checks against the database and Go runtime
func RunSystemHealthCheck(c *fiber.Ctx) error {
	now := time.Now()
	uptime := now.Sub(processStartTime)

	// Database health check
	dbStatus := "healthy"
	dbMessage := "Database connection is healthy"
	var dbPingMs float64
	var dbConnCount, dbInUse int

	if config.PgxDB == nil {
		dbStatus = "critical"
		dbMessage = "Database pool is not initialized"
	} else {
		pingStart := time.Now()
		if pingErr := config.PgxDB.Ping(c.Context()); pingErr != nil {
			dbStatus = "critical"
			dbMessage = fmt.Sprintf("Database ping failed: %v", pingErr)
		} else {
			dbPingMs = float64(time.Since(pingStart).Microseconds()) / 1000.0
			if dbPingMs > 100 {
				dbStatus = "warning"
				dbMessage = fmt.Sprintf("Database responding slowly (%.1fms)", dbPingMs)
			}
		}

		st := config.PgxDB.Stat()
		dbConnCount = int(st.TotalConns())
		dbInUse = int(st.AcquiredConns())
	}

	// Memory health check
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	allocMB := float64(memStats.Alloc) / 1024 / 1024
	sysMB := float64(memStats.Sys) / 1024 / 1024
	memPercent := (allocMB / sysMB) * 100

	memStatus := "healthy"
	memMessage := fmt.Sprintf("Memory usage: %.1fMB / %.1fMB (%.1f%%)", allocMB, sysMB, memPercent)
	if memPercent > 90 {
		memStatus = "critical"
	} else if memPercent > 75 {
		memStatus = "warning"
	}

	// Goroutine health check
	numGoroutines := runtime.NumGoroutine()
	goroutineStatus := "healthy"
	goroutineMessage := fmt.Sprintf("%d active goroutines", numGoroutines)
	if numGoroutines > 5000 {
		goroutineStatus = "critical"
		goroutineMessage = fmt.Sprintf("High goroutine count: %d", numGoroutines)
	} else if numGoroutines > 1000 {
		goroutineStatus = "warning"
		goroutineMessage = fmt.Sprintf("Elevated goroutine count: %d", numGoroutines)
	}

	// Determine overall status
	overallStatus := "healthy"
	if dbStatus == "critical" || memStatus == "critical" || goroutineStatus == "critical" {
		overallStatus = "critical"
	} else if dbStatus == "warning" || memStatus == "warning" || goroutineStatus == "warning" {
		overallStatus = "warning"
	}

	health := map[string]interface{}{
		"overall_status":    overallStatus,
		"uptime_percentage": 100.0,
		"uptime_duration":   formatDuration(uptime),
		"last_updated":      now.Format(time.RFC3339),
		"database": map[string]interface{}{
			"status":            dbStatus,
			"message":           dbMessage,
			"connection_count":  dbConnCount,
			"in_use":            dbInUse,
			"query_performance": round2(dbPingMs),
		},
		"api": map[string]interface{}{
			"status":     overallStatus,
			"goroutines": numGoroutines,
			"go_version": runtime.Version(),
			"num_cpu":    runtime.NumCPU(),
		},
		"memory": map[string]interface{}{
			"status":        memStatus,
			"message":       memMessage,
			"alloc_mb":      round2(allocMB),
			"sys_mb":        round2(sysMB),
			"heap_inuse_mb": round2(float64(memStats.HeapInuse) / 1024 / 1024),
			"gc_cycles":     memStats.NumGC,
			"usage_percent": round2(memPercent),
		},
		"runtime": map[string]interface{}{
			"status":  goroutineStatus,
			"message": goroutineMessage,
		},
	}

	return utils.SendSimpleSuccess(c, health, "System health check completed successfully")
}

// GetSystemConfig returns the current system configuration from environment variables
func GetSystemConfig(c *fiber.Ctx) error {
	configData := map[string]interface{}{
		"environment":  getEnvOrDefault("APP_ENV", "development"),
		"version":      getEnvOrDefault("APP_VERSION", "1.0.0"),
		"debug_mode":   getEnvOrDefault("APP_ENV", "development") == "development",
		"log_level":    getEnvOrDefault("LOG_LEVEL", "info"),
		"port":         getEnvOrDefault("APP_PORT", "8080"),
		"frontend_url": getEnvOrDefault("FRONTEND_URL", "http://localhost:3000"),
		"db_host":      getEnvOrDefault("DB_HOST", "localhost"),
		"db_port":      getEnvOrDefault("DB_PORT", "5432"),
		"db_name":      getEnvOrDefault("DB_NAME", ""),
		"db_ssl_mode":  getEnvOrDefault("DB_SSL_MODE", "disable"),
		"go_version":   runtime.Version(),
		"num_cpu":      runtime.NumCPU(),
		"max_procs":    runtime.GOMAXPROCS(0),
		"uptime":       formatDuration(time.Since(processStartTime)),
	}

	return utils.SendSimpleSuccess(c, configData, "System configuration retrieved successfully")
}

// UpdateSystemConfig is not available via web UI for safety
func UpdateSystemConfig(c *fiber.Ctx) error {
	return utils.SendNotImplementedError(c, "System configuration update is not available via web UI. Use environment variables and redeploy.")
}

// RestartSystemService is not available via web UI for safety
func RestartSystemService(c *fiber.Ctx) error {
	name := c.Params("name")

	if name == "" {
		return utils.SendBadRequest(c, "Service name is required")
	}

	return utils.SendNotImplementedError(c, "Service restart is not available via web UI. Use deployment tools to restart services.")
}

// ClearSystemCache triggers Go garbage collection
func ClearSystemCache(c *fiber.Ctx) error {
	var beforeStats runtime.MemStats
	runtime.ReadMemStats(&beforeStats)

	runtime.GC()

	var afterStats runtime.MemStats
	runtime.ReadMemStats(&afterStats)

	freedMB := float64(beforeStats.Alloc-afterStats.Alloc) / 1024 / 1024

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"cleared":          true,
		"cleared_at":       time.Now().Format(time.RFC3339),
		"freed_mb":         round2(freedMB),
		"alloc_before_mb":  round2(float64(beforeStats.Alloc) / 1024 / 1024),
		"alloc_after_mb":   round2(float64(afterStats.Alloc) / 1024 / 1024),
	}, "System cache cleared successfully (GC triggered)")
}

// --- Helper functions ---

func getEnvOrDefault(key, defaultValue string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultValue
}

func round2(f float64) float64 {
	return float64(int(f*100)) / 100
}

func trendFromValue(value, warningThreshold float64) string {
	if value >= warningThreshold {
		return "up"
	}
	return "stable"
}

func formatDuration(d time.Duration) string {
	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	}
	return fmt.Sprintf("%dm", minutes)
}
