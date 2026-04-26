# Structured Logging System

A production-grade structured logging system for Go Fiber applications that provides comprehensive request tracking, debugging capabilities, and prepares infrastructure for future log storage solutions.

## Features

- **Request Tracking**: Unique request ID for each incoming request with end-to-end traceability
- **Structured Logging**: JSON and console output formats with configurable log levels
- **Middleware Stack**: Request logging, error handling, and performance monitoring
- **Context-Aware**: Request-scoped logging with automatic field propagation
- **Performance Monitoring**: Automatic detection of slow requests with configurable thresholds
- **Error Handling**: Panic recovery with stack traces and structured error logging
- **Future-Ready**: Interfaces designed for file, remote, and database storage (not yet implemented)

## Quick Start

### Basic Setup

```go
package main

import (
    "github.com/gofiber/fiber/v2"
    "github.com/tether-erp/logging"
)

func main() {
    // Initialize logging system
    cfg := logging.SetupLogging()

    // Create Fiber app
    app := fiber.New()

    // Setup logging middleware
    logging.SetupFiberMiddleware(app, cfg)

    // Your routes here
    app.Get("/", func(c *fiber.Ctx) error {
        logger := logging.FromContext(c)
        logger.Info("handling_request")

        return c.JSON(fiber.Map{"message": "Hello World"})
    })

    app.Listen(":8080")
}
```

### Environment Configuration

Configure logging behavior using environment variables:

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Output format (json, console)
LOG_FORMAT=json

# Enable/disable request logging
ENABLE_REQUEST_LOGS=true

# Slow request threshold in milliseconds
SLOW_REQUEST_THRESHOLD_MS=100

# Enable stack traces for errors
ENABLE_STACK_TRACE=true

# Enable caller information in logs
ENABLE_CALLER=true

# Enable colored output (console format only)
ENABLE_COLORS=true
```

## Architecture

```
logging/
├── logger.go              # Main logger interface & setup
├── config/
│   └── config.go          # Configuration management
├── middleware/
│   ├── request_logger.go  # Request logging middleware
│   ├── error_logger.go    # Error handling middleware
│   └── performance_logger.go # Performance monitoring middleware
├── context/
│   └── context.go         # Request-scoped logging context
├── storage.go             # Storage interfaces (future implementation)
├── integration.go         # Integration helpers
└── README.md              # This file
```

## Usage Examples

### Basic Logging in Handlers

```go
func GetUser(c *fiber.Ctx) error {
    // Get logger with automatic request ID
    logger := logging.FromContext(c)

    userID := c.Params("id")
    logger.WithField("user_id", userID).Info("fetching_user")

    // Business logic here
    user, err := userService.GetUser(userID)
    if err != nil {
        logger.WithError(err).WithField("user_id", userID).Error("failed_to_fetch_user")
        return c.Status(500).JSON(fiber.Map{"error": "Internal server error"})
    }

    logger.WithField("user_id", userID).Info("user_fetched_successfully")
    return c.JSON(user)
}
```

### Adding Context Fields

```go
func AuthenticatedHandler(c *fiber.Ctx) error {
    // Add user context to all subsequent logs in this request
    logging.AddFieldsToRequest(c, map[string]interface{}{
        "user_id": "123",
        "organization_id": "org-456",
        "role": "admin",
    })

    logger := logging.FromContext(c)
    logger.Info("authenticated_request") // Will include user context

    return c.JSON(fiber.Map{"status": "ok"})
}
```

### Error Logging with Context

```go
func ProcessPayment(c *fiber.Ctx) error {
    logger := logging.FromContext(c)

    paymentID := c.Params("id")
    logger.WithField("payment_id", paymentID).Info("processing_payment")

    err := paymentService.Process(paymentID)
    if err != nil {
        // Log error with full context and stack trace
        logging.LogError(c, err, "payment_processing_failed", map[string]interface{}{
            "payment_id": paymentID,
            "amount": 100.00,
            "currency": "USD",
        })

        return c.Status(500).JSON(fiber.Map{
            "error": "Payment processing failed",
            "request_id": logger.GetRequestID(),
        })
    }

    return c.JSON(fiber.Map{"status": "processed"})
}
```

### Helper Functions

```go
func ExampleHandler(c *fiber.Ctx) error {
    // Convenience functions for common log levels
    logging.LogInfo(c, "request_started")
    logging.LogDebug(c, "debug_information")
    logging.LogWarn(c, "warning_condition")

    // With additional fields
    logging.LogInfo(c, "user_action", map[string]interface{}{
        "action": "login",
        "ip": c.IP(),
    })

    return c.JSON(fiber.Map{"status": "ok"})
}
```

## Configuration Examples

### Development Environment

```go
// Automatically configured when APP_ENV=development
cfg := logging.SetupLogging()
// Results in:
// - Level: debug
// - Format: console (with colors)
// - Slow threshold: 50ms
// - All features enabled
```

### Production Environment

```go
// Automatically configured when APP_ENV=production
cfg := logging.SetupLogging()
// Results in:
// - Level: info
// - Format: json
// - Slow threshold: 200ms
// - Stack traces enabled, caller info disabled
```

### Custom Configuration

```go
app := fiber.New()

// Custom request logger
requestCfg := middleware.RequestLoggerConfig{
    Config: config.ProductionConfig(),
    SkipPaths: []string{"/health", "/metrics", "/favicon.ico"},
    CustomFields: func(c *fiber.Ctx) map[string]interface{} {
        return map[string]interface{}{
            "service": "api-gateway",
            "version": "1.0.0",
        }
    },
}

