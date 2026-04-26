package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/models"
)

// RoleManagementService handles creating and managing custom organization roles.
// This is used in Phase 3.5 to allow organization admins to define their own roles.
//
// Backed by sqlc + pgxpool via package-level config.Queries / config.PgxDB.
type RoleManagementService struct{}

// NewRoleManagementService creates a new role management service.
//
// NOTE: The previous signature accepted a *gorm.DB. After the GORM removal it
// takes no arguments and reads the global config.Queries / config.PgxDB. Callers
// (handlers/main.go) that still pass a DB pointer will fail to compile and must
// be updated to drop the argument.
func NewRoleManagementService() *RoleManagementService {
	return &RoleManagementService{}
}

// CreateOrganizationRole creates a new custom role for an organization.
func (rms *RoleManagementService) CreateOrganizationRole(
	organizationID string,
	name string,
	description string,
) (*models.OrganizationRole, error) {
	if name == "" {
		return nil, fmt.Errorf("role_management: create_organization_role: name is required")
	}

	ctx := context.Background()

	desc := description
	isSystem := false
	row, err := config.Queries.CreateOrganizationRole(ctx, sqlc.CreateOrganizationRoleParams{
		OrganizationID: &organizationID,
		Name:           name,
		Description:    &desc,
		IsSystemRole:   &isSystem,
		Permissions:    []byte("[]"),
		CreatedBy:      nil,
	})
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":       "create_organization_role",
			"role_name":       name,
			"organization_id": organizationID,
		}).WithError(err).Error("failed_to_create_organization_role")
		return nil, fmt.Errorf("role_management: create_organization_role: %w", err)
	}

	return sqlcRoleToModel(row), nil
}

// UpdateOrganizationRole updates an existing custom role.
func (rms *RoleManagementService) UpdateOrganizationRole(
	roleID string,
	name string,
	description string,
) (*models.OrganizationRole, error) {
	ctx := context.Background()

	roleUUID, err := uuid.Parse(roleID)
	if err != nil {
		return nil, fmt.Errorf("role_management: update_organization_role: invalid role id: %w", err)
	}

	existing, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
		ID: pgtype.UUID{Bytes: roleUUID, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("role_management: update_organization_role: role not found: %w", err)
	}

	if boolPtrTrue(existing.IsSystemRole) {
		return nil, fmt.Errorf("role_management: update_organization_role: cannot modify system roles")
	}

	// COALESCE in the sqlc UPDATE keeps the previous value when args are zero/nil.
	// Pass the new name (empty string keeps existing because of COALESCE on NULL — but
	// sqlc Name is non-pointer string. Treat empty string by reading the existing row first.)
	newName := existing.Name
	if name != "" {
		newName = name
	}
	var newDescription *string
	if description != "" {
		newDescription = &description
	} else {
		newDescription = existing.Description
	}

	updated, err := config.Queries.UpdateOrganizationRole(ctx, sqlc.UpdateOrganizationRoleParams{
		ID:          pgtype.UUID{Bytes: roleUUID, Valid: true},
		Name:        newName,
		Description: newDescription,
		Permissions: existing.Permissions,
	})
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "update_organization_role",
			"role_id":   roleID,
		}).WithError(err).Error("failed_to_update_organization_role")
		return nil, fmt.Errorf("role_management: update_organization_role: %w", err)
	}

	return sqlcRoleToModel(updated), nil
}

// DeleteOrganizationRole deletes a custom role (only user-created roles can be deleted).
// System default roles (admin, approver, requester, finance, viewer) cannot be deleted.
func (rms *RoleManagementService) DeleteOrganizationRole(roleID string) error {
	ctx := context.Background()

	roleUUID, err := uuid.Parse(roleID)
	if err != nil {
		return fmt.Errorf("role_management: delete_organization_role: invalid role id: %w", err)
	}

	existing, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
		ID: pgtype.UUID{Bytes: roleUUID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("role_management: delete_organization_role: role not found: %w", err)
	}

	if rms.isSystemDefaultRole(existing.Name) {
		return fmt.Errorf("role_management: delete_organization_role: cannot delete system default roles (admin, approver, requester, finance, viewer)")
	}

	if boolPtrTrue(existing.IsSystemRole) {
		return fmt.Errorf("role_management: delete_organization_role: cannot delete system roles")
	}

	if err := config.Queries.DeactivateOrganizationRole(ctx, sqlc.DeactivateOrganizationRoleParams{
		ID: pgtype.UUID{Bytes: roleUUID, Valid: true},
	}); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation": "delete_organization_role",
			"role_id":   roleID,
		}).WithError(err).Error("failed_to_delete_organization_role")
		return fmt.Errorf("role_management: delete_organization_role: %w", err)
	}

	return nil
}

