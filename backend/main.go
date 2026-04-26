package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"github.com/tether-erp/config"
	"github.com/tether-erp/handlers"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/repository"
	"github.com/tether-erp/routes"
	"github.com/tether-erp/services"
)

func init() {
	// Load environment variables
	err := godotenv.Load(".env")
	if err != nil && os.Getenv("APP_ENV") == "" {
		// Use basic logging before structured logging is initialized
		println("Note: .env file not found, using environment variables")
	}

	// Set default values if not provided
	if os.Getenv("DB_PORT") == "" {
		os.Setenv("DB_PORT", "5432")
	}
	if os.Getenv("DB_HOST") == "" {
		os.Setenv("DB_HOST", "localhost")
	}
	if os.Getenv("DB_USER") == "" {
		os.Setenv("DB_USER", "postgres")
	}
	if os.Getenv("APP_PORT") == "" {
		os.Setenv("APP_PORT", "8080")
	}
	if os.Getenv("FRONTEND_URL") == "" {
		os.Setenv("FRONTEND_URL", "http://localhost:3000")
	}

	// Environment-specific configuration
	appEnv := os.Getenv("APP_ENV")
	isProduction := appEnv == "production" || appEnv == "prod"

	// JWT_SECRET is required — fail fast if not set in production
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		if isProduction {
			log.Fatal("FATAL: JWT_SECRET environment variable is required in production. Set it before starting the server.")
		} else {
			// Development default — never used in production
			os.Setenv("JWT_SECRET", "dev-only-secret-do-not-use-in-production")
		}
	}

	// SSL mode defaults: require in production, disable in development
	if os.Getenv("DB_SSL_MODE") == "" {
		if isProduction {
			os.Setenv("DB_SSL_MODE", "require")
		} else {
			os.Setenv("DB_SSL_MODE", "disable")
		}
	}
}

func main() {
	// Initialize structured logging system
	loggingConfig := logging.SetupLogging()
	logger := &logging.Logger{}

	// Initialize database (pgx + sqlc)
	config.InitDatabase()
	defer config.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(config.PgxDB)
	sessionRepo := repository.NewSessionRepository(config.PgxDB)
	passwordResetRepo := repository.NewPasswordResetRepository(config.PgxDB)
	loginAttemptRepo := repository.NewLoginAttemptRepository(config.PgxDB)
	lockoutRepo := repository.NewAccountLockoutRepository(config.PgxDB)
	roleRepo := repository.NewOrganizationRoleRepository(config.PgxDB)
	workflowRepo := repository.NewWorkflowRepository(config.PgxDB)
	documentRepo := repository.NewDocumentRepository(config.PgxDB)
	reportsRepo := repository.NewReportsRepository(config.PgxDB)

	// Initialize audit service
	auditService := &services.AuditService{}

	// Initialize enhanced services
	authService := services.NewAuthService(
		userRepo,
		sessionRepo,
		passwordResetRepo,
		loginAttemptRepo,
		lockoutRepo,
		auditService,
		os.Getenv("JWT_SECRET"),
	)

	rbacService := services.NewRBACService(roleRepo, auditService)

	// Bootstrap global system roles (super_admin, admin, approver, requester, finance, viewer)
	roleManagementService := services.NewRoleManagementService()
	if err := roleManagementService.EnsureGlobalSystemRoles(); err != nil {
		logging.WithError(err).Error("failed_to_ensure_global_system_roles")
	}

	workflowService := services.NewWorkflowService(workflowRepo, auditService)

	// Initialize notification service (placeholder for now)
	notificationService := &services.NotificationService{}

	// Initialize automation service
	automationService := services.NewDocumentAutomationService(auditService, notificationService)
	documentGenerationService := services.NewDocumentGenerationService(automationService)

	// Initialize workflow execution service with automation
	workflowExecutionService := services.NewWorkflowExecutionService(workflowService, auditService, automationService)

	// Start background worker to auto-expire stale task claims
	claimExpiryCtx, cancelClaimExpiry := context.WithCancel(context.Background())
	defer cancelClaimExpiry()
	go workflowExecutionService.StartClaimExpiryWorker(claimExpiryCtx)

	// Initialize activity logging service
	activityRepo := repository.NewActivityRepository(config.PgxDB)
	activityService := services.NewActivityService(activityRepo)

	// Start retention cleanup worker (runs daily, cleans up old activity logs)
	retentionCtx, cancelRetention := context.WithCancel(context.Background())
	defer cancelRetention()
	go activityService.StartRetentionCleanupWorker(retentionCtx)

	// Initialize session service (enriches session data with device/browser info)
	sessionService := services.NewSessionService(sessionRepo)

	documentService := services.NewDocumentService(documentRepo, auditService)

	// Initialize reports service
	reportsService := services.NewReportsService(reportsRepo)

	// Initialize handler registry
	handlerRegistry := handlers.NewHandlerRegistry(
		authService,
		rbacService,
		workflowService,
		workflowExecutionService,
		documentService,
		documentGenerationService,
		reportsService,
		logger,
	)

	// Wire activity and session services into AuthHandler
	handlerRegistry.Auth.SetActivityService(activityService)
	handlerRegistry.Auth.SetSessionService(sessionService)

	// Create Fiber app with global error handler
	app := fiber.New(fiber.Config{
		AppName:      "Tether-ERP Backend API",
		ErrorHandler: customErrorHandler,
	})

	// Setup structured logging middleware (replaces old LoggerMiddleware)
	logging.SetupFiberMiddleware(app, loggingConfig)

	// Other middleware
	app.Use(middleware.ErrorHandlingMiddleware())
	app.Use(middleware.CORSMiddleware())

	// Setup routes with handler registry
	routes.SetupRoutes(app, handlerRegistry, rbacService, activityService)

	// Start server with graceful shutdown
	go func() {
		port := os.Getenv("APP_PORT")

		// Log startup information using structured logging
		logging.LogStartupInfo(port)

		if err := app.Listen(":" + port); err != nil {
			logging.WithError(err).Fatal("failed_to_start_server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	// Log shutdown information
	logging.LogShutdownInfo()

	if err := app.ShutdownWithContext(context.Background()); err != nil {
		logging.WithError(err).Fatal("⚠️server_forced_shutdown")
	}

	logging.Info("✅server_stopped_gracefully!!")
}

// customErrorHandler handles errors globally with structured logging
func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error!"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	// Log error with structured logging
	logger := logging.FromContext(c)
	logger.WithError(err).WithFields(map[string]interface{}{
		"status_code":   code,
		"error_message": message,
		"method":        c.Method(),
		"path":          c.Path(),
	}).Error("global_error_handler!!")

	return c.Status(code).JSON(fiber.Map{
		"error":      message,
		"request_id": logger.GetRequestID(),
	})
}
