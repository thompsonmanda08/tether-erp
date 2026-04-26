package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
)

// DepartmentService handles organization-department operations using sqlc + pgxpool.
type DepartmentService struct{}

// NewDepartmentService creates a new department service. The service uses the
// package-global config.Queries / config.PgxDB and therefore takes no DB handle.
func NewDepartmentService() *DepartmentService {
	return &DepartmentService{}
}

// toModel converts an sqlc OrganizationDepartment row to the public model.
func toDepartmentModel(row sqlc.OrganizationDepartment) models.OrganizationDepartment {
	d := models.OrganizationDepartment{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		Name:           row.Name,
		IsActive:       row.IsActive,
	}
	if row.Code != nil {
		d.Code = *row.Code
	}
	if row.Description != nil {
		d.Description = *row.Description
	}
	if row.ManagerName != nil {
		d.ManagerName = *row.ManagerName
	}
	if row.ParentID != nil {
		v := *row.ParentID
		d.ParentID = &v
	}
	if row.CreatedAt.Valid {
		d.CreatedAt = row.CreatedAt.Time
	}
	if row.UpdatedAt.Valid {
		d.UpdatedAt = row.UpdatedAt.Time
	}
	return d
}

// strPtrOrNil returns a non-nil pointer to s, or nil if s is empty.
func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// GetAllDepartments retrieves all departments for an organization with pagination.
func (s *DepartmentService) GetAllDepartments(organizationID string, page, pageSize int) ([]interface{}, int64, error) {
	ctx := context.Background()

	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := int32((page - 1) * pageSize)

	// Total count (no active filter -> use raw query because sqlc CountDepartments
	// always applies the bool filter when not nil)
	var total int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM organization_departments WHERE organization_id = $1`,
		organizationID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("departments: count: %w", err)
	}

	// List rows (no is_active filter)
	rows, err := config.PgxDB.Query(ctx,
		`SELECT id, organization_id, name, code, description, parent_id, manager_name, is_active, created_at, updated_at
		 FROM organization_departments
		 WHERE organization_id = $1
		 ORDER BY name ASC
		 LIMIT $2 OFFSET $3`,
		organizationID, int32(pageSize), offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("departments: list: %w", err)
	}
	defer rows.Close()

	result := make([]interface{}, 0)
	for rows.Next() {
		var r sqlc.OrganizationDepartment
		if err := rows.Scan(
			&r.ID, &r.OrganizationID, &r.Name, &r.Code, &r.Description,
			&r.ParentID, &r.ManagerName, &r.IsActive, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("departments: scan: %w", err)
		}
		result = append(result, toDepartmentModel(r))
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("departments: iterate: %w", err)
	}

	return result, total, nil
}

// listByActive lists departments filtered by is_active = active.
func (s *DepartmentService) listByActive(organizationID string, active bool, page, pageSize int) ([]interface{}, int64, error) {
	ctx := context.Background()

	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := int32((page - 1) * pageSize)

	var total int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM organization_departments WHERE organization_id = $1 AND is_active = $2`,
		organizationID, active,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("departments: count active=%v: %w", active, err)
	}

	rows, err := config.PgxDB.Query(ctx,
		`SELECT id, organization_id, name, code, description, parent_id, manager_name, is_active, created_at, updated_at
		 FROM organization_departments
		 WHERE organization_id = $1 AND is_active = $2
		 ORDER BY name ASC
		 LIMIT $3 OFFSET $4`,
		organizationID, active, int32(pageSize), offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("departments: list active=%v: %w", active, err)
	}
	defer rows.Close()

	result := make([]interface{}, 0)
	for rows.Next() {
		var r sqlc.OrganizationDepartment
		if err := rows.Scan(
			&r.ID, &r.OrganizationID, &r.Name, &r.Code, &r.Description,
			&r.ParentID, &r.ManagerName, &r.IsActive, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("departments: scan: %w", err)
		}
		result = append(result, toDepartmentModel(r))
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("departments: iterate: %w", err)
	}

	return result, total, nil
}

// GetActiveDepartments retrieves only active departments.
func (s *DepartmentService) GetActiveDepartments(organizationID string, page, pageSize int) ([]interface{}, int64, error) {
	return s.listByActive(organizationID, true, page, pageSize)
}

// GetInactiveDepartments retrieves only inactive departments.
func (s *DepartmentService) GetInactiveDepartments(organizationID string, page, pageSize int) ([]interface{}, int64, error) {
	return s.listByActive(organizationID, false, page, pageSize)
}

// GetDepartmentByID retrieves a specific department by ID, scoped to the organization.
func (s *DepartmentService) GetDepartmentByID(organizationID, departmentID string) (*models.OrganizationDepartment, error) {
	ctx := context.Background()

	row, err := config.Queries.GetDepartmentByID(ctx, sqlc.GetDepartmentByIDParams{ID: departmentID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("department not found")
		}
		return nil, fmt.Errorf("departments: get by id: %w", err)
	}
	if row.OrganizationID != organizationID {
		return nil, fmt.Errorf("department not found")
	}
	d := toDepartmentModel(row)
	return &d, nil
}

// CreateDepartment creates a new department.
func (s *DepartmentService) CreateDepartment(organizationID, name, code string, description, managerName, parentID *string) (*models.OrganizationDepartment, error) {
	ctx := context.Background()

	row, err := config.Queries.CreateDepartment(ctx, sqlc.CreateDepartmentParams{
		ID:             uuid.New().String(),
		OrganizationID: organizationID,
		Name:           name,
		Code:           strPtrOrNil(code),
		Description:    description,
		ParentID:       parentID,
		ManagerName:    managerName,
		IsActive:       true,
	})
	if err != nil {
		return nil, fmt.Errorf("departments: create: %w", err)
	}
	d := toDepartmentModel(row)
	return &d, nil
}

