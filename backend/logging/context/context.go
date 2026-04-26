package context

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// Context keys for storing logger and request data
const (
	LoggerKey   = "logger"
	RequestIDKey = "request_id"
)

// Logger wraps zerolog.Logger with additional functionality
type Logger struct {
	zerolog.Logger
	requestID string
}

// RequestContext holds request-scoped data
type RequestContext struct {
	RequestID string
	Logger    *Logger
	Fields    map[string]interface{}
}

// NewRequestContext creates a new request context with a unique request ID
func NewRequestContext(globalLogger zerolog.Logger) *RequestContext {
	requestID := generateRequestID()
	logger := &Logger{
		Logger:    globalLogger.With().Str("request_id", requestID).Logger(),
		requestID: requestID,
	}
	
	return &RequestContext{
		RequestID: requestID,
		Logger:    logger,
		Fields:    make(map[string]interface{}),
	}
}

// NewRequestContextWithID creates a new request context with a specific request ID
func NewRequestContextWithID(globalLogger zerolog.Logger, requestID string) *RequestContext {
	if requestID == "" {
		requestID = generateRequestID()
	}
	
	logger := &Logger{
		Logger:    globalLogger.With().Str("request_id", requestID).Logger(),
		requestID: requestID,
	}
	
	return &RequestContext{
		RequestID: requestID,
		Logger:    logger,
		Fields:    make(map[string]interface{}),
	}
}

// AddField adds a field to the request context
func (rc *RequestContext) AddField(key string, value interface{}) {
	rc.Fields[key] = value
	rc.Logger = &Logger{
		Logger:    rc.Logger.Logger.With().Interface(key, value).Logger(),
		requestID: rc.RequestID,
	}
}

// AddFields adds multiple fields to the request context
func (rc *RequestContext) AddFields(fields map[string]interface{}) {
	ctx := rc.Logger.Logger.With()
	for key, value := range fields {
		rc.Fields[key] = value
		ctx = ctx.Interface(key, value)
	}
	rc.Logger = &Logger{
		Logger:    ctx.Logger(),
		requestID: rc.RequestID,
	}
}

// GetLogger returns the logger with all accumulated fields
func (rc *RequestContext) GetLogger() *Logger {
	return rc.Logger
}

// GetRequestID returns the request ID
func (rc *RequestContext) GetRequestID() string {
	return rc.RequestID
}

// GetFields returns all accumulated fields
func (rc *RequestContext) GetFields() map[string]interface{} {
	return rc.Fields
}

// StoreInFiberContext stores the request context in Fiber context
func (rc *RequestContext) StoreInFiberContext(c *fiber.Ctx) {
	c.Locals(LoggerKey, rc.Logger)
	c.Locals(RequestIDKey, rc.RequestID)
	c.Locals("request_context", rc)
}

// FromFiberContext retrieves the logger from Fiber context
func FromFiberContext(c *fiber.Ctx) *Logger {
	if logger, ok := c.Locals(LoggerKey).(*Logger); ok {
		return logger
	}
	
	// Fallback: create a new logger with request ID if available
	if requestID, ok := c.Locals(RequestIDKey).(string); ok {
		return &Logger{
			Logger:    zerolog.New(nil).With().Str("request_id", requestID).Logger(),
			requestID: requestID,
		}
	}
	
	// Last resort: return basic logger
	return &Logger{
		Logger:    zerolog.New(nil),
		requestID: "",
	}
}

// GetRequestIDFromFiberContext retrieves the request ID from Fiber context
func GetRequestIDFromFiberContext(c *fiber.Ctx) string {
	if requestID, ok := c.Locals(RequestIDKey).(string); ok {
		return requestID
	}
	return ""
}

// GetRequestContextFromFiberContext retrieves the full request context from Fiber context
func GetRequestContextFromFiberContext(c *fiber.Ctx, globalLogger zerolog.Logger) *RequestContext {
	if rc, ok := c.Locals("request_context").(*RequestContext); ok {
		return rc
	}
	
	// Create a new context if not found
	rc := NewRequestContext(globalLogger)
	rc.StoreInFiberContext(c)
	return rc
}

// StoreInGoContext stores the request context in Go context
func (rc *RequestContext) StoreInGoContext(ctx context.Context) context.Context {
	ctx = context.WithValue(ctx, LoggerKey, rc.Logger)
	ctx = context.WithValue(ctx, RequestIDKey, rc.RequestID)
	return context.WithValue(ctx, "request_context", rc)
}

