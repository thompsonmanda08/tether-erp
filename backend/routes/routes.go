package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/handlers"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/services"
)

// SetupRoutes configures all API routes
func SetupRoutes(app *fiber.App, handlerRegistry *handlers.HandlerRegistry, rbacService *services.RBACService, activityService ...*services.ActivityService) {
	// Health check (no versioning)
	app.Get("/health", handlers.HealthCheck)

	// API v1 - Version 1 routes (with API metrics collection)
	apiV1 := app.Group("/api/v1", middleware.APIMetricsMiddleware())

	// Public routes (no authentication required)
	public := apiV1.Group("")

	// Auth routes with rate limiting
	public.Post("/auth/login", middleware.AuthRateLimitMiddleware(), handlerRegistry.Auth.Login)
	// Dedicated admin console auth endpoints — super_admin only
	public.Post("/admin/auth/login", middleware.AuthRateLimitMiddleware(), handlerRegistry.Auth.AdminLogin)
	public.Post("/admin/auth/logout", handlerRegistry.Auth.AdminLogout)
	public.Post("/admin/auth/refresh", middleware.AuthRateLimitMiddleware(), handlerRegistry.Auth.AdminRefreshToken)
	public.Post("/auth/register", middleware.AuthRateLimitMiddleware(), handlerRegistry.Auth.Register)
	public.Post("/auth/verify", handlerRegistry.Auth.VerifyToken)
	public.Post("/auth/refresh", middleware.AuthRateLimitMiddleware(), handlerRegistry.Auth.RefreshToken)

	// Password reset with stricter rate limiting
	public.Post("/auth/password-reset/request", middleware.PasswordResetRateLimitMiddleware(), handlerRegistry.Auth.RequestPasswordReset)
	public.Post("/auth/password-reset/confirm", middleware.PasswordResetRateLimitMiddleware(), handlerRegistry.Auth.ResetPassword)

	// Public document verification (no authentication required)
	public.Get("/public/verify/:documentNumber", handlerRegistry.Document.VerifyDocumentPublic)
	public.Get("/public/verify/:documentNumber/document", handlerRegistry.Document.GetDocumentForPDFPublic)

	// Public reference data — no auth required
	public.Get("/provinces", handlers.GetProvinces)
	public.Get("/towns", handlers.GetTowns)

	// Activity logging middleware (async, non-blocking — attaches after auth)
	var activityMiddleware fiber.Handler
	if len(activityService) > 0 && activityService[0] != nil {
		activityMiddleware = middleware.NewActivityLoggerMiddleware(activityService[0]).LogActivity()
	}

	// Protected routes (authentication required)
	protected := apiV1.Group("", middleware.AuthMiddleware())
	if activityMiddleware != nil {
		protected.Use(activityMiddleware)
	}

	// Auth routes (protected, no tenant required)
	protected.Get("/auth/profile", handlerRegistry.Auth.GetProfile)
	protected.Put("/auth/profile", handlerRegistry.Auth.UpdateProfile)
	protected.Post("/auth/logout", handlerRegistry.Auth.Logout)
	protected.Post("/auth/logout-all", handlerRegistry.Auth.LogoutAll)
	protected.Post("/auth/change-password", handlerRegistry.Auth.ChangePassword)

	// User activity and session management (self-service)
	protected.Get("/auth/activity", handlerRegistry.Auth.GetUserActivity)
	protected.Get("/auth/sessions", handlerRegistry.Auth.GetUserSessions)
	protected.Delete("/auth/sessions/:id", handlerRegistry.Auth.TerminateSession)

	// Organization routes (authentication required, no tenant middleware)
	orgs := protected.Group("/organizations")
	orgs.Get("/", handlers.GetUserOrganizations)
	orgs.Get("/:id", handlers.GetOrganizationByID)
	orgs.Post("/", handlers.CreateOrganization)
	orgs.Put("/:id", handlers.UpdateOrganization)
	orgs.Delete("/:id", handlers.DeleteOrganization)
	orgs.Post("/:id/switch", handlers.SwitchOrganization)

	// Tenant-scoped routes (authentication + tenant context required)
	tenant := apiV1.Group("", middleware.AuthMiddleware(), middleware.TenantMiddleware())

	// Current user's own permissions — no permission gate, just auth + tenant
	tenant.Get("/me/permissions", func(c *fiber.Ctx) error {
		return handlers.GetMyPermissions(c, rbacService)
	})

	// Organization management (within tenant context)
	orgMgmt := tenant.Group("/organization")
	orgMgmt.Get("/members",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetOrganizationMembers)
	orgMgmt.Post("/members",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		middleware.CheckLimit("team_member"),
		handlers.AddOrganizationMember)
	orgMgmt.Delete("/members/:userId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.RemoveOrganizationMember)

	// Admin user creation endpoint (creates users directly in organization without personal org)
	orgMgmt.Post("/users",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		middleware.CheckLimit("team_member"),
		handlers.CreateOrganizationUser)
	orgMgmt.Get("/users",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetOrganizationUsers)
	orgMgmt.Put("/users/:id",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.UpdateOrganizationUser)
	orgMgmt.Get("/users/:id",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgGetUserById)
	orgMgmt.Put("/users/:id/status",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgUpdateUserStatus)
	orgMgmt.Post("/users/:id/reset-password",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgResetUserPassword)
	orgMgmt.Get("/users/:id/activity",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgGetUserActivity)
	orgMgmt.Get("/users/:id/activity/export",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgExportUserActivity)
	orgMgmt.Get("/users/:id/security-events",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgGetUserSecurityEvents)
	orgMgmt.Get("/users/:id/login-history",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgGetUserLoginHistory)
	orgMgmt.Get("/users/:id/work-stats",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgGetUserWorkStats)
	orgMgmt.Get("/users/:id/sessions",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgGetUserSessions)
	orgMgmt.Delete("/users/:id/sessions/:sessionId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgTerminateUserSession)
	orgMgmt.Delete("/users/:id/sessions",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgTerminateAllUserSessions)
	orgMgmt.Post("/users/:id/impersonate",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.OrgImpersonateUser)

	orgMgmt.Get("/usage", handlers.GetOrganizationUsage)

	orgMgmt.Get("/settings",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetOrganizationSettings)
	orgMgmt.Put("/settings",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.UpdateOrganizationSettings)

	// Organization departments (Phase 3.5) - NEW
	orgDepts := tenant.Group("/organization/departments")
	orgDepts.Get("/",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetOrganizationDepartments)
	orgDepts.Get("/:id",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetOrganizationDepartment)
	orgDepts.Post("/",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		middleware.CheckLimit("department"),
		handlers.CreateOrganizationDepartment)
	orgDepts.Put("/:id",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.UpdateOrganizationDepartment)
	orgDepts.Delete("/:id",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.DeleteOrganizationDepartment)
	orgDepts.Post("/:id/restore",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.RestoreOrganizationDepartment)
	orgDepts.Get("/:id/modules",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetDepartmentModules)
	orgDepts.Post("/:id/modules",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.AssignModuleToDepartment)
	orgDepts.Delete("/:departmentId/modules/:moduleId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.RemoveModuleFromDepartment)
	orgDepts.Get("/:departmentId/users",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetDepartmentUsers)

	// User directory endpoints (tenant-scoped)
	userDir := tenant.Group("/users")
	userDir.Get("/department-heads/list", middleware.RequirePermission(rbacService, "organization", "view"), handlers.GetDepartmentHeadsList)

	// User-Department Management (Phase 3.5) - NEW
	userDepts := tenant.Group("/users")
	userDepts.Post("/:userId/department/:departmentId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.AssignUserToDepartment)
	userDepts.Get("/:userId/department",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.GetUserDepartment)
	userDepts.Delete("/:userId/department",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.RemoveUserFromDepartment)

	// Organization role management (Phase 3.5) - ENABLED
	orgRoles := tenant.Group("/organization/roles")
	orgRoles.Get("/",
		handlers.GetOrganizationRoles)
	orgRoles.Post("/",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		middleware.RequireFeature("custom_roles"),
		middleware.CheckLimit("custom_role"),
		handlers.CreateOrganizationRole)
	orgRoles.Put("/:roleId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.UpdateOrganizationRole)
	orgRoles.Delete("/:roleId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.DeleteOrganizationRole)
	orgRoles.Post("/initialize-defaults",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.InitializeDefaultRoles)
	orgRoles.Get("/:roleId/permissions",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.GetRolePermissions)
	orgRoles.Post("/:roleId/permissions/:permissionId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.AssignPermissionToRole)
	orgRoles.Delete("/:roleId/permissions/:permissionId",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.RemovePermissionFromRole)

	// Organization permissions (Phase 3.5) - ENABLED
	permissions := tenant.Group("/organization/permissions")
	permissions.Get("/",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.GetOrganizationPermissions)

	// User permission management (admin only) - ENABLED
	userPerms := tenant.Group("/users")
	userPerms.Get("/:userId/permissions",
		middleware.RequirePermission(rbacService, "user", "view"),
		handlers.GetUserPermissions)
	userPerms.Post("/:userId/permissions/:resource/:action",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.GrantUserPermission)
	userPerms.Delete("/:userId/permissions/:resource/:action",
		middleware.RequirePermission(rbacService, "organization", "manage"),
		handlers.RevokeUserPermission)

	// System permissions list (admin only) - ENABLED
	systemPerms := tenant.Group("/permissions")
	systemPerms.Get("/",
		middleware.RequirePermission(rbacService, "organization", "view"),
		handlers.ListAllPermissions)

	// Document chain route (generic endpoint for all workflow documents)
	tenant.Get("/document-chain/:id", handlers.GetDocumentChain)

	// Requisition routes (tenant-scoped)
	requisitions := tenant.Group("/requisitions", middleware.InjectWorkflowExecutionService(handlerRegistry.WorkflowExecutionService))
	requisitions.Get("/", middleware.RequirePermission(rbacService, "requisition", "view"), handlers.GetRequisitions)
	requisitions.Get("/stats", middleware.RequirePermission(rbacService, "requisition", "view"), handlers.GetRequisitionStats)
	requisitions.Post("/", middleware.RequirePermission(rbacService, "requisition", "create"), middleware.CheckLimit("requisition"), handlers.CreateRequisition)
	requisitions.Get("/:id", middleware.RequirePermission(rbacService, "requisition", "view"), handlers.GetRequisition)
	requisitions.Put("/:id", middleware.RequirePermission(rbacService, "requisition", "edit"), handlers.UpdateRequisition)
	requisitions.Delete("/:id", middleware.RequirePermission(rbacService, "requisition", "delete"), handlers.DeleteRequisition)
	requisitions.Post("/:id/submit", middleware.RequirePermission(rbacService, "requisition", "edit"), handlers.SubmitRequisition)
	requisitions.Post("/:id/withdraw", middleware.RequirePermission(rbacService, "requisition", "edit"), handlers.WithdrawRequisition)
	requisitions.Post("/:id/reassign", middleware.RequirePermission(rbacService, "requisition", "approve"), handlers.ReassignRequisition)
	requisitions.Get("/:id/chain", middleware.RequirePermission(rbacService, "requisition", "view"), handlers.GetRequisitionChain)
	requisitions.Get("/:id/audit-trail", middleware.RequirePermission(rbacService, "requisition", "view"), handlers.GetRequisitionAuditTrail)

	// Budget routes (tenant-scoped)
	budgets := tenant.Group("/budgets", middleware.InjectWorkflowExecutionService(handlerRegistry.WorkflowExecutionService))
	budgets.Get("/", middleware.RequirePermission(rbacService, "budget", "view"), handlers.GetBudgets)
	budgets.Post("/", middleware.RequirePermission(rbacService, "budget", "create"), middleware.CheckLimit("budget"), handlers.CreateBudget)
	budgets.Get("/:id", middleware.RequirePermission(rbacService, "budget", "view"), handlers.GetBudget)
	budgets.Put("/:id", middleware.RequirePermission(rbacService, "budget", "edit"), handlers.UpdateBudget)
	budgets.Delete("/:id", middleware.RequirePermission(rbacService, "budget", "delete"), handlers.DeleteBudget)
	budgets.Post("/:id/submit", middleware.RequirePermission(rbacService, "budget", "edit"), handlers.SubmitBudget)

	// Purchase Order routes (tenant-scoped)
	pos := tenant.Group("/purchase-orders", middleware.InjectWorkflowExecutionService(handlerRegistry.WorkflowExecutionService))
	pos.Get("/", middleware.RequirePermission(rbacService, "purchase_order", "view"), handlers.GetPurchaseOrders)
	pos.Get("/stats", middleware.RequirePermission(rbacService, "purchase_order", "view"), handlers.GetPurchaseOrderStats)
	pos.Post("/from-requisition", middleware.RequirePermission(rbacService, "purchase_order", "create"), middleware.CheckLimit("purchase_order"), handlers.CreatePurchaseOrderFromRequisition)
	pos.Post("/", middleware.RequirePermission(rbacService, "purchase_order", "create"), middleware.CheckLimit("purchase_order"), handlers.CreatePurchaseOrder)
	pos.Get("/:id", middleware.RequirePermission(rbacService, "purchase_order", "view"), handlers.GetPurchaseOrder)
	pos.Put("/:id", middleware.RequirePermission(rbacService, "purchase_order", "edit"), handlers.UpdatePurchaseOrder)
	pos.Delete("/:id", middleware.RequirePermission(rbacService, "purchase_order", "delete"), handlers.DeletePurchaseOrder)
	pos.Post("/:id/submit", middleware.RequirePermission(rbacService, "purchase_order", "edit"), handlers.SubmitPurchaseOrder)

	// Payment Voucher routes (tenant-scoped)
	pvs := tenant.Group("/payment-vouchers", middleware.InjectWorkflowExecutionService(handlerRegistry.WorkflowExecutionService))
	pvs.Get("/", middleware.RequirePermission(rbacService, "payment_voucher", "view"), handlers.GetPaymentVouchers)
	pvs.Get("/stats", middleware.RequirePermission(rbacService, "payment_voucher", "view"), handlers.GetPaymentVoucherStats)
	pvs.Post("/from-po", middleware.RequirePermission(rbacService, "payment_voucher", "create"), middleware.CheckLimit("payment_voucher"), handlers.CreatePaymentVoucherFromPO)
	pvs.Post("/", middleware.RequirePermission(rbacService, "payment_voucher", "create"), middleware.CheckLimit("payment_voucher"), handlers.CreatePaymentVoucher)
	pvs.Get("/:id", middleware.RequirePermission(rbacService, "payment_voucher", "view"), handlers.GetPaymentVoucher)
	pvs.Put("/:id", middleware.RequirePermission(rbacService, "payment_voucher", "edit"), handlers.UpdatePaymentVoucher)
	pvs.Delete("/:id", middleware.RequirePermission(rbacService, "payment_voucher", "delete"), handlers.DeletePaymentVoucher)
	pvs.Post("/:id/submit", middleware.RequirePermission(rbacService, "payment_voucher", "edit"), handlers.SubmitPaymentVoucher)
	pvs.Post("/:id/withdraw", middleware.RequirePermission(rbacService, "payment_voucher", "edit"), handlers.WithdrawPaymentVoucher)
	pvs.Post("/:id/mark-paid", middleware.RequirePermission(rbacService, "payment_voucher", "edit"), handlers.MarkPaymentVoucherPaid)

	// GRN routes (tenant-scoped)
	grns := tenant.Group("/grns", middleware.InjectWorkflowExecutionService(handlerRegistry.WorkflowExecutionService))
	grns.Get("/", middleware.RequirePermission(rbacService, "grn", "view"), handlers.GetGRNs)
	grns.Post("/", middleware.RequirePermission(rbacService, "grn", "create"), middleware.CheckLimit("grn"), handlers.CreateGRN)
	grns.Get("/:id", middleware.RequirePermission(rbacService, "grn", "view"), handlers.GetGRN)
	grns.Put("/:id", middleware.RequirePermission(rbacService, "grn", "edit"), handlers.UpdateGRN)
	grns.Delete("/:id", middleware.RequirePermission(rbacService, "grn", "delete"), handlers.DeleteGRN)
	grns.Post("/:id/submit", middleware.RequirePermission(rbacService, "grn", "edit"), handlers.SubmitGRN)
	grns.Post("/:id/confirm", middleware.RequirePermission(rbacService, "grn", "edit"), handlers.ConfirmGRN)

	// Branch routes (tenant-scoped)
	branches := tenant.Group("/branches")
	branches.Get("/", middleware.RequirePermission(rbacService, "organization", "view"), handlers.GetBranches)
	branches.Post("/", middleware.RequirePermission(rbacService, "organization", "manage"), handlers.CreateBranch)
	branches.Get("/:id", middleware.RequirePermission(rbacService, "organization", "view"), handlers.GetBranch)
	branches.Put("/:id", middleware.RequirePermission(rbacService, "organization", "manage"), handlers.UpdateBranch)
	branches.Delete("/:id", middleware.RequirePermission(rbacService, "organization", "manage"), handlers.DeleteBranch)

	// Category routes (tenant-scoped)
	categories := tenant.Group("/categories")
	categories.Get("/", middleware.RequirePermission(rbacService, "category", "view"), handlers.GetCategories)
	categories.Post("/", middleware.RequirePermission(rbacService, "category", "create"), handlers.CreateCategory)
	categories.Get("/:id", middleware.RequirePermission(rbacService, "category", "view"), handlers.GetCategory)
	categories.Put("/:id", middleware.RequirePermission(rbacService, "category", "edit"), handlers.UpdateCategory)
	categories.Delete("/:id", middleware.RequirePermission(rbacService, "category", "delete"), handlers.DeleteCategory)
	categories.Get("/:id/budget-codes", middleware.RequirePermission(rbacService, "category", "view"), handlers.GetCategoryBudgetCodes)
	categories.Post("/:id/budget-codes", middleware.RequirePermission(rbacService, "category", "edit"), handlers.AddBudgetCodeToCategory)
	categories.Delete("/:id/budget-codes/:budgetCode", middleware.RequirePermission(rbacService, "category", "edit"), handlers.RemoveBudgetCodeFromCategory)

	// Vendor routes (tenant-scoped)
	vendors := tenant.Group("/vendors")
	vendors.Get("/", middleware.RequirePermission(rbacService, "vendor", "view"), handlers.GetVendors)
	vendors.Post("/", middleware.RequirePermission(rbacService, "vendor", "create"), middleware.CheckLimit("vendor"), handlers.CreateVendor)
	vendors.Get("/:id", middleware.RequirePermission(rbacService, "vendor", "view"), handlers.GetVendor)
	vendors.Put("/:id", middleware.RequirePermission(rbacService, "vendor", "edit"), handlers.UpdateVendor)

	// Approval Tasks routes (tenant-scoped) - Updated to use new handler
	approvals := tenant.Group("/approvals", middleware.InjectWorkflowExecutionService(handlerRegistry.WorkflowExecutionService))
	approvals.Get("/", handlerRegistry.Approval.GetApprovalTasks)

	// Specific routes must come before parameterized routes
	approvals.Get("/stats", handlerRegistry.Approval.GetTaskStats)
	approvals.Get("/my-pending-count", handlerRegistry.Approval.GetMyPendingCount)
	approvals.Get("/available-approvers", handlerRegistry.Approval.GetAvailableApprovers)
	approvals.Get("/tasks/overdue", middleware.RequirePermission(rbacService, "approval", "view"), handlerRegistry.Approval.GetOverdueTasks)
	approvals.Post("/validate-signature", handlers.ValidateSignature)
	approvals.Get("/approver-workload/:approverId", handlers.GetApproverWorkload)

	// Task claiming routes (NEW)
	approvals.Post("/tasks/:id/claim", middleware.RequireWorkflowPermission("approve"), handlerRegistry.Approval.ClaimTask)
	approvals.Post("/tasks/:id/unclaim", middleware.RequireWorkflowPermission("approve"), handlerRegistry.Approval.UnclaimTask)

	// Parameterized routes come after specific routes
	approvals.Get("/:id", handlerRegistry.Approval.GetApprovalTask)
	approvals.Post("/:id/approve", middleware.RequireWorkflowPermission("approve"), handlerRegistry.Approval.ApproveTask)
	approvals.Post("/:id/reject", middleware.RequireWorkflowPermission("reject"), handlerRegistry.Approval.RejectTask)
	approvals.Post("/:id/reassign", middleware.RequirePermission(rbacService, "approval", "reassign"), handlerRegistry.Approval.ReassignTask)

	// Bulk approval operations (tenant-scoped) - ENABLED
	bulk := approvals.Group("/bulk")
	bulk.Post("/approve", middleware.RequireFeature("bulk_operations"), middleware.RequireWorkflowPermission("approve"), handlerRegistry.Approval.BulkApprove)
	bulk.Post("/reject", middleware.RequireFeature("bulk_operations"), middleware.RequireWorkflowPermission("reject"), handlerRegistry.Approval.BulkReject)
	bulk.Post("/reassign", middleware.RequireFeature("bulk_operations"), middleware.RequirePermission(rbacService, "approval", "reassign"), handlerRegistry.Approval.BulkReassign)

	// Approval history routes (tenant-scoped) - Updated to use new handler
	documents := tenant.Group("/documents", middleware.InjectWorkflowExecutionService(handlerRegistry.WorkflowExecutionService))
	documents.Get("/:documentId/approval-history", handlerRegistry.Approval.GetApprovalHistory)
	documents.Get("/:documentId/approval-status", handlerRegistry.Approval.GetApprovalWorkflowStatus)

	// Generic Document System routes (tenant-scoped) - NEW
	genericDocs := tenant.Group("/documents")
	genericDocs.Get("/", handlerRegistry.Document.GetDocuments)
	genericDocs.Get("/my", handlerRegistry.Document.GetMyDocuments)
	genericDocs.Get("/search", handlerRegistry.Document.SearchDocuments)
	genericDocs.Get("/stats", handlerRegistry.Document.GetDocumentStats)
	genericDocs.Get("/:id", handlerRegistry.Document.GetDocumentByID)
	genericDocs.Get("/number/:number", handlerRegistry.Document.GetDocumentByNumber)
	genericDocs.Post("/", middleware.RequirePermission(rbacService, "document", "create"), handlerRegistry.Document.CreateDocument)
	genericDocs.Put("/:id", middleware.RequirePermission(rbacService, "document", "edit"), handlerRegistry.Document.UpdateDocument)
	genericDocs.Post("/generate", middleware.RequirePermission(rbacService, "document", "create"), middleware.RequireFeature("advanced_workflows"), handlerRegistry.Generation.GenerateDocument)
	genericDocs.Post("/:id/submit", middleware.RequirePermission(rbacService, "document", "submit"), handlerRegistry.Document.SubmitDocument)
	genericDocs.Delete("/:id", middleware.RequirePermission(rbacService, "document", "delete"), handlerRegistry.Document.DeleteDocument)

	// Workflow routes (tenant-scoped) - ENHANCED
	workflows := tenant.Group("/workflows")
	workflows.Get("/", middleware.RequirePermission(rbacService, "workflow", "view"), handlerRegistry.Workflow.GetWorkflows)
	workflows.Get("/:id", middleware.RequirePermission(rbacService, "workflow", "view"), handlerRegistry.Workflow.GetWorkflowByID)
	workflows.Get("/default/:documentType", middleware.RequirePermission(rbacService, "workflow", "view"), handlerRegistry.Workflow.GetDefaultWorkflow)
	workflows.Post("/", middleware.RequirePermission(rbacService, "workflow", "create"), middleware.CheckLimit("workflow"), handlerRegistry.Workflow.CreateWorkflow)
	workflows.Put("/:id", middleware.RequirePermission(rbacService, "workflow", "edit"), handlerRegistry.Workflow.UpdateWorkflow)
	workflows.Post("/:id/activate", middleware.RequirePermission(rbacService, "workflow", "manage"), handlerRegistry.Workflow.ActivateWorkflow)
	workflows.Post("/:id/deactivate", middleware.RequirePermission(rbacService, "workflow", "manage"), handlerRegistry.Workflow.DeactivateWorkflow)
	workflows.Delete("/:id", middleware.RequirePermission(rbacService, "workflow", "delete"), handlerRegistry.Workflow.DeleteWorkflow)

	// New frontend-compatible workflow endpoints
	workflows.Post("/:id/duplicate", middleware.RequirePermission(rbacService, "workflow", "create"), middleware.CheckLimit("workflow"), handlerRegistry.Workflow.DuplicateWorkflow)
	workflows.Post("/:id/set-default", middleware.RequirePermission(rbacService, "workflow", "manage"), handlerRegistry.Workflow.SetDefaultWorkflow)
	workflows.Post("/resolve", middleware.RequirePermission(rbacService, "workflow", "view"), handlerRegistry.Workflow.ResolveWorkflow)
	workflows.Get("/:id/usage", middleware.RequirePermission(rbacService, "workflow", "view"), handlerRegistry.Workflow.GetWorkflowUsage)
	workflows.Post("/validate", middleware.RequirePermission(rbacService, "workflow", "create"), handlerRegistry.Workflow.ValidateWorkflow)

	// Analytics routes (tenant-scoped) - ENABLED
	analytics := tenant.Group("/analytics")
	analytics.Get("/dashboard", handlers.GetDashboard) // Basic dashboard stats available to all tiers
	analytics.Get("/requisitions/metrics", middleware.RequireFeature("advanced_analytics"), handlers.GetRequisitionMetrics)
	analytics.Get("/approvals/metrics", middleware.RequireFeature("advanced_analytics"), handlers.GetApprovalMetrics)

	// Reports routes (tenant-scoped) - Unified reports for all users with role-based filtering
	reports := tenant.Group("/reports")
	reports.Get("/dashboard", handlerRegistry.Reports.GetDashboardReports)           // All users - role-filtered
	reports.Get("/system-stats", handlerRegistry.Reports.GetSystemStatistics)        // All users - role-filtered
	reports.Get("/approval-metrics", handlerRegistry.Reports.GetApprovalMetrics)     // All users - role-filtered
	reports.Get("/user-activity", middleware.RequirePermission(rbacService, "report", "view_users"), handlerRegistry.Reports.GetUserActivityMetrics) // Admin/Manager only
	reports.Get("/analytics", middleware.RequirePermission(rbacService, "report", "view_analytics"), handlerRegistry.Reports.GetAnalyticsDashboard)   // Admin/Manager only

	// Notifications (tenant-scoped) - ENABLED
	notifications := tenant.Group("/notifications")
	notifications.Get("/", handlerRegistry.Notification.GetNotifications)
	notifications.Get("/recent", handlerRegistry.Notification.GetRecentNotifications)
	notifications.Get("/stats", handlerRegistry.Notification.GetNotificationStats)
	notifications.Post("/mark-as-read", handlerRegistry.Notification.MarkAsRead)
	notifications.Post("/mark-all-as-read", handlerRegistry.Notification.MarkAllAsRead)
	notifications.Delete("/:id", handlerRegistry.Notification.DeleteNotification)
	
	// Notification Preferences (tenant-scoped)
	notifications.Get("/preferences", handlerRegistry.Notification.GetNotificationPreferences)
	notifications.Put("/preferences", handlerRegistry.Notification.UpdateNotificationPreferences)

	// Audit Logs (tenant-scoped) - ENABLED
	audit := tenant.Group("/audit-logs")
	audit.Get("/", middleware.RequirePermission(rbacService, "audit_log", "view"), middleware.RequireFeature("audit_logs_90_days"), handlers.GetAuditLogs)
	audit.Get("/document/:documentId", middleware.RequirePermission(rbacService, "audit_log", "view"), middleware.RequireFeature("audit_logs_90_days"), handlers.GetDocumentAuditLogs)

	// Audit Events — document activity log (entityType + entityId query params)
	tenant.Get("/audit-events", handlers.GetDocumentAuditEvents)

	// Admin-only routes (system-wide access)
	admin := apiV1.Group("/admin", middleware.AuthMiddleware(), middleware.SuperAdminMiddleware())

	// Admin dashboard and analytics
	admin.Get("/dashboard", handlers.GetAdminDashboard)
	admin.Get("/analytics", handlers.GetAdminAnalytics)
	admin.Get("/system/health", handlers.GetSystemHealth)
	admin.Get("/system/metrics", handlers.GetSystemMetrics)
	admin.Get("/system/alerts", handlers.GetSystemAlerts)
	admin.Get("/system/logs", handlers.GetSystemLogs)

	// Admin analytics endpoints
	admin.Get("/analytics/overview", handlers.GetAdminAnalytics)
	admin.Get("/analytics/users", handlers.GetAdminUserAnalytics)
	admin.Get("/analytics/organizations", handlers.GetAdminOrganizationAnalytics)
	admin.Get("/analytics/revenue", handlers.GetAdminRevenueAnalytics)
	admin.Get("/analytics/usage", handlers.GetAdminUsageAnalytics)
	admin.Post("/analytics/export", handlers.ExportAdminAnalytics)
	admin.Post("/analytics/custom", handlers.RunCustomAdminAnalytics)
	admin.Get("/analytics/dashboard/config", handlers.GetAdminAnalyticsDashboardConfig)
	admin.Put("/analytics/dashboard/config", handlers.UpdateAdminAnalyticsDashboardConfig)

	// Admin settings management
	admin.Get("/settings", handlers.GetSystemSettings)
	admin.Get("/settings/:id", handlers.GetSystemSetting)
	admin.Post("/settings", handlers.CreateSystemSetting)
	admin.Put("/settings/:id", handlers.UpdateSystemSetting)
	admin.Delete("/settings/:id", handlers.DeleteSystemSetting)
	admin.Get("/settings/stats", handlers.GetSettingsStats)
	admin.Get("/settings/health", handlers.GetSystemHealthStatus)

	// Admin environment variables
	admin.Get("/environment-variables", handlers.GetEnvironmentVariables)

	// Admin feature flags management
	admin.Get("/feature-flags", handlers.GetFeatureFlags)
	admin.Get("/feature-flags/:id", handlers.GetFeatureFlag)
	admin.Post("/feature-flags", handlers.CreateFeatureFlag)
	admin.Put("/feature-flags/:id", handlers.UpdateFeatureFlag)
	admin.Delete("/feature-flags/:id", handlers.DeleteFeatureFlag)
	admin.Post("/feature-flags/:id/toggle", handlers.ToggleFeatureFlag)
	admin.Post("/feature-flags/:id/archive", handlers.ArchiveFeatureFlag)
	admin.Get("/feature-flags/stats", handlers.GetFeatureFlagStats)

	// Feature flag evaluation
	admin.Post("/feature-flags/:key/evaluate", handlers.EvaluateFeatureFlag)
	admin.Get("/feature-flags/:key/analytics", handlers.GetFeatureFlagAnalytics)

	// ===== Admin User Management =====
	adminUsers := admin.Group("/users")
	adminUsers.Get("/statistics", handlers.AdminGetUserStatistics) // Static routes before :id
	adminUsers.Get("/", handlers.AdminGetAllUsers)
	adminUsers.Get("/:id", handlers.AdminGetUserById)
	adminUsers.Put("/:id", handlers.AdminUpdateUser)
	adminUsers.Put("/:id/status", handlers.AdminUpdateUserStatus)
	adminUsers.Get("/:id/activity", handlers.AdminGetUserActivity)
	adminUsers.Post("/:id/activity/export", handlers.AdminExportUserActivity)
	adminUsers.Get("/:id/security-events", handlers.AdminGetUserSecurityEvents)
	adminUsers.Get("/:id/login-history", handlers.AdminGetUserLoginHistory)
	adminUsers.Get("/:id/work-stats", handlers.AdminGetUserWorkStats)
	adminUsers.Get("/:id/sessions", handlers.AdminGetUserSessions)
	adminUsers.Delete("/:id/sessions/:sessionId", handlers.AdminTerminateUserSession)
	adminUsers.Delete("/:id/sessions", handlers.AdminTerminateAllUserSessions)
	adminUsers.Post("/:id/reset-password", handlers.AdminResetUserPassword)
	adminUsers.Post("/:id/impersonate", handlers.AdminImpersonateUser)
	adminUsers.Get("/:id/organizations", handlers.AdminGetUserOrganizations)
	adminUsers.Put("/:id/organizations/:orgId", handlers.AdminUpdateUserOrgRole)
	adminUsers.Delete("/:id/organizations/:orgId", handlers.AdminRemoveUserFromOrg)

	// ===== Admin Organization Management =====
	adminOrgs := admin.Group("/organizations")
	adminOrgs.Get("/statistics", handlers.AdminGetOrganizationStatistics) // Static routes before :id
	adminOrgs.Get("/", handlers.AdminGetAllOrganizations)
	adminOrgs.Post("/", handlers.AdminCreateOrganization)
	adminOrgs.Get("/:id", handlers.AdminGetOrganizationById)
	adminOrgs.Put("/:id", handlers.AdminUpdateOrganization)
	adminOrgs.Delete("/:id", handlers.AdminDeleteOrganization)
	adminOrgs.Put("/:id/status", handlers.AdminUpdateOrganizationStatus)
	adminOrgs.Get("/:id/users", handlers.AdminGetOrganizationUsers)
	adminOrgs.Get("/:id/activity", handlers.AdminGetOrganizationActivity)
	adminOrgs.Get("/:id/trial/status", handlers.AdminGetOrgTrialStatus)
	adminOrgs.Get("/:id/subscription", handlers.AdminGetOrgSubscription)
	adminOrgs.Post("/:id/trial/reset", handlers.AdminResetOrganizationTrial)
	adminOrgs.Post("/:id/trial/extend", handlers.AdminExtendOrganizationTrial)

	// ===== Admin Roles & Permissions =====
	adminRoles := admin.Group("/roles")
	adminRoles.Get("/stats", handlers.AdminGetRoleStats) // Static routes before :id
	adminRoles.Post("/export", handlers.AdminExportRoles)
	adminRoles.Post("/bulk-update", handlers.AdminBulkUpdateRoles)
	adminRoles.Get("/", handlers.AdminGetAllRoles)
	adminRoles.Post("/", handlers.AdminCreateRole)
	adminRoles.Get("/:id", handlers.AdminGetRoleById)
	adminRoles.Put("/:id", handlers.AdminUpdateRole)
	adminRoles.Delete("/:id", handlers.AdminDeleteRole)
	adminRoles.Get("/:id/users", handlers.AdminGetRoleUsers)
	adminRoles.Post("/:id/assign", handlers.AdminAssignRoleToUsers)
	adminRoles.Post("/:id/remove", handlers.AdminRemoveRoleFromUsers)
	adminRoles.Post("/:id/clone", handlers.AdminCloneRole)
	adminRoles.Get("/:id/audit", handlers.AdminGetRoleAuditHistory)

	adminPerms := admin.Group("/permissions")
	adminPerms.Get("/", handlers.AdminGetAllPermissions)
	adminPerms.Get("/by-category", handlers.AdminGetPermissionsByCategory)

	// ===== Admin Console Users (admin-level users) =====
	adminAdminUsers := admin.Group("/admin-users")
	adminAdminUsers.Get("/stats", handlers.AdminGetAdminUserStats) // Static routes before :id
	adminAdminUsers.Post("/export", handlers.AdminExportAdminUsers)
	adminAdminUsers.Post("/bulk-update", handlers.AdminBulkUpdateAdminUsers)
	adminAdminUsers.Get("/", handlers.AdminGetAdminUsers)
	adminAdminUsers.Post("/", handlers.AdminCreateAdminUser)
	adminAdminUsers.Get("/:id", handlers.AdminGetAdminUser)
	adminAdminUsers.Put("/:id", handlers.AdminUpdateAdminUser)
	adminAdminUsers.Delete("/:id", handlers.AdminDeleteAdminUser)
	adminAdminUsers.Post("/:id/activate", handlers.AdminActivateAdminUser)
	adminAdminUsers.Post("/:id/deactivate", handlers.AdminDeactivateAdminUser)
	adminAdminUsers.Post("/:id/unlock", handlers.AdminUnlockAdminUser)
	adminAdminUsers.Post("/:id/reset-password", handlers.AdminResetAdminPassword)
	adminAdminUsers.Post("/:id/two-factor", handlers.AdminToggleTwoFactor)
	adminAdminUsers.Get("/:id/activity", handlers.AdminGetAdminUserActivity)
	adminAdminUsers.Get("/:id/sessions", handlers.AdminGetAdminUserSessions)
	adminAdminUsers.Post("/:id/sessions/:sessionId/terminate", handlers.AdminTerminateAdminSession)
	adminAdminUsers.Post("/:id/sessions/terminate-all", handlers.AdminTerminateAllAdminSessions)
	adminAdminUsers.Post("/:id/impersonate", handlers.AdminImpersonateAdminUser)
	adminAdminUsers.Post("/:id/promote", handlers.AdminPromoteToSuperAdmin)
	adminAdminUsers.Post("/:id/demote", handlers.AdminDemoteFromSuperAdmin)

	// ===== Admin Impersonation Logs =====
	adminImpersonation := admin.Group("/impersonation")
	adminImpersonation.Get("/stats", handlers.GetImpersonationStats)
	adminImpersonation.Get("/logs", handlers.GetImpersonationLogs)
	adminImpersonation.Get("/logs/:id", handlers.GetImpersonationLog)
	adminImpersonation.Post("/logs/:id/revoke", handlers.RevokeImpersonationLog)

	// ===== Admin Reports & Analytics =====
	adminReports := admin.Group("/reports")
	adminReports.Get("/system-stats", handlerRegistry.Reports.GetSystemStatistics)
	adminReports.Get("/approval-metrics", handlerRegistry.Reports.GetApprovalMetrics)
	adminReports.Get("/user-activity", handlerRegistry.Reports.GetUserActivityMetrics)
	adminReports.Get("/analytics", handlerRegistry.Reports.GetAnalyticsDashboard)

	// ===== Admin Audit Logs =====
	adminAuditLogs := admin.Group("/audit-logs")
	adminAuditLogs.Get("/stats", handlers.GetAdminAuditLogStats)
	adminAuditLogs.Get("/analytics", handlers.GetAdminAuditLogAnalytics)
	adminAuditLogs.Get("/security-events", handlers.GetAdminAuditLogSecurityEvents)
	adminAuditLogs.Get("/retention-settings", handlers.GetAdminAuditLogRetentionSettings)
	adminAuditLogs.Put("/retention-settings", handlers.UpdateAdminAuditLogRetentionSettings)
	adminAuditLogs.Post("/export", handlers.ExportAdminAuditLogs)
	adminAuditLogs.Get("/", handlers.GetAdminAuditLogs)
	adminAuditLogs.Post("/", handlers.CreateAdminAuditLog)
	adminAuditLogs.Get("/:id", handlers.GetAdminAuditLogByID)

	// ===== Admin Database Management =====
	adminDB := admin.Group("/database")
	adminDB.Get("/stats", handlers.GetDatabaseStats)
	adminDB.Get("/connections", handlers.GetDatabaseConnections)
	adminDB.Get("/metrics", handlers.GetDatabaseMetrics)
	adminDB.Get("/queries", handlers.GetRunningQueries)
	adminDB.Get("/backups", handlers.GetDatabaseBackups)
	adminDB.Get("/connections/:id", handlers.GetDatabaseConnection)
	adminDB.Post("/connections/:id/test", handlers.TestDatabaseConnection)
	adminDB.Get("/connections/:id/tables", handlers.GetDatabaseTables)
	adminDB.Post("/connections/:id/execute", handlers.ExecuteDatabaseQuery)
	adminDB.Post("/connections/:id/backup", handlers.CreateDatabaseBackup)
	adminDB.Get("/connections/:id/migrations", handlers.GetDatabaseMigrations)
	adminDB.Post("/connections/:id/migrations/:migrationId/run", handlers.RunDatabaseMigration)
	adminDB.Post("/connections/:id/migrations/:migrationId/rollback", handlers.RollbackDatabaseMigration)
	adminDB.Post("/connections/:id/tables/:tableName/optimize", handlers.OptimizeDatabaseTable)
	adminDB.Post("/connections/:id/export", handlers.ExportDatabase)
	adminDB.Get("/connections/:id/schemas", handlers.GetDatabaseSchemas)
	adminDB.Get("/connections/:id/performance", handlers.GetDatabasePerformance)
	adminDB.Post("/queries/:id/cancel", handlers.CancelDatabaseQuery)
	adminDB.Post("/backups/:id/restore", handlers.RestoreDatabaseBackup)

	// API Monitoring routes removed

	// ===== Additional System Health Endpoints =====
	admin.Post("/system/alerts/:id/acknowledge", handlers.AcknowledgeSystemAlert)
	admin.Post("/system/alerts/:id/resolve", handlers.ResolveSystemAlert)
	admin.Get("/system/performance", handlers.GetPerformanceMetrics)
	admin.Post("/system/health/check", handlers.RunSystemHealthCheck)
	admin.Get("/system/config", handlers.GetSystemConfig)
	admin.Put("/system/config", handlers.UpdateSystemConfig)
	admin.Post("/system/services/:name/restart", handlers.RestartSystemService)
	admin.Post("/system/cache/clear", handlers.ClearSystemCache)

	// ===== Admin Notifications =====
	adminNotifications := admin.Group("/notifications")
	adminNotifications.Get("/stats", handlers.GetAdminNotificationStats)
	adminNotifications.Get("/", handlers.GetAdminNotifications)
	adminNotifications.Post("/", handlers.CreateAdminNotification)
	adminNotifications.Post("/bulk-delete", handlers.BulkDeleteAdminNotifications)
	adminNotifications.Delete("/:id", handlers.DeleteAdminNotification)
	adminNotifications.Post("/:id/read", handlers.MarkAdminNotificationRead)

	// ===== Admin Support (platform-wide document & workflow visibility) =====
	adminSupport := admin.Group("/support")
	adminSupport.Get("/documents", handlers.AdminGetSupportDocuments)
	adminSupport.Get("/documents/:id", handlers.AdminGetSupportDocument)
	adminSupport.Get("/workflow-tasks", handlers.AdminGetSupportWorkflowTasks)
	adminSupport.Get("/workflow-tasks/:id", handlers.AdminGetSupportWorkflowTask)
	adminSupport.Post("/workflow-tasks/:id/reassign", handlers.AdminReassignWorkflowTask)
	adminSupport.Post("/workflow-tasks/:id/reset", handlers.AdminResetWorkflowTask)

	// Note: Development tools and test workflow tasks are now created via seed data migrations
}
