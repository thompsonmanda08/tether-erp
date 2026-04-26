package logging

import (
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/logging/config"
	logContext "github.com/tether-erp/logging/context"
)

// SetupLogging initializes the logging system based on environment
func SetupLogging() *config.LoggingConfig {
	// Load configuration from environment
	cfg := config.LoadFromEnv()
	
	// Override with environment-specific defaults if needed
	env := os.Getenv("APP_ENV")
	switch env {
	case "development", "dev":
		if cfg.Level == "info" { // Only override if not explicitly set
			cfg = config.DevelopmentConfig()
		}
	case "production", "prod":
		if cfg.Level == "info" { // Only override if not explicitly set
			cfg = config.ProductionConfig()
		}
	case "test", "testing":
		cfg = config.TestConfig()
	}
	
	// Validate configuration
	cfg.Validate()
	
	// Initialize global logger
	Initialize(&Config{
		Level:                   LogLevel(cfg.Level),
		Format:                  LogFormat(cfg.Format),
		EnableRequestLogs:       cfg.EnableRequestLogs,
		SlowRequestThresholdMS:  cfg.SlowRequestThresholdMS,
		EnableStackTrace:        cfg.EnableStackTrace,
		EnableCaller:            cfg.EnableCaller,
	})
	
	return cfg
}

// SetupFiberMiddleware sets up all logging middleware for a Fiber app
func SetupFiberMiddleware(app *fiber.App, cfg *config.LoggingConfig) {
	// Create middleware with global logger access
	requestMiddleware := func(c *fiber.Ctx) error {
		// Skip if disabled
		if !cfg.EnableRequestLogs {
			return c.Next()
		}

		// Skip health checks and metrics
		path := c.Path()
		skipPaths := []string{"/health", "/metrics", "/favicon.ico"}
		for _, skipPath := range skipPaths {
			if path == skipPath {
				return c.Next()
			}
		}

		// Create request context and store in Fiber context
		requestContext := logContext.NewRequestContext(GetGlobalZerologLogger())
		requestContext.StoreInFiberContext(c)

		// Set request ID in response header
		c.Set("X-Request-ID", requestContext.GetRequestID())

		// Record start time
		start := time.Now()

		// Add initial request fields
		requestFields := map[string]interface{}{
			"method":     c.Method(),
			"path":       c.Path(),
			"ip":         c.IP(),
			"user_agent": c.Get("User-Agent"),
		}

		// Add query parameters if present
		if len(c.Queries()) > 0 {
			requestFields["query_params"] = c.Queries()
		}

		// Add environment context
		env := os.Getenv("APP_ENV")
		if env != "" {
			requestFields["environment"] = env
		}

		// Add fields to request context
		requestContext.AddFields(requestFields)

		// Log incoming request
		logger := requestContext.GetLogger()
		logger.Info("request_started")

		// Process request
		err := c.Next()

		// Calculate latency
		latency := time.Since(start)
		latencyMs := float64(latency.Nanoseconds()) / 1e6

		// Get response status
		status := c.Response().StatusCode()

		// Prepare response fields
		responseFields := map[string]interface{}{
			"status":     status,
			"latency_ms": latencyMs,
		}

		// Add response size if available
		if bodySize := len(c.Response().Body()); bodySize > 0 {
			responseFields["response_size"] = bodySize
		}

		// Update logger with response fields
		logger = logger.WithFields(responseFields)

		// Log request completion based on status
		if status >= 500 {
			logger.Error("request_completed")
		} else if status >= 400 || latency > cfg.GetSlowRequestThreshold() {
			logger.Warn("request_completed")
		} else {
			logger.Info("request_completed")
		}

		// Log slow requests separately
		if latency > cfg.GetSlowRequestThreshold() {
			logger.WithField("slow_request", true).Warn("slow_request_detected")
		}

		return err
	}

	// Error handling middleware
	errorMiddleware := func(c *fiber.Ctx) error {
		// Defer panic recovery
		defer func() {
			if r := recover(); r != nil {
				// Get logger from context
				logger := logContext.FromFiberContext(c)

				// Log panic
				logger.WithField("panic_value", r).Error("panic_recovered")

				// Return 500 error
				c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":      "Internal Server Error",
					"request_id": logger.GetRequestID(),
				})
			}
		}()

		// Process request
		err := c.Next()

		// Log error if one occurred
		if err != nil {
			logger := logContext.FromFiberContext(c)
			
			errorFields := map[string]interface{}{
				"method": c.Method(),
				"path":   c.Path(),
				"ip":     c.IP(),
			}

			// Add error type information
			if fiberErr, ok := err.(*fiber.Error); ok {
				errorFields["error_code"] = fiberErr.Code
				errorFields["error_type"] = "fiber_error"
			} else {
				errorFields["error_type"] = fmt.Sprintf("%T", err)
			}

			// Log with stack trace for server errors
			errorLogger := logger.WithError(err).WithFields(errorFields)
			if isServerError(err) {
				errorLogger.ErrorWithStack(err, "request_error")
			} else {
				errorLogger.Error("request_error")
			}
		}

		return err
	}

	// Apply middleware
	app.Use(requestMiddleware)
	app.Use(errorMiddleware)
}

