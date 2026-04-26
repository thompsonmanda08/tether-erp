package middleware

import (
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/tether-erp/config"
	"github.com/tether-erp/services"
)

// RateLimiter implements a simple in-memory rate limiter using token bucket algorithm
type RateLimiter struct {
	mu       sync.RWMutex
	requests map[string]*rateLimitEntry
	rate     int           // requests per window
	window   time.Duration // time window
}

type rateLimitEntry struct {
	count     int
	expiresAt time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string]*rateLimitEntry),
		rate:     rate,
		window:   window,
	}
	// Start cleanup goroutine
	go rl.cleanup()
	return rl
}

// Allow checks if a request from the given key is allowed
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	entry, exists := rl.requests[key]

	if !exists || now.After(entry.expiresAt) {
		// New window
		rl.requests[key] = &rateLimitEntry{
			count:     1,
			expiresAt: now.Add(rl.window),
		}
		return true
	}

	if entry.count >= rl.rate {
		return false
	}

	entry.count++
	return true
}

// cleanup removes expired entries periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(rl.window)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, entry := range rl.requests {
			if now.After(entry.expiresAt) {
				delete(rl.requests, key)
			}
		}
		rl.mu.Unlock()
	}
}

// Global rate limiters for different endpoints
var (
	// Auth endpoints: 10 requests per minute per IP
	authRateLimiter = NewRateLimiter(10, time.Minute)
	// Password reset: 3 requests per minute per IP (stricter)
	passwordResetRateLimiter = NewRateLimiter(3, time.Minute)
)

// RateLimitMiddleware applies rate limiting to routes
func RateLimitMiddleware(limiter *RateLimiter) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Use IP address as the rate limit key
		key := c.IP()

		if !limiter.Allow(key) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"message": "Too many requests. Please try again later.",
			})
		}

		return c.Next()
	}
}

// AuthRateLimitMiddleware applies rate limiting specifically for auth endpoints
func AuthRateLimitMiddleware() fiber.Handler {
	return RateLimitMiddleware(authRateLimiter)
}

// PasswordResetRateLimitMiddleware applies stricter rate limiting for password reset
func PasswordResetRateLimitMiddleware() fiber.Handler {
	return RateLimitMiddleware(passwordResetRateLimiter)
}

// JWTClaims matches the structure from auth service
type JWTClaims struct {
	UserID         string  `json:"user_id"`
	Email          string  `json:"email"`
	Name           string  `json:"name"`
	Role           string  `json:"role"`
	OrganizationID *string `json:"organization_id,omitempty"`
	SessionID      string  `json:"session_id"`
	jwt.RegisteredClaims
}

// CORS middleware with proper multi-origin support
func CORSMiddleware() fiber.Handler {
	// Parse allowed origins once at startup
	frontendURL := os.Getenv("FRONTEND_URL")
	allowedOrigins := make(map[string]bool)
	for _, origin := range strings.Split(frontendURL, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			allowedOrigins[trimmed] = true
		}
	}

	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		// Check if the request origin is allowed
		if origin != "" && allowedOrigins[origin] {
			c.Set("Access-Control-Allow-Origin", origin)
			c.Set("Access-Control-Allow-Credentials", "true")
		}

		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Method() == "OPTIONS" {
			return c.SendStatus(200)
		}

		return c.Next()
	}
}

// EnhancedAuthMiddleware validates JWT token using the enhanced auth service
func EnhancedAuthMiddleware(authService *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Authorization header required",
			})
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid authorization header format",
			})
		}

		tokenString := parts[1]

		// Validate token using enhanced auth service
		claims, err := authService.ValidateAccessToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid or expired token",
				"error":   err.Error(),
			})
		}

		// Enhanced: Validate organization membership if org context exists
		if claims.OrganizationID != nil {
			var memberID string
			err := config.PgxDB.QueryRow(c.Context(), `
				SELECT id FROM organization_members
				WHERE organization_id = $1 AND user_id = $2 AND active = true
				LIMIT 1
			`, *claims.OrganizationID, claims.UserID).Scan(&memberID)
			if err != nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"success": false,
					"message": "User is no longer a member of this organization",
				})
			}
		}

		// Store user information in context
		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userName", claims.Name)
		c.Locals("userRole", claims.Role)
		c.Locals("organizationID", claims.OrganizationID)
		c.Locals("sessionID", claims.SessionID)

		return c.Next()
	}
}

// AuthMiddleware - Legacy middleware for backward compatibility with proper JWT parsing
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header required",
			})
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		tokenString := parts[1]
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			// JWT_SECRET should be set by main.go init()
			// This is a safety check - should never happen
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Server configuration error",
			})
		}

		// Parse and validate JWT token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Extract claims
		claims, ok := token.Claims.(*JWTClaims)
		if !ok || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token claims",
			})
		}

		// Validate session still exists in DB (enables immediate session revocation)
		if claims.SessionID != "" {
			var sessionCount int64
			dbErr := config.PgxDB.QueryRow(c.Context(),
				`SELECT COUNT(*) FROM sessions WHERE id = $1 AND expires_at > $2`,
				claims.SessionID, time.Now(),
			).Scan(&sessionCount)
			if dbErr != nil {
				// DB unreachable — fail open to avoid locking out users on transient errors
				log.Printf("[AuthMiddleware] session check DB error (fail-open): %v", dbErr)
			} else if sessionCount == 0 {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Session has been terminated",
				})
			}
		}

		// Set user context in fiber locals
		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)
		c.Locals("userName", claims.Name)
		c.Locals("userRole", claims.Role)
		c.Locals("sessionID", claims.SessionID)
		if claims.OrganizationID != nil {
			c.Locals("organizationID", *claims.OrganizationID)
		}

		return c.Next()
	}
}