// GetOrganizationRole retrieves a role by ID.
func (rms *RoleManagementService) GetOrganizationRole(roleID string) (*models.OrganizationRole, error) {
	ctx := context.Background()

	roleUUID, err := uuid.Parse(roleID)
	if err != nil {
		return nil, fmt.Errorf("role_management: get_organization_role: invalid role id: %w", err)
	}

	row, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
		ID: pgtype.UUID{Bytes: roleUUID, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("role_management: get_organization_role: role not found: %w", err)
	}
	return sqlcRoleToModel(row), nil
}

// GetOrganizationRoles retrieves all roles visible to an organization.
// Returns global system roles (org_id IS NULL) + org-specific custom roles, excluding super_admin.
func (rms *RoleManagementService) GetOrganizationRoles(organizationID string) ([]models.OrganizationRole, error) {
	ctx := context.Background()

	const query = `
SELECT id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at
FROM organization_roles
WHERE (
    (organization_id = $1 AND active = true)
    OR
    (organization_id IS NULL AND is_system_role = true AND active = true)
)
AND name != 'super_admin'
ORDER BY is_system_role DESC, name ASC
`
	rows, err := config.PgxDB.Query(ctx, query, organizationID)
	if err != nil {
		return nil, fmt.Errorf("role_management: get_organization_roles: %w", err)
	}
	defer rows.Close()

	roles := []models.OrganizationRole{}
	for rows.Next() {
		var r sqlc.OrganizationRole
		if err := rows.Scan(
			&r.ID, &r.OrganizationID, &r.Name, &r.Description, &r.IsSystemRole,
			&r.Permissions, &r.Active, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("role_management: get_organization_roles: scan: %w", err)
		}
		roles = append(roles, *sqlcRoleToModel(r))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("role_management: get_organization_roles: %w", err)
	}
	return roles, nil
}

// AssignPermissionToRole assigns a permission to a role (simplified version).
// Permissions are stored as a JSON array on organization_roles.permissions.
func (rms *RoleManagementService) AssignPermissionToRole(
	roleID string,
	permissionName string,
) error {
	ctx := context.Background()

	roleUUID, err := uuid.Parse(roleID)
	if err != nil {
		return fmt.Errorf("role_management: assign_permission: invalid role id: %w", err)
	}

	role, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
		ID: pgtype.UUID{Bytes: roleUUID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("role_management: assign_permission: role not found: %w", err)
	}

	permissions := decodePermissions(role.Permissions)
	for _, perm := range permissions {
		if perm == permissionName {
			return nil // already exists
		}
	}
	permissions = append(permissions, permissionName)

	encoded, _ := json.Marshal(permissions)
	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE organization_roles SET permissions = $1, updated_at = NOW() WHERE id = $2`,
		encoded, pgtype.UUID{Bytes: roleUUID, Valid: true},
	); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":       "assign_permission_to_role",
			"role_id":         roleID,
			"permission_name": permissionName,
		}).WithError(err).Error("failed_to_assign_permission_to_role")
		return fmt.Errorf("role_management: assign_permission: %w", err)
	}

	return nil
}

// RemovePermissionFromRole removes a permission from a role (simplified version).
func (rms *RoleManagementService) RemovePermissionFromRole(
	roleID string,
	permissionName string,
) error {
	ctx := context.Background()

	roleUUID, err := uuid.Parse(roleID)
	if err != nil {
		return fmt.Errorf("role_management: remove_permission: invalid role id: %w", err)
	}

	role, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
		ID: pgtype.UUID{Bytes: roleUUID, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("role_management: remove_permission: role not found: %w", err)
	}

	permissions := decodePermissions(role.Permissions)
	newPermissions := make([]string, 0, len(permissions))
	for _, perm := range permissions {
		if perm != permissionName {
			newPermissions = append(newPermissions, perm)
		}
	}

	encoded, _ := json.Marshal(newPermissions)
	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE organization_roles SET permissions = $1, updated_at = NOW() WHERE id = $2`,
		encoded, pgtype.UUID{Bytes: roleUUID, Valid: true},
	); err != nil {
		logging.WithFields(map[string]interface{}{
			"operation":       "remove_permission_from_role",
			"role_id":         roleID,
			"permission_name": permissionName,
		}).WithError(err).Error("failed_to_remove_permission_from_role")
		return fmt.Errorf("role_management: remove_permission: %w", err)
	}

	return nil
}

