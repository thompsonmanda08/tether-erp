package logging

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()
	
	assert.Equal(t, InfoLevel, config.Level)
	assert.Equal(t, JSONFormat, config.Format)
	assert.True(t, config.EnableRequestLogs)
	assert.Equal(t, 100, config.SlowRequestThresholdMS)
	assert.True(t, config.EnableStackTrace)
	assert.True(t, config.EnableCaller)
}

func TestLoadConfigFromEnv(t *testing.T) {
	// Set environment variables
	os.Setenv("LOG_LEVEL", "debug")
	os.Setenv("LOG_FORMAT", "console")
	os.Setenv("ENABLE_REQUEST_LOGS", "false")
	os.Setenv("SLOW_REQUEST_THRESHOLD_MS", "200")
	os.Setenv("ENABLE_STACK_TRACE", "false")
	os.Setenv("ENABLE_CALLER", "false")
	
	defer func() {
		// Clean up
		os.Unsetenv("LOG_LEVEL")
		os.Unsetenv("LOG_FORMAT")
		os.Unsetenv("ENABLE_REQUEST_LOGS")
		os.Unsetenv("SLOW_REQUEST_THRESHOLD_MS")
		os.Unsetenv("ENABLE_STACK_TRACE")
		os.Unsetenv("ENABLE_CALLER")
	}()
	
	config := LoadConfigFromEnv()
	
	assert.Equal(t, DebugLevel, config.Level)
	assert.Equal(t, ConsoleFormat, config.Format)
	assert.False(t, config.EnableRequestLogs)
	assert.Equal(t, 200, config.SlowRequestThresholdMS)
	assert.False(t, config.EnableStackTrace)
	assert.False(t, config.EnableCaller)
}

func TestInitialize(t *testing.T) {
	config := &Config{
		Level:                   DebugLevel,
		Format:                  JSONFormat,
		EnableRequestLogs:       true,
		SlowRequestThresholdMS:  100,
		EnableStackTrace:        true,
		EnableCaller:            false,
	}
	
	Initialize(config)
	
	logger := GetGlobalLogger()
	assert.NotNil(t, logger)
}

func TestLoggerWithRequestID(t *testing.T) {
	Initialize(DefaultConfig())
	
	logger := GetGlobalLogger()
	
	// Test that we can create a logger
	assert.NotNil(t, logger)
	assert.Equal(t, "", logger.GetRequestID()) // Empty for global logger
}

func TestLoggerWithField(t *testing.T) {
	Initialize(DefaultConfig())
	
	logger := GetGlobalLogger()
	
	loggerWithField := logger.WithField("test_key", "test_value")
	assert.NotNil(t, loggerWithField)
}

func TestLoggerWithFields(t *testing.T) {
	Initialize(DefaultConfig())
	
	logger := GetGlobalLogger()
	
	fields := map[string]interface{}{
		"key1": "value1",
		"key2": 123,
		"key3": true,
	}
	
	loggerWithFields := logger.WithFields(fields)
	assert.NotNil(t, loggerWithFields)
}

func TestLoggerWithError(t *testing.T) {
	Initialize(DefaultConfig())
	
	logger := GetGlobalLogger()
	err := assert.AnError
	
	loggerWithError := logger.WithError(err)
	assert.NotNil(t, loggerWithError)
}

func TestLogLevels(t *testing.T) {
	// This is a simplified test
	Initialize(DefaultConfig())
	
	logger := GetGlobalLogger()
	
	// Test that methods don't panic
	assert.NotPanics(t, func() {
		logger.Debug("debug message")
		logger.Info("info message")
		logger.Warn("warn message")
		logger.Error("error message")
	})
}

func TestPackageLevelFunctions(t *testing.T) {
	Initialize(DefaultConfig())
	
	// Test that package-level functions don't panic
	assert.NotPanics(t, func() {
		Debug("debug message")
		Info("info message")
		Warn("warn message")
		Error("error message")
	})
	
	assert.NotPanics(t, func() {
		WithField("key", "value").Info("message with field")
		WithFields(map[string]interface{}{"key1": "value1", "key2": "value2"}).Info("message with fields")
		WithError(assert.AnError).Error("message with error")
	})
}

func TestJSONOutput(t *testing.T) {
	// This test would require capturing the actual output
	// For now, we'll just test that JSON format can be set
	config := &Config{
		Level:                   InfoLevel,
		Format:                  JSONFormat,
		EnableRequestLogs:       true,
		SlowRequestThresholdMS:  100,
		EnableStackTrace:        true,
		EnableCaller:            false,
	}
	
	assert.NotPanics(t, func() {
		Initialize(config)
	})
}

func TestConsoleOutput(t *testing.T) {
	// This test would require capturing the actual output
	// For now, we'll just test that console format can be set
	config := &Config{
		Level:                   InfoLevel,
		Format:                  ConsoleFormat,
		EnableRequestLogs:       true,
		SlowRequestThresholdMS:  100,
		EnableStackTrace:        true,
		EnableCaller:            false,
	}
	
	assert.NotPanics(t, func() {
		Initialize(config)
	})
}

func TestLoggerChaining(t *testing.T) {
	Initialize(DefaultConfig())
	
	logger := GetGlobalLogger()
	
	// Test method chaining
	chainedLogger := logger.
		WithField("user_id", "user-456").
		WithFields(map[string]interface{}{
			"action": "test",
			"count":  1,
		})
	
	assert.NotNil(t, chainedLogger)
}

func TestErrorWithStack(t *testing.T) {
	Initialize(DefaultConfig())
	
	logger := GetGlobalLogger()
	err := assert.AnError
	
	// Test that ErrorWithStack doesn't panic
	assert.NotPanics(t, func() {
		logger.ErrorWithStack(err, "test error with stack")
	})
}

// Benchmark tests
func BenchmarkLoggerCreation(b *testing.B) {
	Initialize(DefaultConfig())
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = GetGlobalLogger()
	}
}

func BenchmarkLoggerWithRequestID(b *testing.B) {
	Initialize(DefaultConfig())
	logger := GetGlobalLogger()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = logger.WithField("request_id", "test-request-id")
	}
}

func BenchmarkLoggerWithField(b *testing.B) {
	Initialize(DefaultConfig())
	logger := GetGlobalLogger()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = logger.WithField("test_key", "test_value")
	}
}

func BenchmarkLoggerInfo(b *testing.B) {
	Initialize(DefaultConfig())
	logger := GetGlobalLogger()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		logger.Info("test message")
	}
}

func BenchmarkLoggerWithFieldsAndInfo(b *testing.B) {
	Initialize(DefaultConfig())
	logger := GetGlobalLogger()
	
	fields := map[string]interface{}{
		"key1": "value1",
		"key2": 123,
		"key3": true,
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		logger.WithFields(fields).Info("test message")
	}
}

// Helper function to capture log output (for more advanced testing)
func captureLogOutput(fn func()) string {
	// This would require more complex setup to capture zerolog output
	// For now, return empty string
	fn()
	return ""
}

// Test log output format (simplified)
func TestLogOutputFormat(t *testing.T) {
	// This is a simplified test
	config := &Config{
		Level:                   InfoLevel,
		Format:                  JSONFormat,
		EnableRequestLogs:       true,
		SlowRequestThresholdMS:  100,
		EnableStackTrace:        true,
		EnableCaller:            false,
	}
	
	Initialize(config)
	logger := GetGlobalLogger()
	
	// Test that logging doesn't panic and produces some output
	assert.NotPanics(t, func() {
		logger.WithField("test", "value").Info("test message")
	})
}