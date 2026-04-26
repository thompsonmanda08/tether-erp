//go:build ignore

package main

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/logging"
)

func main() {
	// Set environment for demo
	os.Setenv("LOG_LEVEL", "debug")
	os.Setenv("LOG_FORMAT", "console")
	
	// Initialize logging system
	cfg := logging.SetupLogging()
	
	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Simple Logging Demo",
	})
	
	// Setup logging middleware
	logging.SetupFiberMiddleware(app, cfg)
	
	// Simple route
	app.Get("/", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Info("handling_root_request")
		
		return c.JSON(fiber.Map{
			"message": "Hello World",
			"request_id": logger.GetRequestID(),
		})
	})
	
	// Route with fields
	app.Get("/user/:id", func(c *fiber.Ctx) error {
		userID := c.Params("id")
		
		// Add context
		logging.AddFieldToRequest(c, "user_id", userID)
		
		logger := logging.FromContext(c)
		logger.Info("fetching_user")
		
		return c.JSON(fiber.Map{
			"user_id": userID,
			"name": "John Doe",
		})
	})
	
	// Error example
	app.Get("/error", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Error("simulated_error")
		
		return c.Status(500).JSON(fiber.Map{
			"error": "Something went wrong",
			"request_id": logger.GetRequestID(),
		})
	})
	
	// Start server
	port := "8080"
	logging.LogStartupInfo(port)
	app.Listen(":" + port)
}