package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	loggingConfig "github.com/tether-erp/logging/config"
	logContext "github.com/tether-erp/logging/context"
	"github.com/rs/zerolog"
)

// RequestLoggerConfig holds configuration for request logging middleware
type RequestLoggerConfig struct {
	// Skip defines a function to skip middleware
	Skip func(c *fiber.Ctx) bool

	// Config holds logging configuration
	Config *loggingConfig.LoggingConfig

	// CustomFields allows adding custom fields to request logs
	CustomFields func(c *fiber.Ctx) map[string]interface{}

	// SkipPaths defines paths to skip logging (e.g., health checks)
	SkipPaths []string

	// SkipSuccessfulRequests skips logging successful requests (2xx status codes)
	SkipSuccessfulRequests bool
}

// DefaultRequestLoggerConfig returns default configuration
func DefaultRequestLoggerConfig() RequestLoggerConfig {
	return RequestLoggerConfig{
		Skip:                   nil,
		Config:                 loggingConfig.DefaultLoggingConfig(),
		CustomFields:           nil,
		SkipPaths:              []string{"/health", "/metrics", "/favicon.ico"},
		SkipSuccessfulRequests: false,
	}
}

// RequestLogger returns a middleware that logs HTTP requests
func RequestLogger(cfg ...RequestLoggerConfig) fiber.Handler {
	// Set default config
	config := DefaultRequestLoggerConfig()
	if len(cfg) > 0 {
		config = cfg[0]
	}

	// Ensure config is not nil
	if config.Config == nil {
		config.Config = loggingConfig.DefaultLoggingConfig()
	}

	return func(c *fiber.Ctx) error {
		// Skip if disabled
		if !config.Config.EnableRequestLogs {
			return c.Next()
		}

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

		// Create request context and store in Fiber context
		// Note: This requires the global logger to be passed in
		// For now, we'll create a basic logger
		globalLogger := zerolog.New(nil).With().Timestamp().Logger()
		requestContext := logContext.NewRequestContext(globalLogger)
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

		// Add custom fields if provided
		if config.CustomFields != nil {
			customFields := config.CustomFields(c)
			for key, value := range customFields {
				requestFields[key] = value
			}
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

		// Determine log level based on status code and latency
		logLevel := determineLogLevel(status, latency, config.Config.GetSlowRequestThreshold())

		// Skip successful requests if configured
		if config.SkipSuccessfulRequests && status >= 200 && status < 300 {
			return err
		}

		// Log request completion
		switch logLevel {
		case "debug":
			logger.Debug("request_completed")
		case "info":
			logger.Info("request_completed")
		case "warn":
			logger.Warn("request_completed")
		case "error":
			logger.Error("request_completed")
		}

		// Log slow requests separately
		if latency > config.Config.GetSlowRequestThreshold() {
			logger.WithField("slow_request", true).Warn("slow_request_detected")
		}

		return err
	}
}

// determineLogLevel determines the appropriate log level based on status code and latency
func determineLogLevel(status int, latency time.Duration, slowThreshold time.Duration) string {
	// Error status codes
	if status >= 500 {
		return "error"
	}

	// Client error status codes or slow requests
	if status >= 400 || latency > slowThreshold {
		return "warn"
	}

	// Successful requests
	if status >= 200 && status < 300 {
		return "info"
	}

	// Informational and redirection
	return "debug"
}

// RequestLoggerWithConfig returns a request logger with custom configuration
func RequestLoggerWithConfig(loggingConfig *loggingConfig.LoggingConfig) fiber.Handler {
	cfg := DefaultRequestLoggerConfig()
	cfg.Config = loggingConfig
	return RequestLogger(cfg)
}

// RequestLoggerForDevelopment returns a request logger optimized for development
func RequestLoggerForDevelopment() fiber.Handler {
	cfg := DefaultRequestLoggerConfig()
	cfg.Config = loggingConfig.DevelopmentConfig()
	cfg.SkipSuccessfulRequests = false
	cfg.CustomFields = func(c *fiber.Ctx) map[string]interface{} {
		return map[string]interface{}{
			"environment": "development",
		}
	}
	return RequestLogger(cfg)
}

// RequestLoggerForProduction returns a request logger optimized for production
func RequestLoggerForProduction() fiber.Handler {
	cfg := DefaultRequestLoggerConfig()
	cfg.Config = loggingConfig.ProductionConfig()
	cfg.SkipSuccessfulRequests = false // Keep all requests in production for monitoring
	cfg.CustomFields = func(c *fiber.Ctx) map[string]interface{} {
		fields := map[string]interface{}{
			"environment": "production",
		}
		
		// Add user ID if available in context
		if userID := c.Locals("user_id"); userID != nil {
			fields["user_id"] = userID
		}
		
		// Add organization ID if available in context
		if orgID := c.Locals("organization_id"); orgID != nil {
			fields["organization_id"] = orgID
		}
		
		return fields
	}
	return RequestLogger(cfg)
}

// RequestLoggerForTesting returns a request logger optimized for testing
func RequestLoggerForTesting() fiber.Handler {
	cfg := DefaultRequestLoggerConfig()
	cfg.Config = loggingConfig.TestConfig()
	cfg.SkipSuccessfulRequests = true // Skip successful requests in tests
	return RequestLogger(cfg)
}