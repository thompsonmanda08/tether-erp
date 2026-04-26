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

// UserService manages user lookups and per-organization membership/department
// assignments. All DB access goes through config.Queries / config.PgxDB.
//
// Caller breakage: NewUserService no longer accepts a *gorm.DB argument.
type UserService struct{}

// NewUserService constructs a UserService. The signature no longer takes any
// arguments — all DB access goes through config.Queries / config.PgxDB.
// Callers that previously passed a *gorm.DB must drop that argument.
func NewUserService() *UserService {
	return &UserService{}
}

// UserExistsInOrganization checks if a user exists and belongs to the organization
// as an active member.
func (s *UserService) UserExistsInOrganization(organizationID, userID string) (bool, error) {
	if organizationID == "" || userID == "" {
		return false, errors.New("organization ID and user ID are required")
	}
	ctx := context.Background()

	var count int64
	if err := config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM organization_members
		WHERE organization_id = $1 AND user_id = $2 AND active = true
	`, organizationID, userID).Scan(&count); err != nil {
		return false, fmt.Errorf("user_service: check membership: %w", err)
	}
	return count > 0, nil
}

// GetUserByEmail gets a user by email (for checking if user already exists).
// Returns the user if the email is taken globally — the UNIQUE constraint on
// users.email makes cross-org re-use impossible, so any match is a conflict.
// Returns (nil, nil) when the email is free.
func (s *UserService) GetUserByEmail(organizationID, email string) (*models.User, error) {
	if email == "" {
		return nil, errors.New("email is required")
	}
	ctx := context.Background()

	row, err := config.Queries.GetUserByEmail(ctx, sqlc.GetUserByEmailParams{Email: email})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("user_service: get user by email: %w", err)
	}
	return userFromSQLC(row), nil
}

// EmailLookupResult holds the result of a per-org email lookup.
type EmailLookupResult struct {
	User     *models.User // nil if no global account exists
	IsMember bool         // true if the user is already an active member of orgID
}

// LookupUserByEmailForOrg checks whether an email address belongs to an existing
// platform user, and whether that user is already a member of the given org.
// All three cases are distinguishable from the returned result:
//
//	result.User == nil                → email free, safe to create
//	result.User != nil && IsMember   → already a member, block creation
//	result.User != nil && !IsMember  → has a global account, offer invite flow
func (s *UserService) LookupUserByEmailForOrg(orgID, email string) (*EmailLookupResult, error) {
	if email == "" {
		return nil, errors.New("email is required")
	}
	ctx := context.Background()

	row, err := config.Queries.GetUserByEmail(ctx, sqlc.GetUserByEmailParams{Email: email})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &EmailLookupResult{}, nil
		}
		return nil, fmt.Errorf("user_service: lookup user by email: %w", err)
	}

	user := userFromSQLC(row)

	var memberCount int64
	if orgID != "" {
		if qerr := config.PgxDB.QueryRow(ctx, `
			SELECT COUNT(*) FROM organization_members
			WHERE organization_id = $1 AND user_id = $2 AND active = true
		`, orgID, user.ID).Scan(&memberCount); qerr != nil {
			// Fall back to non-member rather than failing the whole lookup —
			// the previous GORM implementation also ignored the count error.
			memberCount = 0
		}
	}

	return &EmailLookupResult{User: user, IsMember: memberCount > 0}, nil
}

// AssignUserToDepartment assigns a user to a department by setting
// department_id on their organization_members row.
func (s *UserService) AssignUserToDepartment(organizationID, userID, departmentID string) error {
	if organizationID == "" || userID == "" || departmentID == "" {
		return errors.New("organization ID, user ID, and department ID are required")
	}
	ctx := context.Background()

	tag, err := config.PgxDB.Exec(ctx, `
		UPDATE organization_members
		SET department_id = $3, updated_at = NOW()
		WHERE organization_id = $1 AND user_id = $2
	`, organizationID, userID, departmentID)
	if err != nil {
		return fmt.Errorf("user_service: assign department: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user_service: user not found in organization")
	}
	return nil
}

// GetUserDepartment retrieves the department assigned to a user. Returns
// (nil, nil) when the user has no department assigned.
func (s *UserService) GetUserDepartment(organizationID, userID string) (*models.OrganizationDepartment, error) {
	if organizationID == "" || userID == "" {
		return nil, errors.New("organization ID and user ID are required")
	}
	ctx := context.Background()

	const q = `
		SELECT od.id, od.organization_id, od.name, od.code, od.description,
		       od.parent_id, od.manager_name, od.is_active, od.created_at, od.updated_at
		FROM organization_departments od
		INNER JOIN organization_members om ON om.department_id = od.id
		WHERE om.organization_id = $1 AND om.user_id = $2 AND om.active = true
		LIMIT 1
	`

	var d sqlc.OrganizationDepartment
	if err := config.PgxDB.QueryRow(ctx, q, organizationID, userID).Scan(
		&d.ID, &d.OrganizationID, &d.Name, &d.Code, &d.Description,
		&d.ParentID, &d.ManagerName, &d.IsActive, &d.CreatedAt, &d.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("user_service: get user department: %w", err)
	}

	return departmentFromSQLC(d), nil
}

// RemoveUserFromDepartment clears the department assignment on the membership row.
func (s *UserService) RemoveUserFromDepartment(organizationID, userID string) error {
	if organizationID == "" || userID == "" {
		return errors.New("organization ID and user ID are required")
	}
	ctx := context.Background()

	tag, err := config.PgxDB.Exec(ctx, `
		UPDATE organization_members
		SET department_id = NULL, updated_at = NOW()
		WHERE organization_id = $1 AND user_id = $2
	`, organizationID, userID)
	if err != nil {
		return fmt.Errorf("user_service: remove from department: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user_service: user not found in organization")
	}
	return nil
}

// DepartmentUser represents a member listed for a department.
type DepartmentUser struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	Active       bool      `json:"active"`
	JoinedAt     time.Time `json:"joinedAt"`
	DepartmentID *string   `json:"departmentId"`
}

// GetDepartmentUsers retrieves all active users in a specific department.
func (s *UserService) GetDepartmentUsers(organizationID, departmentID string) ([]interface{}, error) {
	if organizationID == "" || departmentID == "" {
		return nil, errors.New("organization ID and department ID are required")
	}
	ctx := context.Background()

	const q = `
		SELECT u.id, u.email, u.name, om.role, u.active, om.joined_at, om.department_id
		FROM users u
		INNER JOIN organization_members om ON u.id = om.user_id
		WHERE om.organization_id = $1 AND om.department_id = $2 AND om.active = true
	`

	rows, err := config.PgxDB.Query(ctx, q, organizationID, departmentID)
	if err != nil {
		return nil, fmt.Errorf("user_service: list department users: %w", err)
	}
	defer rows.Close()

	out := []interface{}{}
	for rows.Next() {
		var (
			du           DepartmentUser
			joinedAt     *time.Time
			departmentID *string
		)
		if err := rows.Scan(&du.ID, &du.Email, &du.Name, &du.Role, &du.Active, &joinedAt, &departmentID); err != nil {
			return nil, fmt.Errorf("user_service: scan department user: %w", err)
		}
		if joinedAt != nil {
			du.JoinedAt = *joinedAt
		}
		du.DepartmentID = departmentID
		out = append(out, du)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("user_service: iter department users: %w", err)
	}
	return out, nil
}

// OrganizationUser represents a user listed within an organization with department info.
type OrganizationUser struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Name           string    `json:"name"`
	Role           string    `json:"role"`
	Active         bool      `json:"active"`
	JoinedAt       time.Time `json:"joinedAt"`
	DepartmentID   *string   `json:"departmentId"`
	DepartmentName *string   `json:"departmentName"`
	DepartmentCode *string   `json:"departmentCode"`
}

// GetUsersByOrganization retrieves all users in an organization with their
// department info, paginated.
func (s *UserService) GetUsersByOrganization(organizationID string, page, pageSize int) ([]interface{}, int64, error) {
	if organizationID == "" {
		return nil, 0, errors.New("organization ID is required")
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	ctx := context.Background()
	offset := (page - 1) * pageSize

	var total int64
	if err := config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM organization_members
		WHERE organization_id = $1 AND active = true
	`, organizationID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("user_service: count org users: %w", err)
	}

	const q = `
		SELECT u.id, u.email, u.name, om.role, u.active, om.joined_at,
		       om.department_id, od.name AS department_name, od.code AS department_code
		FROM users u
		INNER JOIN organization_members om ON u.id = om.user_id
		LEFT JOIN organization_departments od ON om.department_id = od.id
		WHERE om.organization_id = $1 AND om.active = true
		ORDER BY u.name ASC
		LIMIT $2 OFFSET $3
	`
	rows, err := config.PgxDB.Query(ctx, q, organizationID, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("user_service: list org users: %w", err)
	}
	defer rows.Close()

	out := []interface{}{}
	for rows.Next() {
		var (
			ou           OrganizationUser
			joinedAt     *time.Time
			departmentID *string
			deptName     *string
			deptCode     *string
		)
		if err := rows.Scan(&ou.ID, &ou.Email, &ou.Name, &ou.Role, &ou.Active,
			&joinedAt, &departmentID, &deptName, &deptCode); err != nil {
			return nil, 0, fmt.Errorf("user_service: scan org user: %w", err)
		}
		if joinedAt != nil {
			ou.JoinedAt = *joinedAt
		}
		ou.DepartmentID = departmentID
		ou.DepartmentName = deptName
		ou.DepartmentCode = deptCode
		out = append(out, ou)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("user_service: iter org users: %w", err)
	}
	return out, total, nil
}

