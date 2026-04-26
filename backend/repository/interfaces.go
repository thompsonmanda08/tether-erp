package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
)

// UserRepositoryInterface defines the interface for user repository operations
type UserRepositoryInterface interface {
	// Basic CRUD operations
	Create(ctx context.Context, user *models.User) (*models.User, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Update(ctx context.Context, user *models.User) (*models.User, error)
	UpdatePassword(ctx context.Context, id string, hashedPassword string) error
	UpdateLastLogin(ctx context.Context, id string) error
	Delete(ctx context.Context, id string) error

	// List operations
	List(ctx context.Context, limit, offset int) ([]*models.User, error)
	ListByOrganization(ctx context.Context, organizationID string, limit, offset int) ([]*models.User, error)
	Count(ctx context.Context) (int64, error)
	CountActive(ctx context.Context) (int64, error)

	// Status operations
	Activate(ctx context.Context, id string) error
	Deactivate(ctx context.Context, id string) error
}

// SessionRepositoryInterface defines the interface for session repository operations
type SessionRepositoryInterface interface {
	Create(ctx context.Context, userID, refreshToken, ipAddress, userAgent string, expiresAt time.Time) (*sqlc.Session, error)
	GetByRefreshToken(ctx context.Context, refreshToken string) (*sqlc.Session, error)
	GetByUserID(ctx context.Context, userID string) ([]*sqlc.Session, error)
	UpdateRefreshToken(ctx context.Context, id uuid.UUID, oldRefreshToken, newRefreshToken string, expiresAt time.Time) (int64, error)
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByRefreshToken(ctx context.Context, refreshToken string) error
	DeleteByUserID(ctx context.Context, userID string) error
	DeleteExpired(ctx context.Context) error
	CountActive(ctx context.Context) (int64, error)
	CountUserActive(ctx context.Context, userID string) (int64, error)
}

// PasswordResetRepositoryInterface defines the interface for password reset repository operations
type PasswordResetRepositoryInterface interface {
	Create(ctx context.Context, userID, token string, expiresAt time.Time) (*sqlc.PasswordReset, error)
	GetByToken(ctx context.Context, token string) (*sqlc.PasswordReset, error)
	MarkAsUsed(ctx context.Context, id uuid.UUID) error
	DeleteByUserID(ctx context.Context, userID string) error
	DeleteExpired(ctx context.Context) error
	DeleteUsed(ctx context.Context) error
}

// LoginAttemptRepositoryInterface defines the interface for login attempt repository operations
type LoginAttemptRepositoryInterface interface {
	Create(ctx context.Context, userID, email, ipAddress, userAgent string, success bool, failureReason string) (*sqlc.LoginAttempt, error)
	GetRecentFailedAttempts(ctx context.Context, email string, since time.Time) (int64, error)
	GetRecentFailedAttemptsByIP(ctx context.Context, ipAddress string, since time.Time) (int64, error)
	GetByUser(ctx context.Context, userID string, limit, offset int) ([]*sqlc.LoginAttempt, error)
	GetByEmail(ctx context.Context, email string, limit, offset int) ([]*sqlc.LoginAttempt, error)
	DeleteOld(ctx context.Context, before time.Time) error
}

// AccountLockoutRepositoryInterface defines the interface for account lockout repository operations
type AccountLockoutRepositoryInterface interface {
	Create(ctx context.Context, userID, email, ipAddress, reason string, unlocksAt time.Time) (*sqlc.AccountLockout, error)
	GetActiveByUserID(ctx context.Context, userID string) (*sqlc.AccountLockout, error)
	GetActiveByEmail(ctx context.Context, email string) (*sqlc.AccountLockout, error)
	Unlock(ctx context.Context, userID string) error
	UnlockByEmail(ctx context.Context, email string) error
	GetHistory(ctx context.Context, userID string, limit, offset int) ([]*sqlc.AccountLockout, error)
	CleanupExpired(ctx context.Context) error
}

// OrganizationRoleRepositoryInterface defines the interface for organization role repository operations
type OrganizationRoleRepositoryInterface interface {
	// Role CRUD operations
	Create(ctx context.Context, organizationID, name, description string, isSystemRole bool, permissions []byte, createdBy string) (*sqlc.OrganizationRole, error)
	GetByID(ctx context.Context, id uuid.UUID) (*sqlc.OrganizationRole, error)
	GetByName(ctx context.Context, organizationID, name string) (*sqlc.OrganizationRole, error)
	Update(ctx context.Context, id uuid.UUID, name, description string, permissions []byte) (*sqlc.OrganizationRole, error)
	Delete(ctx context.Context, id uuid.UUID) error

	// List operations
	List(ctx context.Context, organizationID string, limit, offset int) ([]*sqlc.OrganizationRole, error)
	ListSystem(ctx context.Context) ([]*sqlc.OrganizationRole, error) // Global system roles (org_id IS NULL)
	ListCustom(ctx context.Context, organizationID string, limit, offset int) ([]*sqlc.OrganizationRole, error)
	Count(ctx context.Context, organizationID string) (int64, error)
	CountCustom(ctx context.Context, organizationID string) (int64, error)

	// User role assignments
	AssignUserRole(ctx context.Context, userID, organizationID string, roleID uuid.UUID, assignedBy string) (*sqlc.UserOrganizationRole, error)
	GetUserRoles(ctx context.Context, userID, organizationID string) ([]*sqlc.OrganizationRole, error)
	GetUserRoleAssignments(ctx context.Context, userID, organizationID string) ([]*sqlc.GetUserRoleAssignmentsRow, error)
	RemoveUserRole(ctx context.Context, userID, organizationID string, roleID uuid.UUID) error
	RemoveAllUserRoles(ctx context.Context, userID, organizationID string) error
	ListUsersWithRole(ctx context.Context, organizationID string, roleID uuid.UUID, limit, offset int) ([]*sqlc.ListUsersWithRoleRow, error)
}

// RequisitionRepositoryInterface defines the interface for requisition repository operations
type RequisitionRepositoryInterface interface {
	Create(ctx context.Context, req *models.Requisition) (*models.Requisition, error)
	GetByID(ctx context.Context, id string) (*models.Requisition, error)
	GetByNumber(ctx context.Context, reqNumber string) (*models.Requisition, error)
	Update(ctx context.Context, req *models.Requisition) (*models.Requisition, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, organizationID string, filters map[string]interface{}, limit, offset int) ([]*models.Requisition, error)
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]*models.Requisition, error)
	Count(ctx context.Context, organizationID string, filters map[string]interface{}) (int64, error)
	UpdateStatus(ctx context.Context, id, status string) error
	UpdateApprovalStage(ctx context.Context, id string, stage int) error
}

