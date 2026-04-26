//go:build ignore

package main

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/logging"
)

func main() {
	// Set environment for demo
	os.Setenv("LOG_LEVEL", "debug")
	os.Setenv("LOG_FORMAT", "console")
	os.Setenv("ENABLE_COLORS", "true")
	
	// Initialize logging system
	cfg := logging.SetupLogging()
	
	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Logging Test App",
	})
	
	// Setup logging middleware
	logging.SetupFiberMiddleware(app, cfg)
	
	// Test routes
	app.Get("/", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Info("handling_root_request")
		
		return c.JSON(fiber.Map{
			"message":    "Logging system is working!",
			"request_id": logger.GetRequestID(),
			"timestamp":  time.Now().UTC(),
		})
	})
	
	app.Get("/test/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		
		// Add context
		logging.AddFieldToRequest(c, "test_id", id)
		logging.AddFieldsToRequest(c, map[string]interface{}{
			"operation": "test",
			"version":   "1.0",
		})
		
		logger := logging.FromContext(c)
		logger.WithField("extra_info", "test_data").Info("processing_test_request")
		
		if id == "error" {
			err := fmt.Errorf("simulated error for testing")
			logging.LogError(c, err, "test_error_occurred")
			return c.Status(500).JSON(fiber.Map{
				"error":      "Test error",
				"request_id": logger.GetRequestID(),
			})
		}
		
		logger.Info("test_request_completed_successfully")
		
		return c.JSON(fiber.Map{
			"test_id":    id,
			"status":     "success",
			"request_id": logger.GetRequestID(),
		})
	})
	
	app.Get("/slow", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Info("starting_slow_operation")
		
		// Simulate slow operation
		time.Sleep(150 * time.Millisecond)
		
		logger.Info("slow_operation_completed")
		return c.JSON(fiber.Map{"message": "Slow operation completed"})
	})
	
	// Start server
	port := "8080"
	logging.LogStartupInfo(port)
	
	fmt.Printf("\n🚀 Test server running on http://localhost:%s\n", port)
	fmt.Println("📋 Test endpoints:")
	fmt.Println("   GET /           - Basic logging test")
	fmt.Println("   GET /test/123   - Context fields test")
	fmt.Println("   GET /test/error - Error logging test")
	fmt.Println("   GET /slow       - Slow request test")
	fmt.Println("\n💡 Check the console output to see structured logging in action!")
	fmt.Println("   Press Ctrl+C to stop the server\n")
	
	// Make a test request to demonstrate logging
	go func() {
		time.Sleep(1 * time.Second)
		fmt.Println("🔍 Making test request to demonstrate logging...")
		
		resp, err := http.Get("http://localhost:" + port + "/")
		if err == nil {
			resp.Body.Close()
			fmt.Println("✅ Test request completed - check the logs above!")
		}
	}()
	
	app.Listen(":" + port)
}