package middleware

import (
	"fmt"
	"runtime/debug"

	"github.com/gofiber/fiber/v2"
	loggingConfig "github.com/tether-erp/logging/config"
	logContext "github.com/tether-erp/logging/context"
)

// ErrorLoggerConfig holds configuration for error logging middleware
type ErrorLoggerConfig struct {
	// Skip defines a function to skip middleware
	Skip func(c *fiber.Ctx) bool

	// Config holds logging configuration
	Config *loggingConfig.LoggingConfig

	// EnableStackTrace enables stack trace logging for errors
	EnableStackTrace bool

	// CustomErrorHandler allows custom error handling
	CustomErrorHandler func(c *fiber.Ctx, err error) error

	// ErrorFieldExtractor extracts additional fields from errors
	ErrorFieldExtractor func(c *fiber.Ctx, err error) map[string]interface{}
}

// DefaultErrorLoggerConfig returns default configuration
func DefaultErrorLoggerConfig() ErrorLoggerConfig {
	return ErrorLoggerConfig{
		Skip:                nil,
		Config:              loggingConfig.DefaultLoggingConfig(),
		EnableStackTrace:    true,
		CustomErrorHandler:  nil,
		ErrorFieldExtractor: nil,
	}
}

// ErrorLogger returns a middleware that logs errors and panics
func ErrorLogger(cfg ...ErrorLoggerConfig) fiber.Handler {
	// Set default config
	config := DefaultErrorLoggerConfig()
	if len(cfg) > 0 {
		config = cfg[0]
	}

	// Ensure config is not nil
	if config.Config == nil {
		config.Config = loggingConfig.DefaultLoggingConfig()
	}

	return func(c *fiber.Ctx) error {
		// Skip if skip function returns true
		if config.Skip != nil && config.Skip(c) {
			return c.Next()
		}

		// Defer panic recovery
		defer func() {
			if r := recover(); r != nil {
				// Get logger from context
				logger := logContext.FromFiberContext(c)

				// Prepare panic fields
				panicFields := map[string]interface{}{
					"panic_value": r,
					"method":      c.Method(),
					"path":        c.Path(),
					"ip":          c.IP(),
				}

				// Add stack trace if enabled
				if config.EnableStackTrace {
					panicFields["stack_trace"] = string(debug.Stack())
				}

				// Add custom fields if extractor is provided
				if config.ErrorFieldExtractor != nil {
					if panicErr, ok := r.(error); ok {
						customFields := config.ErrorFieldExtractor(c, panicErr)
						for key, value := range customFields {
							panicFields[key] = value
						}
					}
				}

				// Log panic
				logger.WithFields(panicFields).Error("panic_recovered")

				// Create error response
				err := fiber.NewError(fiber.StatusInternalServerError, "Internal Server Error")
				
				// Use custom error handler if provided
				if config.CustomErrorHandler != nil {
					if handlerErr := config.CustomErrorHandler(c, err); handlerErr != nil {
						logger.WithError(handlerErr).Error("custom_error_handler_failed")
					}
					return
				}

				// Default error response
				c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":      "Internal Server Error",
					"request_id": logContext.GetRequestIDFromFiberContext(c),
				})
			}
		}()

		// Process request
		err := c.Next()

		// Log error if one occurred
		if err != nil {
			logError(c, err, config)
		}

		return err
	}
}

// logError logs an error with appropriate context and fields
func logError(c *fiber.Ctx, err error, config ErrorLoggerConfig) {
	// Get logger from context
	logger := logContext.FromFiberContext(c)

	// Prepare error fields
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

	// Add custom fields if extractor is provided
	if config.ErrorFieldExtractor != nil {
		customFields := config.ErrorFieldExtractor(c, err)
		for key, value := range customFields {
			errorFields[key] = value
		}
	}

	// Create logger with error and fields
	errorLogger := logger.WithError(err).WithFields(errorFields)

	// Log with stack trace if enabled and it's a server error
	if config.EnableStackTrace && isServerError(err) {
		errorLogger.ErrorWithStack(err, "request_error")
	} else {
		errorLogger.Error("request_error")
	}
}

