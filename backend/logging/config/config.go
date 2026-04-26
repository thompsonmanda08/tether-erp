package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// LoggingConfig holds all logging-related configuration
type LoggingConfig struct {
	// Core settings
	Level  string `json:"level"`
	Format string `json:"format"`

	// Request logging
	EnableRequestLogs bool `json:"enable_request_logs"`
	
	// Performance monitoring
	SlowRequestThresholdMS int           `json:"slow_request_threshold_ms"`
	SlowRequestThreshold   time.Duration `json:"-"` // Computed field
	
	// Error handling
	EnableStackTrace bool `json:"enable_stack_trace"`
	EnableCaller     bool `json:"enable_caller"`
	
	// Output settings
	EnableColors bool `json:"enable_colors"`
	
	// Future storage preparation
	EnablePersistence bool   `json:"enable_persistence"`
	StorageType       string `json:"storage_type"` // "file", "remote", "database"
	StorageConfig     map[string]interface{} `json:"storage_config"`
}

// DefaultLoggingConfig returns the default logging configuration
func DefaultLoggingConfig() *LoggingConfig {
	return &LoggingConfig{
		Level:                  "info",
		Format:                 "json",
		EnableRequestLogs:      true,
		SlowRequestThresholdMS: 100,
		SlowRequestThreshold:   100 * time.Millisecond,
		EnableStackTrace:       true,
		EnableCaller:           true,
		EnableColors:           false,
		EnablePersistence:      false,
		StorageType:            "console",
		StorageConfig:          make(map[string]interface{}),
	}
}

// LoadFromEnv loads configuration from environment variables
func LoadFromEnv() *LoggingConfig {
	config := DefaultLoggingConfig()

	// LOG_LEVEL (debug, info, warn, error)
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		config.Level = strings.ToLower(level)
	}

	// LOG_FORMAT (json, console)
	if format := os.Getenv("LOG_FORMAT"); format != "" {
		config.Format = strings.ToLower(format)
		if config.Format == "console" {
			config.EnableColors = true
		}
	}

	// ENABLE_REQUEST_LOGS (true, false)
	if enableLogs := os.Getenv("ENABLE_REQUEST_LOGS"); enableLogs != "" {
		config.EnableRequestLogs = strings.ToLower(enableLogs) == "true"
	}

	// SLOW_REQUEST_THRESHOLD_MS (integer in milliseconds)
	if threshold := os.Getenv("SLOW_REQUEST_THRESHOLD_MS"); threshold != "" {
		if ms, err := strconv.Atoi(threshold); err == nil && ms > 0 {
			config.SlowRequestThresholdMS = ms
			config.SlowRequestThreshold = time.Duration(ms) * time.Millisecond
		}
	}

	// ENABLE_STACK_TRACE (true, false)
	if enableStack := os.Getenv("ENABLE_STACK_TRACE"); enableStack != "" {
		config.EnableStackTrace = strings.ToLower(enableStack) == "true"
	}

	// ENABLE_CALLER (true, false)
	if enableCaller := os.Getenv("ENABLE_CALLER"); enableCaller != "" {
		config.EnableCaller = strings.ToLower(enableCaller) == "true"
	}

	// ENABLE_COLORS (true, false) - mainly for console format
	if enableColors := os.Getenv("ENABLE_COLORS"); enableColors != "" {
		config.EnableColors = strings.ToLower(enableColors) == "true"
	}

	// Future storage configuration
	if enablePersistence := os.Getenv("ENABLE_LOG_PERSISTENCE"); enablePersistence != "" {
		config.EnablePersistence = strings.ToLower(enablePersistence) == "true"
	}

	if storageType := os.Getenv("LOG_STORAGE_TYPE"); storageType != "" {
		config.StorageType = strings.ToLower(storageType)
	}

	return config
}

// Validate checks if the configuration is valid
func (c *LoggingConfig) Validate() error {
	// Validate log level
	validLevels := map[string]bool{
		"debug": true,
		"info":  true,
		"warn":  true,
		"error": true,
	}
	if !validLevels[c.Level] {
		c.Level = "info" // Default to info if invalid
	}

	// Validate format
	validFormats := map[string]bool{
		"json":    true,
		"console": true,
	}
	if !validFormats[c.Format] {
		c.Format = "json" // Default to json if invalid
	}

	// Validate threshold
	if c.SlowRequestThresholdMS <= 0 {
		c.SlowRequestThresholdMS = 100
		c.SlowRequestThreshold = 100 * time.Millisecond
	} else {
		c.SlowRequestThreshold = time.Duration(c.SlowRequestThresholdMS) * time.Millisecond
	}

	// Validate storage type
	validStorageTypes := map[string]bool{
		"console":  true,
		"file":     true,
		"remote":   true,
		"database": true,
	}
	if !validStorageTypes[c.StorageType] {
		c.StorageType = "console"
	}

	return nil
}

// IsDebugEnabled returns true if debug logging is enabled
func (c *LoggingConfig) IsDebugEnabled() bool {
	return c.Level == "debug"
}

// IsProductionMode returns true if running in production mode
func (c *LoggingConfig) IsProductionMode() bool {
	env := strings.ToLower(os.Getenv("APP_ENV"))
	return env == "production" || env == "prod"
}

// GetSlowRequestThreshold returns the slow request threshold as duration
func (c *LoggingConfig) GetSlowRequestThreshold() time.Duration {
	return c.SlowRequestThreshold
}

// DevelopmentConfig returns a configuration optimized for development
func DevelopmentConfig() *LoggingConfig {
	config := DefaultLoggingConfig()
	config.Level = "debug"
	config.Format = "console"
	config.EnableColors = true
	config.EnableCaller = true
	config.EnableStackTrace = true
	config.SlowRequestThresholdMS = 50 // Lower threshold for dev
	config.SlowRequestThreshold = 50 * time.Millisecond
	return config
}

// ProductionConfig returns a configuration optimized for production
func ProductionConfig() *LoggingConfig {
	config := DefaultLoggingConfig()
	config.Level = "info"
	config.Format = "json"
	config.EnableColors = false
	config.EnableCaller = false
	config.EnableStackTrace = true
	config.SlowRequestThresholdMS = 200 // Higher threshold for prod
	config.SlowRequestThreshold = 200 * time.Millisecond
	return config
}

// TestConfig returns a configuration optimized for testing
func TestConfig() *LoggingConfig {
	config := DefaultLoggingConfig()
	config.Level = "warn" // Reduce noise in tests
	config.Format = "json"
	config.EnableRequestLogs = false
	config.EnableColors = false
	config.EnableCaller = false
	config.EnableStackTrace = false
	return config
}