// Custom error logger
errorCfg := middleware.ErrorLoggerConfig{
    Config: config.ProductionConfig(),
    EnableStackTrace: true,
    ErrorFieldExtractor: func(c *fiber.Ctx, err error) map[string]interface{} {
        return map[string]interface{}{
            "user_id": c.Locals("user_id"),
            "session_id": c.Locals("session_id"),
        }
    },
}

// Custom performance logger
perfCfg := middleware.PerformanceLoggerConfig{
    Config: config.ProductionConfig(),
    SlowRequestThreshold: 100 * time.Millisecond,
    VerySlowRequestThreshold: 1000 * time.Millisecond,
}

logging.SetupFiberMiddlewareCustom(app, requestCfg, errorCfg, perfCfg)
```

## Log Output Examples

### JSON Format (Production)

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "request_id": "req_a1b2c3d4",
  "message": "request_completed",
  "method": "GET",
  "path": "/api/v1/users/123",
  "status": 200,
  "latency_ms": 45.2,
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "user_id": "user-123",
  "organization_id": "org-456"
}
```

### Console Format (Development)

```
2024-01-15 10:30:00 | INFO  | req_a1b2c3d4 | GET /api/v1/users/123 | 200 | 45ms | user_id=user-123
```

### Error Log with Stack Trace

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "ERROR",
  "request_id": "req_a1b2c3d4",
  "message": "database_connection_failed",
  "method": "POST",
  "path": "/api/v1/payments",
  "error": "connection refused",
  "stack_trace": "goroutine 1 [running]:\n...",
  "user_id": "user-123",
  "payment_id": "pay-789"
}
```

### Slow Request Detection

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "WARN",
  "request_id": "req_a1b2c3d4",
  "message": "slow_request_detected",
  "method": "GET",
  "path": "/api/v1/reports/heavy",
  "status": 200,
  "latency_ms": 1250.5,
  "slow_request": true,
  "performance_category": "slow"
}
```

## Testing

### Running Tests

```bash
# Run all tests
go test ./logging/...

# Run with coverage
go test -cover ./logging/...

# Run benchmarks
go test -bench=. ./logging/...

# Run integration tests only
go test -run TestIntegration ./logging/...
```

### Test Coverage

The logging system includes comprehensive tests:

- **Unit Tests**: Core logger functionality, configuration, context management
- **Integration Tests**: Complete request flow, middleware interaction, error scenarios
- **Benchmark Tests**: Performance impact measurement
- **Example Tests**: Usage pattern validation

### Performance Benchmarks

Expected performance impact:

- **Request overhead**: < 1ms per request
- **Memory allocation**: Minimal additional allocations
- **CPU usage**: < 1% additional CPU usage under normal load

## Future Storage Extensions

The system is designed with interfaces for future storage implementations:

### File Storage (Planned)

```go
// Future implementation
fileWriter := &FileLogWriterImpl{
    config: FileStorageConfig{
        Directory:   "/var/log/tether-erp",
        MaxFileSize: 100 * 1024 * 1024, // 100MB
        MaxFiles:    10,
        Compress:    true,
    },
}
```

### Remote Storage (Planned)

```go
// Future implementation for cloud services
remoteWriter := &RemoteLogWriterImpl{
    config: RemoteStorageConfig{
        Endpoint: "https://logs.example.com/api/v1/logs",
        Credentials: map[string]string{
            "api_key": "your-api-key",
        },
        BatchSize: 100,
    },
}
```

### Database Storage (Planned)

```go
// Future implementation for database persistence
dbWriter := &DatabaseLogWriterImpl{
    config: DatabaseStorageConfig{
        ConnectionString: "postgres://user:pass@localhost/logs",
        TableName:        "application_logs",
        RetentionDays:    30,
    },
}
```

## Troubleshooting

### Common Issues

1. **Missing Request ID in Logs**
   - Ensure middleware is properly configured
   - Check that `SetupFiberMiddleware` is called before routes

2. **Logs Not Appearing**
   - Check `LOG_LEVEL` environment variable
   - Verify `ENABLE_REQUEST_LOGS` is set to `true`

3. **Performance Issues**
   - Reduce log level in production
   - Increase `SLOW_REQUEST_THRESHOLD_MS` if needed
   - Disable caller information in production

4. **Stack Traces Missing**
   - Set `ENABLE_STACK_TRACE=true`
   - Ensure error logging middleware is configured

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=debug LOG_FORMAT=console go run main.go
```

### Health Check Integration

```go
app.Get("/health", func(c *fiber.Ctx) error {
    checks := map[string]interface{}{
        "database": "ok",
        "redis": "ok",
        "logging": "ok",
    }

    logging.LogHealthCheck(c, "healthy", checks)

    return c.JSON(fiber.Map{
        "status": "healthy",
        "checks": checks,
        "request_id": logging.FromContext(c).GetRequestID(),
    })
})
```

## Best Practices

1. **Always use context logger**: `logging.FromContext(c)` instead of global logger
2. **Add meaningful fields**: Include relevant business context in logs
3. **Use appropriate log levels**: Debug for development, Info for normal operations
4. **Handle errors gracefully**: Always log errors with context before returning
5. **Monitor performance**: Use slow request detection to identify bottlenecks
6. **Structured data**: Use fields instead of string formatting for searchable logs
7. **Request ID propagation**: Include request ID in error responses for traceability

## Contributing

When extending the logging system:

1. Maintain backward compatibility
2. Add comprehensive tests for new features
3. Update documentation and examples
4. Follow the established patterns for middleware and configuration
5. Consider performance impact of new features

## License

This logging system is part of the Tether-ERP project.