// LoggerMiddleware logs request details
func LoggerMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Log request details
		duration := time.Since(start)
		method := c.Method()
		path := c.Path()
		status := c.Response().StatusCode()
		userID := c.Locals("userID")

		log.Printf("[%s] %s %d - %v - User: %v",
			method, path, status, duration, userID)

		return err
	}
}

// RoleBasedAccess checks if user has required role
func RoleBasedAccess(requiredRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals("userRole").(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "User role not found in context",
			})
		}

		// Check if user role is in required roles
		for _, role := range requiredRoles {
			if userRole == role {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": "Insufficient permissions",
		})
	}
}

// ErrorHandlingMiddleware handles panics and errors
func ErrorHandlingMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic recovered: %v", err)
				c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Internal server error",
				})
			}
		}()

		return c.Next()
	}
}

// EnhancedRBACMiddleware checks permissions using the enhanced RBAC service
func EnhancedRBACMiddleware(rbacService *services.RBACService, resource, action string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user info from context (set by EnhancedAuthMiddleware)
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "User ID not found in context",
			})
		}

		organizationID, ok := c.Locals("organizationID").(*string)
		if !ok || organizationID == nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"message": "Organization ID not found in context",
			})
		}

		// Check permission using enhanced RBAC service
		hasPermission, err := rbacService.HasPermission(c.Context(), userID, *organizationID, resource, action)
		if err != nil {
			log.Printf("Error checking permission: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Error checking permissions",
			})
		}

		if !hasPermission {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Insufficient permissions for this action",
			})
		}

		return c.Next()
	}
}

// RequirePermission checks if user has specific permission(s) using RBAC service
// Pass permissions as (resource, action) pairs
// Example: RequirePermission(rbacService, "requisition", "approve")
func RequirePermission(rbacService *services.RBACService, requiredPermissions ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user info from context (set by AuthMiddleware)
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User ID not found in context",
			})
		}

		// Get organization ID from context (set by TenantMiddleware)
		organizationID, ok := c.Locals("organizationID").(string)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Organization ID not found in context",
			})
		}

		// Check if we have pairs of (resource, action)
		if len(requiredPermissions)%2 != 0 {
			log.Printf("RequirePermission called with odd number of arguments")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Internal server error",
			})
		}

		// Check each required permission
		for i := 0; i < len(requiredPermissions); i += 2 {
			resource := requiredPermissions[i]
			action := requiredPermissions[i+1]

			hasPermission, err := rbacService.HasPermission(c.Context(), userID, organizationID, resource, action)
			if err != nil {
				log.Printf("Error checking permission %s.%s for user %s: %v", resource, action, userID, err)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Permission check failed",
				})
			}

			if !hasPermission {
				log.Printf("User %s denied access: missing permission %s.%s", userID, resource, action)
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "Insufficient permissions",
				})
			}
		}

		return c.Next()
	}
}

// RequireWorkflowPermission checks if user can perform workflow actions based on their role
// This is more flexible than RequirePermission as it allows custom roles to approve workflows
func RequireWorkflowPermission(action string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user info from context (set by AuthMiddleware)
		userID := c.Locals("userID")
		organizationID := c.Locals("organizationID")

		if userID == nil || organizationID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		userIDStr, ok := userID.(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid user ID",
			})
		}

		organizationIDStr, ok := organizationID.(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid organization ID",
			})
		}

		// For workflow actions, we allow any authenticated user to attempt the action
		// The actual permission check will be done in the workflow execution service
		// based on the specific workflow task's required role

		// However, we still want to ensure the user has basic access to the organization
		var memberID string
		err := config.PgxDB.QueryRow(c.Context(), `
			SELECT id FROM organization_members
			WHERE user_id = $1 AND organization_id = $2 AND active = true
			LIMIT 1
		`, userIDStr, organizationIDStr).Scan(&memberID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied - not a member of this organization",
			})
		}

		// Allow the request to proceed - specific role validation will happen in the service layer
		return c.Next()
	}
}

// RequirePermissionOr checks if user has ANY of the required permissions using RBAC service
// Pass permissions as (resource, action) pairs
// Example: RequirePermissionOr(rbacService, "requisition", "approve", "budget", "approve")
func RequirePermissionOr(rbacService *services.RBACService, requiredPermissions ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user info from context (set by AuthMiddleware)
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User ID not found in context",
			})
		}

		// Get organization ID from context (set by TenantMiddleware)
		organizationID, ok := c.Locals("organizationID").(string)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Organization ID not found in context",
			})
		}

		// Check if we have pairs of (resource, action)
		if len(requiredPermissions)%2 != 0 {
			log.Printf("RequirePermissionOr called with odd number of arguments")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Internal server error",
			})
		}

		// Check if user has any of the required permissions
		hasAnyPermission, err := rbacService.HasAnyPermission(c.Context(), userID, organizationID, requiredPermissions)
		if err != nil {
			log.Printf("Error checking permissions for user %s: %v", userID, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Permission check failed",
			})
		}

		if !hasAnyPermission {
			log.Printf("User %s denied access: missing any of the required permissions", userID)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}

		return c.Next()
	}
}