// GetRolePermissions retrieves all permissions assigned to a role (simplified version).
func (rms *RoleManagementService) GetRolePermissions(roleID string) ([]string, error) {
	ctx := context.Background()

	roleUUID, err := uuid.Parse(roleID)
	if err != nil {
		return nil, fmt.Errorf("role_management: get_role_permissions: invalid role id: %w", err)
	}

	role, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
		ID: pgtype.UUID{Bytes: roleUUID, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("role_management: get_role_permissions: role not found: %w", err)
	}

	return decodePermissions(role.Permissions), nil
}

// GetOrganizationPermissions retrieves all available permissions (simplified version).
func (rms *RoleManagementService) GetOrganizationPermissions(organizationID string) ([]string, error) {
	// Return standard permissions that are available in the system.
	permissions := []string{
		"requisition:view", "requisition:create", "requisition:edit", "requisition:delete", "requisition:approve", "requisition:reject",
		"budget:view", "budget:create", "budget:edit", "budget:delete", "budget:approve", "budget:reject",
		"purchase_order:view", "purchase_order:create", "purchase_order:edit", "purchase_order:delete", "purchase_order:approve", "purchase_order:reject",
		"payment_voucher:view", "payment_voucher:create", "payment_voucher:edit", "payment_voucher:delete", "payment_voucher:approve", "payment_voucher:reject",
		"grn:view", "grn:create", "grn:edit", "grn:delete",
		"vendor:view", "vendor:create", "vendor:edit", "vendor:delete",
		"category:view", "category:create", "category:edit", "category:delete",
		"organization:view", "organization:edit", "organization:manage_users", "organization:manage_workflows",
		"analytics:view", "audit_log:view",
	}
	return permissions, nil
}

// isSystemDefaultRole checks if a role name is one of the system default roles.
// System default roles cannot be deleted by users.
func (rms *RoleManagementService) isSystemDefaultRole(roleName string) bool {
	systemDefaultRoles := map[string]bool{
		"super_admin": true,
		"admin":       true,
		"approver":    true,
		"requester":   true,
		"finance":     true,
		"viewer":      true,
	}
	return systemDefaultRoles[strings.ToLower(roleName)]
}

// InitializeDefaultRolesForOrganization is deprecated.
// System roles are now global (organization_id = NULL) and managed via EnsureGlobalSystemRoles().
// This method is kept for backward compatibility but is a no-op.
func (rms *RoleManagementService) InitializeDefaultRolesForOrganization(organizationID string) error {
	logging.WithFields(map[string]interface{}{
		"organization_id": organizationID,
	}).Info("InitializeDefaultRolesForOrganization called but is now a no-op: system roles are global")
	return nil
}

