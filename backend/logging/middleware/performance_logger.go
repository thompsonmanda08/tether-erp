package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	loggingConfig "github.com/tether-erp/logging/config"
	logContext "github.com/tether-erp/logging/context"
)

// PerformanceLoggerConfig holds configuration for performance logging middleware
type PerformanceLoggerConfig struct {
	// Skip defines a function to skip middleware
	Skip func(c *fiber.Ctx) bool

	// Config holds logging configuration
	Config *loggingConfig.LoggingConfig

	// SlowRequestThreshold defines when a request is considered slow
	SlowRequestThreshold time.Duration

	// VerySlowRequestThreshold defines when a request is considered very slow
	VerySlowRequestThreshold time.Duration

	// EnableMemoryTracking enables memory usage tracking
	EnableMemoryTracking bool

	// CustomMetrics allows adding custom performance metrics
	CustomMetrics func(c *fiber.Ctx, latency time.Duration) map[string]interface{}

	// SkipPaths defines paths to skip performance logging
	SkipPaths []string
}

// DefaultPerformanceLoggerConfig returns default configuration
func DefaultPerformanceLoggerConfig() PerformanceLoggerConfig {
	return PerformanceLoggerConfig{
		Skip:                     nil,
		Config:                   loggingConfig.DefaultLoggingConfig(),
		SlowRequestThreshold:     100 * time.Millisecond,
		VerySlowRequestThreshold: 1000 * time.Millisecond,
		EnableMemoryTracking:     false,
		CustomMetrics:            nil,
		SkipPaths:                []string{"/health", "/metrics"},
	}
}

// PerformanceLogger returns a middleware that monitors and logs request performance
func PerformanceLogger(cfg ...PerformanceLoggerConfig) fiber.Handler {
	// Set default config
	config := DefaultPerformanceLoggerConfig()
	if len(cfg) > 0 {
		config = cfg[0]
	}

	// Ensure config is not nil
	if config.Config == nil {
		config.Config = loggingConfig.DefaultLoggingConfig()
	}

	// Use threshold from logging config if not explicitly set
	if config.SlowRequestThreshold == 100*time.Millisecond && config.Config != nil {
		config.SlowRequestThreshold = config.Config.GetSlowRequestThreshold()
	}

	return func(c *fiber.Ctx) error {
		// Skip if skip function returns true
		if config.Skip != nil && config.Skip(c) {
			return c.Next()
		}

		// Skip specific paths
		path := c.Path()
		for _, skipPath := range config.SkipPaths {
			if path == skipPath {
				return c.Next()
			}
		}

		// Record start time and memory if enabled
		start := time.Now()
		var startMemory uint64
		if config.EnableMemoryTracking {
			startMemory = getCurrentMemoryUsage()
		}

		// Process request
		err := c.Next()

		// Calculate latency
		latency := time.Since(start)
		latencyMs := float64(latency.Nanoseconds()) / 1e6

		// Get logger from context
		logger := logContext.FromFiberContext(c)

		// Prepare performance fields
		performanceFields := map[string]interface{}{
			"latency_ms":    latencyMs,
			"latency_human": latency.String(),
		}

		// Add memory tracking if enabled
		if config.EnableMemoryTracking {
			currentMemory := getCurrentMemoryUsage()
			performanceFields["memory_used_bytes"] = currentMemory
			if currentMemory > startMemory {
				performanceFields["memory_delta_bytes"] = currentMemory - startMemory
			}
		}

		// Add custom metrics if provided
		if config.CustomMetrics != nil {
			customFields := config.CustomMetrics(c, latency)
			for key, value := range customFields {
				performanceFields[key] = value
			}
		}

		// Determine performance category and log accordingly
		if latency > config.VerySlowRequestThreshold {
			// Very slow request - always log as warning
			logger.WithFields(performanceFields).
				WithField("performance_category", "very_slow").
				Warn("very_slow_request_detected")
		} else if latency > config.SlowRequestThreshold {
			// Slow request - log as warning
			logger.WithFields(performanceFields).
				WithField("performance_category", "slow").
				Warn("slow_request_detected")
		} else if config.Config.IsDebugEnabled() {
			// Normal request - log as debug if debug is enabled
			logger.WithFields(performanceFields).
				WithField("performance_category", "normal").
				Debug("request_performance")
		}

		// Add performance metrics to response headers in development
		if !config.Config.IsProductionMode() {
			c.Set("X-Response-Time", latency.String())
			c.Set("X-Response-Time-Ms", formatFloat(latencyMs, 2))
		}

		return err
	}
}