// isServerError determines if an error should be considered a server error
func isServerError(err error) bool {
	if fiberErr, ok := err.(*fiber.Error); ok {
		return fiberErr.Code >= 500
	}
	return true // Assume server error for non-Fiber errors
}

// SetupFiberMiddlewareCustom sets up logging middleware with custom configuration
func SetupFiberMiddlewareCustom(app *fiber.App, cfg *config.LoggingConfig) {
	// For now, use the same implementation as SetupFiberMiddleware
	SetupFiberMiddleware(app, cfg)
}

// LogStartupInfo logs application startup information
func LogStartupInfo(port string) {
	logger := GetGlobalLogger()
	
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}
	
	logger.WithFields(map[string]interface{}{
		"port":        port,
		"environment": env,
		"service":     "tether-erp",
		"version":     os.Getenv("APP_VERSION"),
	}).Info("application_starting")
	
	// Log feature information
	logger.WithFields(map[string]interface{}{
		"features": []string{
			"Enhanced Auth",
			"Session Management", 
			"Custom RBAC",
			"Workflow Engine",
			"Structured Logging",
		},
		"security": []string{
			"Account Lockout",
			"Password Reset", 
			"Audit Logging",
		},
		"architecture": []string{
			"Clean Architecture",
			"Repository Pattern",
			"Service Layer",
		},
		"database": []string{
			"GORM",
			"pgx",
			"sqlc",
		},
	}).Info("application_features")
}

// LogShutdownInfo logs application shutdown information
func LogShutdownInfo() {
	logger := GetGlobalLogger()
	
	logger.WithField("service", "tether-erp").Info("application_shutting_down")
}

// LogHealthCheck logs health check information
func LogHealthCheck(c *fiber.Ctx, status string, checks map[string]interface{}) {
	logger := FromContext(c)
	
	logger.WithFields(map[string]interface{}{
		"status": status,
		"checks": checks,
	}).Info("health_check")
}

// Example handler showing how to use logging in handlers
func ExampleHandler(c *fiber.Ctx) error {
	// Get logger from context (automatically includes request ID)
	logger := FromContext(c)
	
	// Log with additional context
	logger.WithField("user_id", "123").Info("processing_request")
	
	// Simulate some business logic
	userID := c.Params("id")
	if userID == "" {
		logger.Warn("missing_user_id")
		return c.Status(400).JSON(fiber.Map{
			"error": "User ID is required",
		})
	}
	
	// Log with multiple fields
	logger.WithFields(map[string]interface{}{
		"user_id":   userID,
		"operation": "get_user",
	}).Debug("fetching_user_data")
	
	// Simulate error
	if userID == "error" {
		err := fiber.NewError(500, "Database connection failed")
		logger.WithError(err).WithField("user_id", userID).Error("database_error")
		return err
	}
	
	// Success
	logger.WithField("user_id", userID).Info("request_completed_successfully")
	
	return c.JSON(fiber.Map{
		"user_id": userID,
		"name":    "John Doe",
	})
}

// FromContext is a convenience function to get logger from Fiber context
func FromContext(c *fiber.Ctx) *Logger {
	return logContext.FromFiberContext(c)
}

// AddFieldToRequest adds a field to the current request context
func AddFieldToRequest(c *fiber.Ctx, key string, value interface{}) {
	logContext.AddFieldToContext(c, key, value, GetGlobalZerologLogger())
}

// AddFieldsToRequest adds multiple fields to the current request context
func AddFieldsToRequest(c *fiber.Ctx, fields map[string]interface{}) {
	logContext.AddFieldsToContext(c, fields, GetGlobalZerologLogger())
}

// LogError logs an error with request context
func LogError(c *fiber.Ctx, err error, message string, fields ...map[string]interface{}) {
	logContext.LogErrorWithContext(c, err, message, fields...)
}

// LogInfo logs an info message with request context
func LogInfo(c *fiber.Ctx, message string, fields ...map[string]interface{}) {
	logContext.LogWithContext(c, "info", message, fields...)
}

// LogWarn logs a warning message with request context
func LogWarn(c *fiber.Ctx, message string, fields ...map[string]interface{}) {
	logContext.LogWithContext(c, "warn", message, fields...)
}

// LogDebug logs a debug message with request context
func LogDebug(c *fiber.Ctx, message string, fields ...map[string]interface{}) {
	logContext.LogWithContext(c, "debug", message, fields...)
}