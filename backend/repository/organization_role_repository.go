package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
)

// OrganizationRoleRepository implements OrganizationRoleRepositoryInterface
type OrganizationRoleRepository struct {
	db *pgxpool.Pool
}

// NewOrganizationRoleRepository creates a new organization role repository
func NewOrganizationRoleRepository(db *pgxpool.Pool) OrganizationRoleRepositoryInterface {
	return &OrganizationRoleRepository{
		db: db,
	}
}

// Create creates a new organization role
func (r *OrganizationRoleRepository) Create(ctx context.Context, organizationID, name, description string, isSystemRole bool, permissions []byte, createdBy string) (*sqlc.OrganizationRole, error) {
	query := `
		INSERT INTO organization_roles (
			organization_id, name, description, is_system_role, permissions, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6
		) RETURNING id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at`

	var role sqlc.OrganizationRole
	err := r.db.QueryRow(ctx, query, organizationID, name, description, isSystemRole, permissions, createdBy).Scan(
		&role.ID,
		&role.OrganizationID,
		&role.Name,
		&role.Description,
		&role.IsSystemRole,
		&role.Permissions,
		&role.Active,
		&role.CreatedBy,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &role, nil
}

// GetByID retrieves an organization role by ID
func (r *OrganizationRoleRepository) GetByID(ctx context.Context, id uuid.UUID) (*sqlc.OrganizationRole, error) {
	query := `
		SELECT id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at
		FROM organization_roles 
		WHERE id = $1 AND active = true`

	var role sqlc.OrganizationRole
	err := r.db.QueryRow(ctx, query, id).Scan(
		&role.ID,
		&role.OrganizationID,
		&role.Name,
		&role.Description,
		&role.IsSystemRole,
		&role.Permissions,
		&role.Active,
		&role.CreatedBy,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &role, nil
}

// GetByName retrieves an organization role by name (checks both org-specific and global system roles)
func (r *OrganizationRoleRepository) GetByName(ctx context.Context, organizationID, name string) (*sqlc.OrganizationRole, error) {
	query := `
		SELECT id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at
		FROM organization_roles
		WHERE ((organization_id = $1 AND name = $2) OR (organization_id IS NULL AND is_system_role = true AND name = $2))
		AND active = true
		LIMIT 1`

	var role sqlc.OrganizationRole
	err := r.db.QueryRow(ctx, query, organizationID, name).Scan(
		&role.ID,
		&role.OrganizationID,
		&role.Name,
		&role.Description,
		&role.IsSystemRole,
		&role.Permissions,
		&role.Active,
		&role.CreatedBy,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &role, nil
}

// Update updates an organization role
func (r *OrganizationRoleRepository) Update(ctx context.Context, id uuid.UUID, name, description string, permissions []byte) (*sqlc.OrganizationRole, error) {
	query := `
		UPDATE organization_roles SET 
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			permissions = COALESCE($4, permissions),
			updated_at = NOW()
		WHERE id = $1 AND is_system_role = false
		RETURNING id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at`

	var role sqlc.OrganizationRole
	err := r.db.QueryRow(ctx, query, id, name, description, permissions).Scan(
		&role.ID,
		&role.OrganizationID,
		&role.Name,
		&role.Description,
		&role.IsSystemRole,
		&role.Permissions,
		&role.Active,
		&role.CreatedBy,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &role, nil
}

// Delete deactivates an organization role (soft delete)
func (r *OrganizationRoleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE organization_roles SET 
			active = false,
			updated_at = NOW()
		WHERE id = $1 AND is_system_role = false`

	_, err := r.db.Exec(ctx, query, id)
	return err
}

// List retrieves organization roles with pagination (global system roles + org custom roles)
func (r *OrganizationRoleRepository) List(ctx context.Context, organizationID string, limit, offset int) ([]*sqlc.OrganizationRole, error) {
	query := `
		SELECT id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at
		FROM organization_roles
		WHERE (
			(organization_id = $1 AND active = true)
			OR
			(organization_id IS NULL AND is_system_role = true AND active = true)
		)
		AND name != 'super_admin'
		ORDER BY is_system_role DESC, name ASC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, organizationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []*sqlc.OrganizationRole
	for rows.Next() {
		var role sqlc.OrganizationRole
		err := rows.Scan(
			&role.ID,
			&role.OrganizationID,
			&role.Name,
			&role.Description,
			&role.IsSystemRole,
			&role.Permissions,
			&role.Active,
			&role.CreatedBy,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		roles = append(roles, &role)
	}

	return roles, rows.Err()
}

// ListSystem retrieves global system roles (organization_id IS NULL)
func (r *OrganizationRoleRepository) ListSystem(ctx context.Context) ([]*sqlc.OrganizationRole, error) {
	query := `
		SELECT id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at
		FROM organization_roles
		WHERE organization_id IS NULL AND is_system_role = true AND active = true
		ORDER BY name ASC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []*sqlc.OrganizationRole
	for rows.Next() {
		var role sqlc.OrganizationRole
		err := rows.Scan(
			&role.ID,
			&role.OrganizationID,
			&role.Name,
			&role.Description,
			&role.IsSystemRole,
			&role.Permissions,
			&role.Active,
			&role.CreatedBy,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		roles = append(roles, &role)
	}

	return roles, rows.Err()
}

// ListCustom retrieves custom roles for an organization with pagination
func (r *OrganizationRoleRepository) ListCustom(ctx context.Context, organizationID string, limit, offset int) ([]*sqlc.OrganizationRole, error) {
	query := `
		SELECT id, organization_id, name, description, is_system_role, permissions, active, created_by, created_at, updated_at
		FROM organization_roles 
		WHERE organization_id = $1 AND is_system_role = false AND active = true
		ORDER BY name ASC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, organizationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []*sqlc.OrganizationRole
	for rows.Next() {
		var role sqlc.OrganizationRole
		err := rows.Scan(
			&role.ID,
			&role.OrganizationID,
			&role.Name,
			&role.Description,
			&role.IsSystemRole,
			&role.Permissions,
			&role.Active,
			&role.CreatedBy,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		roles = append(roles, &role)
	}

	return roles, rows.Err()
}

// Count counts total roles visible to an organization (global system + org custom)
func (r *OrganizationRoleRepository) Count(ctx context.Context, organizationID string) (int64, error) {
	query := `SELECT COUNT(*) FROM organization_roles WHERE ((organization_id = $1 AND active = true) OR (organization_id IS NULL AND is_system_role = true AND active = true))`

	var count int64
	err := r.db.QueryRow(ctx, query, organizationID).Scan(&count)
	return count, err
}

// CountCustom counts custom organization roles
func (r *OrganizationRoleRepository) CountCustom(ctx context.Context, organizationID string) (int64, error) {
	query := `SELECT COUNT(*) FROM organization_roles WHERE organization_id = $1 AND is_system_role = false AND active = true`

	var count int64
	err := r.db.QueryRow(ctx, query, organizationID).Scan(&count)
	return count, err
}

// AssignUserRole assigns a role to a user in an organization
func (r *OrganizationRoleRepository) AssignUserRole(ctx context.Context, userID, organizationID string, roleID uuid.UUID, assignedBy string) (*sqlc.UserOrganizationRole, error) {
	query := `
		INSERT INTO user_organization_roles (
			user_id, organization_id, role_id, assigned_by
		) VALUES (
			$1, $2, $3, $4
		) RETURNING id, user_id, organization_id, role_id, assigned_by, assigned_at, active`

	var assignment sqlc.UserOrganizationRole
	err := r.db.QueryRow(ctx, query, userID, organizationID, roleID, assignedBy).Scan(
		&assignment.ID,
		&assignment.UserID,
		&assignment.OrganizationID,
		&assignment.RoleID,
		&assignment.AssignedBy,
		&assignment.AssignedAt,
		&assignment.Active,
	)
	if err != nil {
		return nil, err
	}

	return &assignment, nil
}

// GetUserRoles retrieves all roles for a user in an organization
func (r *OrganizationRoleRepository) GetUserRoles(ctx context.Context, userID, organizationID string) ([]*sqlc.OrganizationRole, error) {
	query := `
		SELECT org_roles.id, org_roles.organization_id, org_roles.name, org_roles.description, org_roles.is_system_role, org_roles.permissions, org_roles.active, org_roles.created_by, org_roles.created_at, org_roles.updated_at
		FROM organization_roles org_roles
		INNER JOIN user_organization_roles uor ON org_roles.id = uor.role_id
		WHERE uor.user_id = $1 AND uor.organization_id = $2 AND uor.active = true AND org_roles.active = true`

	rows, err := r.db.Query(ctx, query, userID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []*sqlc.OrganizationRole
	for rows.Next() {
		var role sqlc.OrganizationRole
		err := rows.Scan(
			&role.ID,
			&role.OrganizationID,
			&role.Name,
			&role.Description,
			&role.IsSystemRole,
			&role.Permissions,
			&role.Active,
			&role.CreatedBy,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		roles = append(roles, &role)
	}

	return roles, rows.Err()
}

// GetUserRoleAssignments retrieves user role assignments with role details
func (r *OrganizationRoleRepository) GetUserRoleAssignments(ctx context.Context, userID, organizationID string) ([]*sqlc.GetUserRoleAssignmentsRow, error) {
	query := `
		SELECT uor.id, uor.user_id, uor.organization_id, uor.role_id, uor.assigned_by, uor.assigned_at, uor.active, org_roles.name as role_name, org_roles.description as role_description
		FROM user_organization_roles uor
		INNER JOIN organization_roles org_roles ON uor.role_id = org_roles.id
		WHERE uor.user_id = $1 AND uor.organization_id = $2 AND uor.active = true`

	rows, err := r.db.Query(ctx, query, userID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []*sqlc.GetUserRoleAssignmentsRow
	for rows.Next() {
		var assignment sqlc.GetUserRoleAssignmentsRow
		err := rows.Scan(
			&assignment.ID,
			&assignment.UserID,
			&assignment.OrganizationID,
			&assignment.RoleID,
			&assignment.AssignedBy,
			&assignment.AssignedAt,
			&assignment.Active,
			&assignment.RoleName,
			&assignment.RoleDescription,
		)
		if err != nil {
			return nil, err
		}
		assignments = append(assignments, &assignment)
	}

	return assignments, rows.Err()
}

// RemoveUserRole removes a specific role from a user
func (r *OrganizationRoleRepository) RemoveUserRole(ctx context.Context, userID, organizationID string, roleID uuid.UUID) error {
	query := `
		UPDATE user_organization_roles SET 
			active = false
		WHERE user_id = $1 AND organization_id = $2 AND role_id = $3`

	_, err := r.db.Exec(ctx, query, userID, organizationID, roleID)
	return err
}

// RemoveAllUserRoles removes all roles from a user in an organization
func (r *OrganizationRoleRepository) RemoveAllUserRoles(ctx context.Context, userID, organizationID string) error {
	query := `
		UPDATE user_organization_roles SET 
			active = false
		WHERE user_id = $1 AND organization_id = $2`

	_, err := r.db.Exec(ctx, query, userID, organizationID)
	return err
}

// ListUsersWithRole retrieves users who have a specific role
func (r *OrganizationRoleRepository) ListUsersWithRole(ctx context.Context, organizationID string, roleID uuid.UUID, limit, offset int) ([]*sqlc.ListUsersWithRoleRow, error) {
	query := `
		SELECT u.id, u.email, u.name, uor.assigned_at 
		FROM users u
		INNER JOIN user_organization_roles uor ON u.id = uor.user_id
		WHERE uor.organization_id = $1 AND uor.role_id = $2 AND uor.active = true
		ORDER BY u.name
		LIMIT $3 OFFSET $4`

	rows, err := r.db.Query(ctx, query, organizationID, roleID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*sqlc.ListUsersWithRoleRow
	for rows.Next() {
		var user sqlc.ListUsersWithRoleRow
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&user.AssignedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, &user)
	}

	return users, rows.Err()
}