// BudgetRepositoryInterface defines the interface for budget repository operations
type BudgetRepositoryInterface interface {
	Create(ctx context.Context, budget *models.Budget) (*models.Budget, error)
	GetByID(ctx context.Context, id string) (*models.Budget, error)
	GetByCode(ctx context.Context, organizationID, budgetCode string) (*models.Budget, error)
	Update(ctx context.Context, budget *models.Budget) (*models.Budget, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, organizationID string, filters map[string]interface{}, limit, offset int) ([]*models.Budget, error)
	Count(ctx context.Context, organizationID string, filters map[string]interface{}) (int64, error)
	UpdateStatus(ctx context.Context, id, status string) error
	UpdateAllocatedAmount(ctx context.Context, id string, amount float64) error
}

// PurchaseOrderRepositoryInterface defines the interface for purchase order repository operations
type PurchaseOrderRepositoryInterface interface {
	Create(ctx context.Context, po *models.PurchaseOrder) (*models.PurchaseOrder, error)
	GetByID(ctx context.Context, id string) (*models.PurchaseOrder, error)
	GetByNumber(ctx context.Context, poNumber string) (*models.PurchaseOrder, error)
	Update(ctx context.Context, po *models.PurchaseOrder) (*models.PurchaseOrder, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, organizationID string, filters map[string]interface{}, limit, offset int) ([]*models.PurchaseOrder, error)
	Count(ctx context.Context, organizationID string, filters map[string]interface{}) (int64, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

// VendorRepositoryInterface defines the interface for vendor repository operations
type VendorRepositoryInterface interface {
	Create(ctx context.Context, vendor *models.Vendor) (*models.Vendor, error)
	GetByID(ctx context.Context, id string) (*models.Vendor, error)
	GetByCode(ctx context.Context, organizationID, vendorCode string) (*models.Vendor, error)
	Update(ctx context.Context, vendor *models.Vendor) (*models.Vendor, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, organizationID string, filters map[string]interface{}, limit, offset int) ([]*models.Vendor, error)
	Count(ctx context.Context, organizationID string, filters map[string]interface{}) (int64, error)
	Activate(ctx context.Context, id string) error
	Deactivate(ctx context.Context, id string) error
}

// NotificationRepositoryInterface defines the interface for notification repository operations
type NotificationRepositoryInterface interface {
	Create(ctx context.Context, notification *models.Notification) (*models.Notification, error)
	GetByID(ctx context.Context, id string) (*models.Notification, error)
	Update(ctx context.Context, notification *models.Notification) (*models.Notification, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, organizationID string, filters map[string]interface{}, limit, offset int) ([]*models.Notification, error)
	ListByUser(ctx context.Context, userID string, filters map[string]interface{}, limit, offset int) ([]*models.Notification, error)
	ListUnread(ctx context.Context, userID string, limit, offset int) ([]*models.Notification, error)
	Count(ctx context.Context, organizationID string, filters map[string]interface{}) (int64, error)
	CountUnread(ctx context.Context, userID string) (int64, error)
	MarkAsRead(ctx context.Context, id string) error
	MarkAllAsRead(ctx context.Context, userID string) error
	DeleteOld(ctx context.Context, before time.Time) error
}

// AuditLogRepositoryInterface defines the interface for audit log repository operations
type AuditLogRepositoryInterface interface {
	Create(ctx context.Context, log *models.AuditLog) (*models.AuditLog, error)
	GetByID(ctx context.Context, id string) (*models.AuditLog, error)
	List(ctx context.Context, organizationID string, filters map[string]interface{}, limit, offset int) ([]*models.AuditLog, error)
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]*models.AuditLog, error)
	ListByResource(ctx context.Context, resourceType, resourceID string, limit, offset int) ([]*models.AuditLog, error)
	Count(ctx context.Context, organizationID string, filters map[string]interface{}) (int64, error)
	DeleteOld(ctx context.Context, before time.Time) error
}
