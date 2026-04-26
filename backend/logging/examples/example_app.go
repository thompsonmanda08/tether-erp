//go:build ignore

package main

import (
	"errors"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/logging"
)

func main() {
	// Initialize logging system
	cfg := logging.SetupLogging()
	
	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Logging Example App",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			logger := logging.FromContext(c)
			logger.WithError(err).Error("unhandled_error")
			
			return c.Status(500).JSON(fiber.Map{
				"error": "Internal Server Error",
				"request_id": logger.GetRequestID(),
			})
		},
	})
	
	// Setup logging middleware
	logging.SetupFiberMiddleware(app, cfg)
	
	// Example routes demonstrating different logging scenarios
	setupRoutes(app)
	
	// Start server
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}
	
	logging.LogStartupInfo(port)
	app.Listen(":" + port)
}

func setupRoutes(app *fiber.App) {
	// Basic logging example
	app.Get("/", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Info("handling_root_request")
		
		return c.JSON(fiber.Map{
			"message": "Hello World",
			"request_id": logger.GetRequestID(),
		})
	})
	
	// Logging with fields
	app.Get("/user/:id", func(c *fiber.Ctx) error {
		userID := c.Params("id")
		
		// Add user context to all logs in this request
		logging.AddFieldToRequest(c, "user_id", userID)
		
		logger := logging.FromContext(c)
		logger.Info("fetching_user")
		
		// Simulate user lookup
		if userID == "404" {
			logger.Warn("user_not_found")
			return c.Status(404).JSON(fiber.Map{
				"error": "User not found",
				"user_id": userID,
			})
		}
		
		// Simulate successful response
		logger.WithField("user_name", "John Doe").Info("user_fetched_successfully")
		
		return c.JSON(fiber.Map{
			"user_id": userID,
			"name": "John Doe",
			"email": "john@example.com",
		})
	})
	
	// Error logging example
	app.Get("/error", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		
		// Simulate an error
		err := errors.New("database connection failed")
		
		// Log error with context
		logging.LogError(c, err, "database_error", map[string]interface{}{
			"operation": "fetch_data",
			"table": "users",
		})
		
		return c.Status(500).JSON(fiber.Map{
			"error": "Internal Server Error",
			"request_id": logger.GetRequestID(),
		})
	})
	
	// Panic recovery example
	app.Get("/panic", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Info("about_to_panic")
		
		panic("something went wrong!")
	})
	
	// Slow request example
	app.Get("/slow", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Info("processing_slow_request")
		
		// Simulate slow operation
		time.Sleep(200 * time.Millisecond)
		
		logger.Info("slow_request_completed")
		return c.JSON(fiber.Map{"message": "Slow operation completed"})
	})
	
	// Multiple fields example
	app.Post("/order", func(c *fiber.Ctx) error {
		// Parse request body (simplified)
		var order struct {
			ProductID string  `json:"product_id"`
			Quantity  int     `json:"quantity"`
			Price     float64 `json:"price"`
		}
		
		if err := c.BodyParser(&order); err != nil {
			logging.LogError(c, err, "invalid_request_body")
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		
		// Add order context to all logs
		logging.AddFieldsToRequest(c, map[string]interface{}{
			"product_id": order.ProductID,
			"quantity": order.Quantity,
			"price": order.Price,
			"total": float64(order.Quantity) * order.Price,
		})
		
		logger := logging.FromContext(c)
		logger.Info("processing_order")
		
		// Simulate order processing
		if order.ProductID == "invalid" {
			logger.Warn("invalid_product_id")
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid product ID",
				"product_id": order.ProductID,
			})
		}
		
		// Success
		orderID := "order-123"
		logger.WithField("order_id", orderID).Info("order_created_successfully")
		
		return c.Status(201).JSON(fiber.Map{
			"order_id": orderID,
			"status": "created",
			"total": float64(order.Quantity) * order.Price,
		})
	})
	
	// Health check with logging
	app.Get("/health", func(c *fiber.Ctx) error {
		checks := map[string]interface{}{
			"database": "ok",
			"redis": "ok",
			"external_api": "ok",
		}
		
		logging.LogHealthCheck(c, "healthy", checks)
		
		return c.JSON(fiber.Map{
			"status": "healthy",
			"checks": checks,
			"timestamp": time.Now().UTC(),
		})
	})
	
	// Debug logging example
	app.Get("/debug", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		
		// Debug logs (only visible when LOG_LEVEL=debug)
		logger.Debug("debug_information")
		logging.LogDebug(c, "processing_debug_request", map[string]interface{}{
			"debug_flag": true,
			"trace_id": "trace-123",
		})
		
		logger.Info("debug_endpoint_accessed")
		
		return c.JSON(fiber.Map{
			"message": "Debug information logged",
			"debug_enabled": true, // Simplified for example
		})
	})
	
	// Authentication simulation with context
	app.Post("/login", func(c *fiber.Ctx) error {
		var loginReq struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		
		if err := c.BodyParser(&loginReq); err != nil {
			logging.LogError(c, err, "invalid_login_request")
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		
		// Add authentication context
		logging.AddFieldsToRequest(c, map[string]interface{}{
			"username": loginReq.Username,
			"auth_attempt": true,
		})
		
		logger := logging.FromContext(c)
		logger.Info("authentication_attempt")
		
		// Simulate authentication
		if loginReq.Username == "admin" && loginReq.Password == "password" {
			// Success
			userID := "user-123"
			logging.AddFieldsToRequest(c, map[string]interface{}{
				"user_id": userID,
				"auth_success": true,
			})
			
			logger.Info("authentication_successful")
			
			return c.JSON(fiber.Map{
				"message": "Login successful",
				"user_id": userID,
				"token": "jwt-token-here",
			})
		} else {
			// Failure
			logging.AddFieldToRequest(c, "auth_success", false)
			logger.Warn("authentication_failed")
			
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid credentials",
			})
		}
	})
	
	// Middleware example showing request context
	app.Use("/api", func(c *fiber.Ctx) error {
		// Add API context to all /api requests
		logging.AddFieldsToRequest(c, map[string]interface{}{
			"api_version": "v1",
			"client_type": "web",
		})
		
		return c.Next()
	})
	
	app.Get("/api/data", func(c *fiber.Ctx) error {
		logger := logging.FromContext(c)
		logger.Info("api_data_requested") // Will include api_version and client_type
		
		return c.JSON(fiber.Map{
			"data": []string{"item1", "item2", "item3"},
			"count": 3,
		})
	})
}