// PerformanceLoggerWithConfig returns a performance logger with custom configuration
func PerformanceLoggerWithConfig(loggingConfig *loggingConfig.LoggingConfig) fiber.Handler {
	cfg := DefaultPerformanceLoggerConfig()
	cfg.Config = loggingConfig
	cfg.SlowRequestThreshold = loggingConfig.GetSlowRequestThreshold()
	return PerformanceLogger(cfg)
}

// PerformanceLoggerForDevelopment returns a performance logger optimized for development
func PerformanceLoggerForDevelopment() fiber.Handler {
	cfg := DefaultPerformanceLoggerConfig()
	cfg.Config = loggingConfig.DevelopmentConfig()
	cfg.SlowRequestThreshold = 50 * time.Millisecond  // Lower threshold for dev
	cfg.VerySlowRequestThreshold = 200 * time.Millisecond
	cfg.EnableMemoryTracking = true
	cfg.CustomMetrics = func(c *fiber.Ctx, latency time.Duration) map[string]interface{} {
		return map[string]interface{}{
			"environment": "development",
			"endpoint":    c.Method() + " " + c.Path(),
		}
	}
	return PerformanceLogger(cfg)
}

// PerformanceLoggerForProduction returns a performance logger optimized for production
func PerformanceLoggerForProduction() fiber.Handler {
	cfg := DefaultPerformanceLoggerConfig()
	cfg.Config = loggingConfig.ProductionConfig()
	cfg.SlowRequestThreshold = 200 * time.Millisecond  // Higher threshold for prod
	cfg.VerySlowRequestThreshold = 2000 * time.Millisecond
	cfg.EnableMemoryTracking = false // Disable memory tracking in prod for performance
	cfg.CustomMetrics = func(c *fiber.Ctx, latency time.Duration) map[string]interface{} {
		fields := map[string]interface{}{
			"environment": "production",
		}
		
		// Add user context for performance analysis
		if userID := c.Locals("user_id"); userID != nil {
			fields["user_id"] = userID
		}
		
		if orgID := c.Locals("organization_id"); orgID != nil {
			fields["organization_id"] = orgID
		}
		
		return fields
	}
	return PerformanceLogger(cfg)
}

// PerformanceLoggerForTesting returns a performance logger optimized for testing
func PerformanceLoggerForTesting() fiber.Handler {
	cfg := DefaultPerformanceLoggerConfig()
	cfg.Config = loggingConfig.TestConfig()
	cfg.SlowRequestThreshold = 1000 * time.Millisecond // Very high threshold for tests
	cfg.VerySlowRequestThreshold = 5000 * time.Millisecond
	cfg.EnableMemoryTracking = false
	return PerformanceLogger(cfg)
}

// getCurrentMemoryUsage returns current memory usage in bytes
// This is a simplified implementation - in production you might want to use
// more sophisticated memory tracking
func getCurrentMemoryUsage() uint64 {
	// This is a placeholder implementation
	// In a real implementation, you would use runtime.MemStats or similar
	return 0
}

// formatFloat formats a float to specified decimal places
func formatFloat(f float64, precision int) string {
	format := "%." + string(rune(precision+'0')) + "f"
	return fmt.Sprintf(format, f)
}

// PerformanceMetrics holds performance metrics for a request
type PerformanceMetrics struct {
	Latency           time.Duration `json:"latency"`
	LatencyMs         float64       `json:"latency_ms"`
	MemoryUsed        uint64        `json:"memory_used,omitempty"`
	MemoryDelta       uint64        `json:"memory_delta,omitempty"`
	Category          string        `json:"category"`
	IsSlowRequest     bool          `json:"is_slow_request"`
	IsVerySlowRequest bool          `json:"is_very_slow_request"`
}

// GetPerformanceMetrics extracts performance metrics from the request
func GetPerformanceMetrics(c *fiber.Ctx) *PerformanceMetrics {
	// This would be populated by the middleware
	// Implementation depends on how you want to store metrics in context
	return &PerformanceMetrics{}
}

// LogPerformanceSummary logs a summary of performance metrics
func LogPerformanceSummary(c *fiber.Ctx, metrics *PerformanceMetrics) {
	logger := logContext.FromFiberContext(c)
	
	fields := map[string]interface{}{
		"latency_ms":          metrics.LatencyMs,
		"category":            metrics.Category,
		"is_slow_request":     metrics.IsSlowRequest,
		"is_very_slow_request": metrics.IsVerySlowRequest,
	}
	
	if metrics.MemoryUsed > 0 {
		fields["memory_used"] = metrics.MemoryUsed
	}
	
	if metrics.MemoryDelta > 0 {
		fields["memory_delta"] = metrics.MemoryDelta
	}
	
	logger.WithFields(fields).Info("performance_summary")
}