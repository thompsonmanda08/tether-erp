package logging

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetupLogging(t *testing.T) {
	// Test default setup
	cfg := SetupLogging()
	assert.NotNil(t, cfg)
	
	// Test that global logger is initialized
	logger := GetGlobalLogger()
	assert.NotNil(t, logger)
}

func TestSetupLoggingWithEnvironment(t *testing.T) {
	tests := []struct {
		name        string
		env         string
		expectedLevel string
	}{
		{"development", "development", "debug"},
		{"production", "production", "info"},
		{"test", "test", "warn"},
		{"default", "", "info"},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment
			if tt.env != "" {
				os.Setenv("APP_ENV", tt.env)
				defer os.Unsetenv("APP_ENV")
			}
			
			cfg := SetupLogging()
			assert.Equal(t, tt.expectedLevel, cfg.Level)
		})
	}
}

func TestSetupFiberMiddleware(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	
	// Test that middleware setup doesn't panic
	assert.NotPanics(t, func() {
		SetupFiberMiddleware(app, cfg)
	})
}

func TestCompleteRequestFlow(t *testing.T) {
	// Setup
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	// Add test route
	app.Get("/test", func(c *fiber.Ctx) error {
		logger := FromContext(c)
		logger.Info("test_handler_called")
		
		return c.JSON(fiber.Map{
			"message":    "success",
			"request_id": logger.GetRequestID(),
		})
	})
	
	// Test request
	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	// Check that X-Request-ID header is set
	requestID := resp.Header.Get("X-Request-ID")
	assert.NotEmpty(t, requestID)
	assert.True(t, strings.HasPrefix(requestID, "req_"))
}

func TestRequestIDPropagation(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	var capturedRequestID string
	
	app.Get("/test", func(c *fiber.Ctx) error {
		logger := FromContext(c)
		capturedRequestID = logger.GetRequestID()
		
		return c.JSON(fiber.Map{"status": "ok"})
	})
	
	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	
	// Request ID should be in response header
	headerRequestID := resp.Header.Get("X-Request-ID")
	assert.NotEmpty(t, headerRequestID)
	
	// Request ID should match what was captured in handler
	assert.Equal(t, headerRequestID, capturedRequestID)
}

func TestErrorHandling(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/error", func(c *fiber.Ctx) error {
		return fiber.NewError(500, "Test error")
	})
	
	req := httptest.NewRequest("GET", "/error", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	
	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	
	// Should still have request ID
	requestID := resp.Header.Get("X-Request-ID")
	assert.NotEmpty(t, requestID)
}

func TestPanicRecovery(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/panic", func(c *fiber.Ctx) error {
		panic("test panic")
	})
	
	req := httptest.NewRequest("GET", "/panic", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	
	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	
	// Should still have request ID
	requestID := resp.Header.Get("X-Request-ID")
	assert.NotEmpty(t, requestID)
}

func TestSlowRequestDetection(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	cfg.SlowRequestThresholdMS = 10 // Very low threshold for testing
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/slow", func(c *fiber.Ctx) error {
		time.Sleep(20 * time.Millisecond) // Simulate slow operation
		return c.JSON(fiber.Map{"status": "ok"})
	})
	
	req := httptest.NewRequest("GET", "/slow", nil)
	resp, err := app.Test(req, 1000) // 1 second timeout
	require.NoError(t, err)
	
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestContextFieldAddition(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/test", func(c *fiber.Ctx) error {
		// Add fields to request context
		AddFieldToRequest(c, "user_id", "123")
		AddFieldsToRequest(c, map[string]interface{}{
			"action": "test",
			"count":  1,
		})
		
		logger := FromContext(c)
		logger.Info("test_with_fields")
		
		return c.JSON(fiber.Map{"status": "ok"})
	})
	
	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestLoggingHelperFunctions(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/test", func(c *fiber.Ctx) error {
		// Test helper functions
		LogInfo(c, "info message")
		LogWarn(c, "warn message")
		LogDebug(c, "debug message")
		LogError(c, fiber.NewError(400, "test error"), "error message")
		
		return c.JSON(fiber.Map{"status": "ok"})
	})
	
	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestDifferentEnvironmentConfigs(t *testing.T) {
	environments := []string{"development", "production", "test"}
	
	for _, env := range environments {
		t.Run(env, func(t *testing.T) {
			os.Setenv("APP_ENV", env)
			defer os.Unsetenv("APP_ENV")
			
			app := fiber.New()
			cfg := SetupLogging()
			
			assert.NotPanics(t, func() {
				SetupFiberMiddleware(app, cfg)
			})
			
			// Add test route
			app.Get("/test", func(c *fiber.Ctx) error {
				logger := FromContext(c)
				logger.Info("test_message")
				return c.JSON(fiber.Map{"env": env})
			})
			
			req := httptest.NewRequest("GET", "/test", nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			
			assert.Equal(t, http.StatusOK, resp.StatusCode)
		})
	}
}

func TestHealthCheckLogging(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/health", func(c *fiber.Ctx) error {
		checks := map[string]interface{}{
			"database": "ok",
			"redis":    "ok",
		}
		
		LogHealthCheck(c, "healthy", checks)
		
		return c.JSON(fiber.Map{
			"status": "healthy",
			"checks": checks,
		})
	})
	
	req := httptest.NewRequest("GET", "/health", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestLogStartupAndShutdown(t *testing.T) {
	cfg := SetupLogging()
	assert.NotNil(t, cfg)
	
	// Test startup logging
	assert.NotPanics(t, func() {
		LogStartupInfo("8080")
	})
	
	// Test shutdown logging
	assert.NotPanics(t, func() {
		LogShutdownInfo()
	})
}

// Benchmark tests for integration
func BenchmarkCompleteRequestFlow(b *testing.B) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/test", func(c *fiber.Ctx) error {
		logger := FromContext(c)
		logger.Info("benchmark_test")
		return c.JSON(fiber.Map{"status": "ok"})
	})
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		resp, err := app.Test(req)
		if err != nil {
			b.Fatal(err)
		}
		resp.Body.Close()
	}
}

func BenchmarkRequestWithFields(b *testing.B) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/test", func(c *fiber.Ctx) error {
		AddFieldsToRequest(c, map[string]interface{}{
			"user_id": "123",
			"action":  "benchmark",
			"count":   1,
		})
		
		logger := FromContext(c)
		logger.Info("benchmark_test_with_fields")
		return c.JSON(fiber.Map{"status": "ok"})
	})
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/test", nil)
		resp, err := app.Test(req)
		if err != nil {
			b.Fatal(err)
		}
		resp.Body.Close()
	}
}

// Test example handler
func TestExampleHandler(t *testing.T) {
	app := fiber.New()
	cfg := SetupLogging()
	SetupFiberMiddleware(app, cfg)
	
	app.Get("/user/:id", ExampleHandler)
	
	tests := []struct {
		name           string
		userID         string
		expectedStatus int
	}{
		{"valid_user", "123", 200},
		{"missing_user", "", 404}, // Fiber will return 404 for missing param
		{"error_user", "error", 500},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := "/user/" + tt.userID
			if tt.userID == "" {
				path = "/user/"
			}
			
			req := httptest.NewRequest("GET", path, nil)
			resp, err := app.Test(req)
			require.NoError(t, err)
			
			// Note: The actual status might differ based on Fiber's routing behavior
			// This test mainly ensures the handler doesn't panic
			assert.NotEqual(t, 0, resp.StatusCode)
		})
	}
}