// EnsureGlobalSystemRoles creates global system roles if they don't exist.
// Called at application startup. System roles have organization_id = NULL.
//
// Uses INSERT ... ON CONFLICT DO NOTHING for idempotency, then refreshes the
// permissions array to match the current code-defined definition.
func (rms *RoleManagementService) EnsureGlobalSystemRoles() error {
	ctx := context.Background()

	defaultRoles := []struct {
		name        string
		description string
		permissions []string
	}{
		{
			name:        "super_admin",
			description: "Full platform access with all permissions",
			permissions: []string{
				"requisition:view", "requisition:create", "requisition:edit", "requisition:delete", "requisition:approve", "requisition:reject",
				"budget:view", "budget:create", "budget:edit", "budget:delete", "budget:approve", "budget:reject",
				"purchase_order:view", "purchase_order:create", "purchase_order:edit", "purchase_order:delete", "purchase_order:approve", "purchase_order:reject",
				"payment_voucher:view", "payment_voucher:create", "payment_voucher:edit", "payment_voucher:delete", "payment_voucher:approve", "payment_voucher:reject",
				"grn:view", "grn:create", "grn:edit", "grn:delete",
				"vendor:view", "vendor:create", "vendor:edit", "vendor:delete",
				"category:view", "category:create", "category:edit", "category:delete",
				"organization:view", "organization:edit", "organization:manage_users", "organization:manage_workflows",
				"analytics:view", "audit_log:view",
			},
		},
		{
			name:        "admin",
			description: "Full administrative access",
			permissions: []string{
				"requisition:view", "requisition:create", "requisition:edit", "requisition:delete", "requisition:approve", "requisition:reject",
				"budget:view", "budget:create", "budget:edit", "budget:delete", "budget:approve", "budget:reject",
				"purchase_order:view", "purchase_order:create", "purchase_order:edit", "purchase_order:delete", "purchase_order:approve", "purchase_order:reject",
				"payment_voucher:view", "payment_voucher:create", "payment_voucher:edit", "payment_voucher:delete", "payment_voucher:approve", "payment_voucher:reject",
				"grn:view", "grn:create", "grn:edit", "grn:delete",
				"vendor:view", "vendor:create", "vendor:edit", "vendor:delete",
				"category:view", "category:create", "category:edit", "category:delete",
				"organization:view", "organization:edit", "organization:manage_users", "organization:manage_workflows",
				"analytics:view", "audit_log:view",
			},
		},
		{
			name:        "approver",
			description: "Can approve documents",
			permissions: []string{
				"requisition:view", "requisition:approve", "requisition:reject",
				"budget:view", "budget:approve", "budget:reject",
				"purchase_order:view", "purchase_order:approve", "purchase_order:reject",
				"payment_voucher:view", "payment_voucher:approve", "payment_voucher:reject",
				"grn:view",
				"vendor:view",
				"category:view",
			},
		},
		{
			name:        "requester",
			description: "Can create and manage own requests",
			permissions: []string{
				"requisition:view", "requisition:create", "requisition:edit",
				"budget:view", "budget:create", "budget:edit",
				"vendor:view", "category:view",
			},
		},
		{
			name:        "finance",
			description: "Finance team — manage and approve budgets, purchase orders, and payment vouchers",
			permissions: []string{
				"requisition:view",
				"budget:view", "budget:create", "budget:edit", "budget:approve", "budget:reject",
				"purchase_order:view", "purchase_order:create", "purchase_order:edit", "purchase_order:approve", "purchase_order:reject",
				"payment_voucher:view", "payment_voucher:create", "payment_voucher:edit", "payment_voucher:approve", "payment_voucher:reject",
				"vendor:view",
				"category:view",
				"analytics:view", "audit_log:view",
			},
		},
		{
			name:        "viewer",
			description: "Read-only access",
			permissions: []string{
				"requisition:view", "budget:view", "purchase_order:view", "payment_voucher:view",
				"grn:view", "vendor:view", "category:view",
			},
		},
	}

	const upsertQuery = `
INSERT INTO organization_roles (
    id, organization_id, name, description, is_system_role, permissions, active, created_at, updated_at
) VALUES (
    $1, NULL, $2, $3, true, $4, true, NOW(), NOW()
)
ON CONFLICT DO NOTHING
`

	const refreshQuery = `
UPDATE organization_roles
SET permissions = $1, updated_at = NOW()
WHERE name = $2 AND is_system_role = true AND organization_id IS NULL
`

	for _, roleData := range defaultRoles {
		permissionsJSON, _ := json.Marshal(roleData.permissions)
		newID := uuid.New()

		if _, err := config.PgxDB.Exec(ctx, upsertQuery,
			pgtype.UUID{Bytes: newID, Valid: true},
			roleData.name,
			roleData.description,
			permissionsJSON,
		); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation": "ensure_global_system_role",
				"role_name": roleData.name,
			}).WithError(err).Error("failed_to_create_global_system_role")
			return fmt.Errorf("role_management: ensure_global_system_roles: insert %s: %w", roleData.name, err)
		}

		// Sync permissions to the current code-defined definition (matches prior GORM behavior).
		if _, err := config.PgxDB.Exec(ctx, refreshQuery, permissionsJSON, roleData.name); err != nil {
			logging.WithFields(map[string]interface{}{
				"operation": "ensure_global_system_role",
				"role_name": roleData.name,
			}).WithError(err).Error("failed_to_refresh_global_system_role_permissions")
			return fmt.Errorf("role_management: ensure_global_system_roles: refresh %s: %w", roleData.name, err)
		}

		logging.WithFields(map[string]interface{}{
			"operation": "ensure_global_system_role",
			"role_name": roleData.name,
		}).Info("ensured_global_system_role")
	}

	return nil
}

// --- helpers ---

// sqlcRoleToModel maps a sqlc OrganizationRole row to the domain model.
func sqlcRoleToModel(r sqlc.OrganizationRole) *models.OrganizationRole {
	role := &models.OrganizationRole{
		OrganizationID: r.OrganizationID,
		Name:           r.Name,
		IsSystemRole:   boolPtrTrue(r.IsSystemRole),
		Active:         boolPtrTrue(r.Active),
		CreatedBy:      r.CreatedBy,
	}
	if r.ID.Valid {
		role.ID = uuid.UUID(r.ID.Bytes)
	}
	if r.Description != nil {
		role.Description = *r.Description
	}
	if r.Permissions != nil {
		role.Permissions = json.RawMessage(r.Permissions)
	}
	if r.CreatedAt.Valid {
		role.CreatedAt = r.CreatedAt.Time
	}
	if r.UpdatedAt.Valid {
		role.UpdatedAt = r.UpdatedAt.Time
	}
	return role
}

func decodePermissions(raw []byte) []string {
	if len(raw) == 0 {
		return nil
	}
	var perms []string
	_ = json.Unmarshal(raw, &perms)
	return perms
}

func boolPtrTrue(b *bool) bool {
	return b != nil && *b
}