// isServerError determines if an error should be considered a server error
func isServerError(err error) bool {
	if fiberErr, ok := err.(*fiber.Error); ok {
		return fiberErr.Code >= 500
	}
	return true // Assume server error for non-Fiber errors
}

// ErrorLoggerWithConfig returns an error logger with custom configuration
func ErrorLoggerWithConfig(loggingConfig *loggingConfig.LoggingConfig) fiber.Handler {
	cfg := DefaultErrorLoggerConfig()
	cfg.Config = loggingConfig
	cfg.EnableStackTrace = loggingConfig.EnableStackTrace
	return ErrorLogger(cfg)
}

// ErrorLoggerForDevelopment returns an error logger optimized for development
func ErrorLoggerForDevelopment() fiber.Handler {
	cfg := DefaultErrorLoggerConfig()
	cfg.Config = loggingConfig.DevelopmentConfig()
	cfg.EnableStackTrace = true
	cfg.ErrorFieldExtractor = func(c *fiber.Ctx, err error) map[string]interface{} {
		return map[string]interface{}{
			"environment": "development",
			"user_agent":  c.Get("User-Agent"),
		}
	}
	return ErrorLogger(cfg)
}

// ErrorLoggerForProduction returns an error logger optimized for production
func ErrorLoggerForProduction() fiber.Handler {
	cfg := DefaultErrorLoggerConfig()
	cfg.Config = loggingConfig.ProductionConfig()
	cfg.EnableStackTrace = true
	cfg.ErrorFieldExtractor = func(c *fiber.Ctx, err error) map[string]interface{} {
		fields := map[string]interface{}{
			"environment": "production",
		}
		
		// Add user context if available
		if userID := c.Locals("user_id"); userID != nil {
			fields["user_id"] = userID
		}
		
		if orgID := c.Locals("organization_id"); orgID != nil {
			fields["organization_id"] = orgID
		}
		
		// Add session information if available
		if sessionID := c.Locals("session_id"); sessionID != nil {
			fields["session_id"] = sessionID
		}
		
		return fields
	}
	cfg.CustomErrorHandler = func(c *fiber.Ctx, err error) error {
		// In production, don't expose internal error details
		requestID := logContext.GetRequestIDFromFiberContext(c)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":      "Internal Server Error",
			"request_id": requestID,
			"message":    "An unexpected error occurred. Please contact support if the problem persists.",
		})
	}
	return ErrorLogger(cfg)
}

// ErrorLoggerForTesting returns an error logger optimized for testing
func ErrorLoggerForTesting() fiber.Handler {
	cfg := DefaultErrorLoggerConfig()
	cfg.Config = loggingConfig.TestConfig()
	cfg.EnableStackTrace = false // Reduce noise in tests
	return ErrorLogger(cfg)
}

// PanicRecovery returns a middleware that only handles panic recovery without error logging
// Useful when you want to use a separate error logging middleware
func PanicRecovery(cfg ...ErrorLoggerConfig) fiber.Handler {
	// Set default config
	config := DefaultErrorLoggerConfig()
	if len(cfg) > 0 {
		config = cfg[0]
	}

	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				// Get logger from context
				logger := logContext.FromFiberContext(c)

				// Log panic with stack trace if enabled
				fields := map[string]interface{}{
					"panic_value": r,
				}
				
				if config.EnableStackTrace {
					fields["stack_trace"] = string(debug.Stack())
				}

				logger.WithFields(fields).Error("panic_recovered")

				// Return 500 error
				c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":      "Internal Server Error",
					"request_id": logContext.GetRequestIDFromFiberContext(c),
				})
			}
		}()

		return c.Next()
	}
}