// UpdateDepartment updates an existing department. Pointer params are used so the
// caller can distinguish "no change" (nil) from "set to empty/zero".
func (s *DepartmentService) UpdateDepartment(
	organizationID, departmentID string,
	name, code, description, managerName, parentID *string,
	isActive *bool,
) (*models.OrganizationDepartment, error) {
	ctx := context.Background()

	// Verify ownership / existence first.
	existing, err := config.Queries.GetDepartmentByID(ctx, sqlc.GetDepartmentByIDParams{ID: departmentID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("department not found")
		}
		return nil, fmt.Errorf("departments: lookup: %w", err)
	}
	if existing.OrganizationID != organizationID {
		return nil, fmt.Errorf("department not found")
	}

	// Build update params, falling back to existing values when no change requested.
	newName := existing.Name
	if name != nil {
		newName = *name
	}
	newCode := existing.Code
	if code != nil {
		v := *code
		newCode = &v
	}
	newDescription := existing.Description
	if description != nil {
		v := *description
		newDescription = &v
	}
	newManagerName := existing.ManagerName
	if managerName != nil {
		v := *managerName
		newManagerName = &v
	}
	newParentID := existing.ParentID
	if parentID != nil {
		v := *parentID
		newParentID = &v
	}
	newActive := existing.IsActive
	if isActive != nil {
		newActive = *isActive
	}

	row, err := config.Queries.UpdateDepartment(ctx, sqlc.UpdateDepartmentParams{
		ID:          departmentID,
		Name:        newName,
		Code:        newCode,
		Description: newDescription,
		ParentID:    newParentID,
		ManagerName: newManagerName,
		IsActive:    newActive,
	})
	if err != nil {
		return nil, fmt.Errorf("departments: update: %w", err)
	}
	d := toDepartmentModel(row)
	return &d, nil
}

// DeleteDepartment soft deletes a department by flipping is_active to false.
func (s *DepartmentService) DeleteDepartment(organizationID, departmentID string) error {
	ctx := context.Background()

	tag, err := config.PgxDB.Exec(ctx,
		`UPDATE organization_departments
		 SET is_active = false, updated_at = $3
		 WHERE id = $1 AND organization_id = $2`,
		departmentID, organizationID, time.Now(),
	)
	if err != nil {
		return fmt.Errorf("departments: delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("department not found")
	}
	return nil
}

// RestoreDepartment restores a soft deleted department.
func (s *DepartmentService) RestoreDepartment(organizationID, departmentID string) (*models.OrganizationDepartment, error) {
	ctx := context.Background()

	tag, err := config.PgxDB.Exec(ctx,
		`UPDATE organization_departments
		 SET is_active = true, updated_at = $3
		 WHERE id = $1 AND organization_id = $2`,
		departmentID, organizationID, time.Now(),
	)
	if err != nil {
		return nil, fmt.Errorf("departments: restore: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("department not found")
	}

	row, err := config.Queries.GetDepartmentByID(ctx, sqlc.GetDepartmentByIDParams{ID: departmentID})
	if err != nil {
		return nil, fmt.Errorf("departments: reload: %w", err)
	}
	d := toDepartmentModel(row)
	return &d, nil
}

// DepartmentExists checks if a department exists in the organization.
func (s *DepartmentService) DepartmentExists(organizationID, departmentID string) (bool, error) {
	ctx := context.Background()

	var count int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM organization_departments WHERE id = $1 AND organization_id = $2`,
		departmentID, organizationID,
	).Scan(&count); err != nil {
		return false, fmt.Errorf("departments: exists: %w", err)
	}
	return count > 0, nil
}

// DepartmentCodeExists checks if a department code already exists in the organization.
func (s *DepartmentService) DepartmentCodeExists(organizationID, code string) (bool, error) {
	ctx := context.Background()

	var count int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM organization_departments WHERE organization_id = $1 AND code = $2`,
		organizationID, code,
	).Scan(&count); err != nil {
		return false, fmt.Errorf("departments: code exists: %w", err)
	}
	return count > 0, nil
}

// DepartmentCodeExistsExcluding checks if a department code exists excluding a specific department.
func (s *DepartmentService) DepartmentCodeExistsExcluding(organizationID, code, excludeDepartmentID string) (bool, error) {
	ctx := context.Background()

	var count int64
	if err := config.PgxDB.QueryRow(ctx,
		`SELECT COUNT(*) FROM organization_departments
		 WHERE organization_id = $1 AND code = $2 AND id <> $3`,
		organizationID, code, excludeDepartmentID,
	).Scan(&count); err != nil {
		return false, fmt.Errorf("departments: code exists excluding: %w", err)
	}
	return count > 0, nil
}

// GetDepartmentModules retrieves modules assigned to a department.
//
// TODO: department_modules table is not present in 00001_core_schema.sql; this
// is a placeholder pending the module-assignment schema.
func (s *DepartmentService) GetDepartmentModules(organizationID, departmentID string) ([]interface{}, error) {
	return make([]interface{}, 0), nil
}

// AssignModuleToDepartment assigns a module to a department.
//
// TODO: department_modules table is not present in 00001_core_schema.sql.
func (s *DepartmentService) AssignModuleToDepartment(organizationID, departmentID, moduleID string) error {
	return nil
}

// RemoveModuleFromDepartment removes a module assignment from a department.
//
// TODO: department_modules table is not present in 00001_core_schema.sql.
func (s *DepartmentService) RemoveModuleFromDepartment(organizationID, departmentID, moduleID string) error {
	return nil
}