// FromGoContext retrieves the logger from Go context
func FromGoContext(ctx context.Context) *Logger {
	if logger, ok := ctx.Value(LoggerKey).(*Logger); ok {
		return logger
	}
	
	// Fallback: create a new logger with request ID if available
	if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
		return &Logger{
			Logger:    zerolog.New(nil).With().Str("request_id", requestID).Logger(),
			requestID: requestID,
		}
	}
	
	// Last resort: return basic logger
	return &Logger{
		Logger:    zerolog.New(nil),
		requestID: "",
	}
}

// GetRequestIDFromGoContext retrieves the request ID from Go context
func GetRequestIDFromGoContext(ctx context.Context) string {
	if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
		return requestID
	}
	return ""
}

// GetRequestContextFromGoContext retrieves the full request context from Go context
func GetRequestContextFromGoContext(ctx context.Context, globalLogger zerolog.Logger) *RequestContext {
	if rc, ok := ctx.Value("request_context").(*RequestContext); ok {
		return rc
	}
	
	// Create a new context if not found
	return NewRequestContext(globalLogger)
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return "req_" + uuid.New().String()[:8]
}

// Convenience functions for common operations

// LogWithContext logs a message with the request context
func LogWithContext(c *fiber.Ctx, level string, message string, fields ...map[string]interface{}) {
	logger := FromFiberContext(c)
	
	// Start with appropriate level event
	var event *zerolog.Event
	switch level {
	case "debug":
		event = logger.Logger.Debug()
	case "info":
		event = logger.Logger.Info()
	case "warn":
		event = logger.Logger.Warn()
	case "error":
		event = logger.Logger.Error()
	default:
		event = logger.Logger.Info()
	}
	
	// Add any additional fields
	for _, fieldMap := range fields {
		for key, value := range fieldMap {
			event = event.Interface(key, value)
		}
	}
	
	event.Msg(message)
}

// LogErrorWithContext logs an error with the request context
func LogErrorWithContext(c *fiber.Ctx, err error, message string, fields ...map[string]interface{}) {
	logger := FromFiberContext(c)
	
	// Start with error event
	event := logger.Logger.Error().Stack().Err(err)
	
	// Add any additional fields
	for _, fieldMap := range fields {
		for key, value := range fieldMap {
			event = event.Interface(key, value)
		}
	}
	
	event.Msg(message)
}

// AddFieldToContext adds a field to the request context stored in Fiber context
func AddFieldToContext(c *fiber.Ctx, key string, value interface{}, globalLogger zerolog.Logger) {
	rc := GetRequestContextFromFiberContext(c, globalLogger)
	rc.AddField(key, value)
	rc.StoreInFiberContext(c)
}

// AddFieldsToContext adds multiple fields to the request context stored in Fiber context
func AddFieldsToContext(c *fiber.Ctx, fields map[string]interface{}, globalLogger zerolog.Logger) {
	rc := GetRequestContextFromFiberContext(c, globalLogger)
	rc.AddFields(fields)
	rc.StoreInFiberContext(c)
}

// WithField adds a field to the logger
func (l *Logger) WithField(key string, value interface{}) *Logger {
	return &Logger{
		Logger:    l.Logger.With().Interface(key, value).Logger(),
		requestID: l.requestID,
	}
}

// WithFields adds multiple fields to the logger
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	ctx := l.Logger.With()
	for key, value := range fields {
		ctx = ctx.Interface(key, value)
	}
	return &Logger{
		Logger:    ctx.Logger(),
		requestID: l.requestID,
	}
}

// WithError adds error to the logger context
func (l *Logger) WithError(err error) *Logger {
	return &Logger{
		Logger:    l.Logger.With().Err(err).Logger(),
		requestID: l.requestID,
	}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string) {
	l.Logger.Debug().Msg(msg)
}

// Info logs an info message
func (l *Logger) Info(msg string) {
	l.Logger.Info().Msg(msg)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string) {
	l.Logger.Warn().Msg(msg)
}

// Error logs an error message
func (l *Logger) Error(msg string) {
	l.Logger.Error().Msg(msg)
}

// ErrorWithStack logs an error with stack trace
func (l *Logger) ErrorWithStack(err error, msg string) {
	l.Logger.Error().Stack().Err(err).Msg(msg)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(msg string) {
	l.Logger.Fatal().Msg(msg)
}

// GetRequestID returns the request ID associated with this logger
func (l *Logger) GetRequestID() string {
	return l.requestID
}