// CreateUserInOrganization creates a new user and adds them to an organization
// in a single transaction. The password should already be hashed by the caller.
func (s *UserService) CreateUserInOrganization(organizationID string, email, name, password, role string, departmentID *string) (*models.User, error) {
	if organizationID == "" || email == "" || name == "" || password == "" {
		return nil, errors.New("organization ID, email, name and password are required")
	}
	if role == "" {
		role = "requester"
	}
	ctx := context.Background()

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("user_service: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	q := config.Queries.WithTx(tx)

	userID := fmt.Sprintf("user_%d", time.Now().UnixNano())
	orgIDPtr := organizationID

	created, err := q.CreateUser(ctx, sqlc.CreateUserParams{
		ID:                    userID,
		Email:                 email,
		Name:                  name,
		Password:              password,
		Role:                  role,
		Active:                true,
		CurrentOrganizationID: &orgIDPtr,
		IsSuperAdmin:          false,
		MustChangePassword:    false,
	})
	if err != nil {
		return nil, fmt.Errorf("user_service: create user: %w", err)
	}

	memberID := uuid.New().String()
	active := true
	now := time.Now()
	if _, err := tx.Exec(ctx, `
		INSERT INTO organization_members (
			id, organization_id, user_id, role, department_id, active, joined_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
	`, memberID, organizationID, userID, role, departmentID, active, now, now); err != nil {
		return nil, fmt.Errorf("user_service: add organization member: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("user_service: commit: %w", err)
	}

	return userFromSQLC(created), nil
}

// ----- helpers -----

func userFromSQLC(u sqlc.User) *models.User {
	out := &models.User{
		ID:                    u.ID,
		Email:                 u.Email,
		Name:                  u.Name,
		Password:              u.Password,
		Role:                  u.Role,
		Active:                u.Active,
		CurrentOrganizationID: u.CurrentOrganizationID,
		IsSuperAdmin:          u.IsSuperAdmin,
		MustChangePassword:    u.MustChangePassword,
		Preferences:           u.Preferences,
	}
	if u.Position != nil {
		out.Position = *u.Position
	}
	if u.ManNumber != nil {
		out.ManNumber = *u.ManNumber
	}
	if u.NrcNumber != nil {
		out.NrcNumber = *u.NrcNumber
	}
	if u.Contact != nil {
		out.Contact = *u.Contact
	}
	if u.LastLogin.Valid {
		t := u.LastLogin.Time
		out.LastLogin = &t
	}
	if u.CreatedAt.Valid {
		out.CreatedAt = u.CreatedAt.Time
	}
	if u.UpdatedAt.Valid {
		out.UpdatedAt = u.UpdatedAt.Time
	}
	if u.DeletedAt.Valid {
		t := u.DeletedAt.Time
		out.DeletedAt = &t
	}
	return out
}

func departmentFromSQLC(d sqlc.OrganizationDepartment) *models.OrganizationDepartment {
	out := &models.OrganizationDepartment{
		ID:             d.ID,
		OrganizationID: d.OrganizationID,
		Name:           d.Name,
		ParentID:       d.ParentID,
		IsActive:       d.IsActive,
	}
	if d.Code != nil {
		out.Code = *d.Code
	}
	if d.Description != nil {
		out.Description = *d.Description
	}
	if d.ManagerName != nil {
		out.ManagerName = *d.ManagerName
	}
	if d.CreatedAt.Valid {
		out.CreatedAt = d.CreatedAt.Time
	}
	if d.UpdatedAt.Valid {
		out.UpdatedAt = d.UpdatedAt.Time
	}
	return out
}
