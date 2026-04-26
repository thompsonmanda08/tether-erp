package logging

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	logContext "github.com/tether-erp/logging/context"
)

// Logger wraps zerolog.Logger with additional functionality
type Logger = logContext.Logger

// LogLevel represents the logging level
type LogLevel string

const (
	DebugLevel LogLevel = "debug"
	InfoLevel  LogLevel = "info"
	WarnLevel  LogLevel = "warn"
	ErrorLevel LogLevel = "error"
)

// LogFormat represents the output format
type LogFormat string

const (
	JSONFormat    LogFormat = "json"
	ConsoleFormat LogFormat = "console"
)

// Config holds logging configuration
type Config struct {
	Level                   LogLevel
	Format                  LogFormat
	EnableRequestLogs       bool
	SlowRequestThresholdMS  int
	EnableStackTrace        bool
	EnableCaller            bool
}

// DefaultConfig returns default logging configuration
func DefaultConfig() *Config {
	return &Config{
		Level:                   InfoLevel,
		Format:                  JSONFormat,
		EnableRequestLogs:       true,
		SlowRequestThresholdMS:  100,
		EnableStackTrace:        true,
		EnableCaller:            true,
	}
}

// LoadConfigFromEnv loads configuration from environment variables
func LoadConfigFromEnv() *Config {
	config := DefaultConfig()

	// LOG_LEVEL
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		config.Level = LogLevel(strings.ToLower(level))
	}

	// LOG_FORMAT
	if format := os.Getenv("LOG_FORMAT"); format != "" {
		config.Format = LogFormat(strings.ToLower(format))
	}

	// ENABLE_REQUEST_LOGS
	if enableLogs := os.Getenv("ENABLE_REQUEST_LOGS"); enableLogs != "" {
		config.EnableRequestLogs = strings.ToLower(enableLogs) == "true"
	}

	// SLOW_REQUEST_THRESHOLD_MS
	if threshold := os.Getenv("SLOW_REQUEST_THRESHOLD_MS"); threshold != "" {
		if ms, err := strconv.Atoi(threshold); err == nil {
			config.SlowRequestThresholdMS = ms
		}
	}

	// ENABLE_STACK_TRACE
	if enableStack := os.Getenv("ENABLE_STACK_TRACE"); enableStack != "" {
		config.EnableStackTrace = strings.ToLower(enableStack) == "true"
	}

	// ENABLE_CALLER
	if enableCaller := os.Getenv("ENABLE_CALLER"); enableCaller != "" {
		config.EnableCaller = strings.ToLower(enableCaller) == "true"
	}

	return config
}

// globalLogger holds the global logger instance
var globalLogger zerolog.Logger

// Initialize sets up the global logger with the provided configuration
func Initialize(config *Config) {
	var output io.Writer = os.Stdout

	// Configure zerolog
	zerolog.TimeFieldFormat = time.RFC3339
	zerolog.TimestampFieldName = "timestamp"
	zerolog.LevelFieldName = "level"
	zerolog.MessageFieldName = "message"

	// Set log level
	switch config.Level {
	case DebugLevel:
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case InfoLevel:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case WarnLevel:
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case ErrorLevel:
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Configure output format
	if config.Format == ConsoleFormat {
		output = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: "2006-01-02 15:04:05",
			FormatLevel: func(i interface{}) string {
				return strings.ToUpper(fmt.Sprintf("| %-5s |", i))
			},
			FormatMessage: func(i interface{}) string {
				return fmt.Sprintf("%s", i)
			},
			FormatFieldName: func(i interface{}) string {
				return fmt.Sprintf("%s=", i)
			},
			FormatFieldValue: func(i interface{}) string {
				return fmt.Sprintf("%s", i)
			},
		}
	}

	// Create base logger
	baseLogger := zerolog.New(output).With().Timestamp()

	// Add caller information if enabled
	if config.EnableCaller {
		baseLogger = baseLogger.Caller()
	}

	// Create global logger
	globalLogger = baseLogger.Logger()

	// Set as global zerolog logger
	log.Logger = globalLogger
}

// GetGlobalLogger returns the global logger instance
func GetGlobalLogger() *Logger {
	if globalLogger.GetLevel() == zerolog.Disabled {
		Initialize(DefaultConfig())
	}
	return &logContext.Logger{
		Logger: globalLogger,
	}
}

// GetGlobalZerologLogger returns the global zerolog logger
func GetGlobalZerologLogger() zerolog.Logger {
	return globalLogger
}

// Package-level convenience functions
func Debug(msg string) {
	GetGlobalLogger().Debug(msg)
}

func Info(msg string) {
	GetGlobalLogger().Info(msg)
}

func Warn(msg string) {
	GetGlobalLogger().Warn(msg)
}

func Error(msg string) {
	GetGlobalLogger().Error(msg)
}

func ErrorWithStack(err error, msg string) {
	GetGlobalLogger().ErrorWithStack(err, msg)
}

func Fatal(msg string) {
	GetGlobalLogger().Fatal(msg)
}

func WithField(key string, value interface{}) *Logger {
	return GetGlobalLogger().WithField(key, value)
}

func WithFields(fields map[string]interface{}) *Logger {
	return GetGlobalLogger().WithFields(fields)
}

func WithError(err error) *Logger {
	return GetGlobalLogger().WithError(err)
}