package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gosimple/slug"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
)

// OrganizationService manages organizations, settings, members, and related
// reads/writes. It uses the package-global sqlc Queries handle and pgxpool
// pool from the config package.
type OrganizationService struct {
	cache *CacheService
}

// NewOrganizationService constructs a service. The signature no longer takes
// any arguments — all DB access goes through config.Queries / config.PgxDB.
// Callers that previously passed a *gorm.DB must drop that argument.
func NewOrganizationService() *OrganizationService {
	return &OrganizationService{
		cache: NewCacheService(time.Minute * 10),
	}
}

// CreateOrganization creates an organization, default settings, and adds the
// creator as the first admin member, all in a single transaction.
func (s *OrganizationService) CreateOrganization(name, description, logoURL, createdBy string) (*models.Organization, error) {
	if name == "" {
		return nil, errors.New("organization name is required")
	}
	if createdBy == "" {
		return nil, errors.New("creator user ID is required")
	}

	ctx := context.Background()
	orgID := uuid.New().String()
	creator := createdBy
	active := true

	// Optional pointer fields
	var descPtr *string
	if description != "" {
		descPtr = &description
	}
	var logoPtr *string
	if logoURL != "" {
		logoPtr = &logoURL
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("organization_service: create begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	q := config.Queries.WithTx(tx)

	row, err := q.CreateOrganization(ctx, sqlc.CreateOrganizationParams{
		ID:          orgID,
		Name:        name,
		Slug:        slug.Make(name),
		Description: descPtr,
		LogoUrl:     logoPtr,
		Active:      &active,
		CreatedBy:   &creator,
	})
	if err != nil {
		return nil, fmt.Errorf("organization_service: create organization: %w", err)
	}

	// Default settings — best-effort. Defaults match the previous
	// hard-coded values in GetOrganizationSettings.
	defaultCurrency := "USD"
	defaultFY := int32(1)
	defaultProcurement := "goods_first"
	enableBudget := false
	requireSig := false
	defaultThreshold := decimal.NewFromInt(0)
	if _, err := q.UpsertOrganizationSettings(ctx, sqlc.UpsertOrganizationSettingsParams{
		ID:                       uuid.New().String(),
		OrganizationID:           orgID,
		RequireDigitalSignatures: &requireSig,
		Currency:                 &defaultCurrency,
		FiscalYearStart:          &defaultFY,
		EnableBudgetValidation:   &enableBudget,
		BudgetVarianceThreshold:  &defaultThreshold,
		ProcurementFlow:          &defaultProcurement,
	}); err != nil {
		return nil, fmt.Errorf("organization_service: create default settings: %w", err)
	}

	now := time.Now()
	if _, err := q.AddMember(ctx, sqlc.AddMemberParams{
		ID:             uuid.New().String(),
		OrganizationID: orgID,
		UserID:         createdBy,
		Role:           "admin",
		Active:         &active,
		JoinedAt:       pgtype.Timestamptz{Time: now, Valid: true},
	}); err != nil {
		return nil, fmt.Errorf("organization_service: add admin member: %w", err)
	}

	// Set as current organization for creator
	if _, err := tx.Exec(ctx,
		`UPDATE users SET current_organization_id = $1, updated_at = NOW() WHERE id = $2`,
		orgID, createdBy,
	); err != nil {
		return nil, fmt.Errorf("organization_service: set current organization: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("organization_service: commit: %w", err)
	}

	s.cache.InvalidateUserCache(createdBy)
	return sqlcToOrganization(row), nil
}

// GetOrganization retrieves an active organization by ID.
func (s *OrganizationService) GetOrganization(orgID string) (*models.Organization, error) {
	if orgID == "" {
		return nil, errors.New("organization ID is required")
	}
	ctx := context.Background()

	row, err := config.Queries.GetOrganizationByID(ctx, sqlc.GetOrganizationByIDParams{ID: orgID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("organization not found")
		}
		return nil, fmt.Errorf("organization_service: get organization: %w", err)
	}
	if row.Active != nil && !*row.Active {
		return nil, errors.New("organization not found")
	}
	return sqlcToOrganization(row), nil
}

// GetUserOrganizations returns all active organizations a user belongs to,
// using the in-memory cache.
func (s *OrganizationService) GetUserOrganizations(userID string) ([]models.Organization, error) {
	if userID == "" {
		return nil, errors.New("user ID is required")
	}

	return s.cache.GetUserOrganizations(userID, func() ([]models.Organization, error) {
		ctx := context.Background()
		rows, err := config.PgxDB.Query(ctx, `
			SELECT DISTINCT o.id, o.name, o.slug, o.description, o.logo_url, o.primary_color,
			       o.active, o.tagline, o.created_by, o.created_at, o.updated_at
			FROM organizations o
			INNER JOIN organization_members om ON o.id = om.organization_id
			WHERE om.user_id = $1
			  AND om.active = true
			  AND o.active = true
		`, userID)
		if err != nil {
			return nil, fmt.Errorf("organization_service: list user organizations: %w", err)
		}
		defer rows.Close()

		out := []models.Organization{}
		for rows.Next() {
			var o sqlc.Organization
			if err := rows.Scan(
				&o.ID, &o.Name, &o.Slug, &o.Description, &o.LogoUrl, &o.PrimaryColor,
				&o.Active, &o.Tagline, &o.CreatedBy, &o.CreatedAt, &o.UpdatedAt,
			); err != nil {
				return nil, fmt.Errorf("organization_service: scan org: %w", err)
			}
			out = append(out, *sqlcToOrganization(o))
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("organization_service: rows iter: %w", err)
		}
		return out, nil
	})
}

// AddMember adds a user to an organization.
func (s *OrganizationService) AddMember(orgID, userID, role string) error {
	return s.AddMemberWithDepartment(orgID, userID, role, nil)
}

// AddMemberWithDepartment adds a user with optional department.
// If the (org, user) pair already exists, it reactivates and updates instead.
func (s *OrganizationService) AddMemberWithDepartment(orgID, userID, role string, departmentID *string) error {
	if orgID == "" || userID == "" {
		return errors.New("organization ID and user ID are required")
	}
	if role == "" {
		role = "requester"
	}
	ctx := context.Background()

	existing, err := config.Queries.GetMember(ctx, sqlc.GetMemberParams{
		OrganizationID: orgID,
		UserID:         userID,
	})
	if err == nil {
		// Already a member — re-activate and update role/department
		active := true
		if _, uerr := config.Queries.UpdateMember(ctx, sqlc.UpdateMemberParams{
			ID:           existing.ID,
			Role:         role,
			DepartmentID: departmentID,
			Active:       &active,
		}); uerr != nil {
			return fmt.Errorf("organization_service: reactivate member: %w", uerr)
		}
		s.cache.InvalidateUserCache(userID)
		s.cache.InvalidateOrganizationCache(orgID)
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("organization_service: lookup member: %w", err)
	}

	now := time.Now()
	active := true
	if _, err := config.Queries.AddMember(ctx, sqlc.AddMemberParams{
		ID:             uuid.New().String(),
		OrganizationID: orgID,
		UserID:         userID,
		Role:           role,
		DepartmentID:   departmentID,
		Active:         &active,
		JoinedAt:       pgtype.Timestamptz{Time: now, Valid: true},
	}); err != nil {
		return fmt.Errorf("organization_service: add member: %w", err)
	}

	s.cache.InvalidateUserCache(userID)
	s.cache.InvalidateOrganizationCache(orgID)
	return nil
}

// RemoveMember soft-removes a member. Refuses to remove the last admin.
func (s *OrganizationService) RemoveMember(orgID, userID string) error {
	if orgID == "" || userID == "" {
		return errors.New("organization ID and user ID are required")
	}
	ctx := context.Background()

	var adminCount int64
	if err := config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM organization_members
		WHERE organization_id = $1 AND role = 'admin' AND active = true AND user_id != $2
	`, orgID, userID).Scan(&adminCount); err != nil {
		return fmt.Errorf("organization_service: count admins: %w", err)
	}
	if adminCount == 0 {
		return errors.New("cannot remove the last admin from organization")
	}

	if _, err := config.PgxDB.Exec(ctx, `
		UPDATE organization_members SET active = false, updated_at = NOW()
		WHERE organization_id = $1 AND user_id = $2
	`, orgID, userID); err != nil {
		return fmt.Errorf("organization_service: deactivate member: %w", err)
	}

	s.cache.InvalidateUserCache(userID)
	s.cache.InvalidateOrganizationCache(orgID)
	return nil
}

// GetOrganizationMembers returns all active members enriched with role/department names.
func (s *OrganizationService) GetOrganizationMembers(orgID string) ([]models.OrganizationMember, error) {
	if orgID == "" {
		return nil, errors.New("organization ID is required")
	}
	ctx := context.Background()
	activeOnly := true

	rows, err := config.Queries.ListMembers(ctx, sqlc.ListMembersParams{
		OrganizationID: orgID,
		Column2:        activeOnly,
		Limit:          1000,
		Offset:         0,
	})
	if err != nil {
		return nil, fmt.Errorf("organization_service: list members: %w", err)
	}

	members := make([]models.OrganizationMember, 0, len(rows))
	for _, r := range rows {
		m := sqlcToMember(r)

		// Enrich department name
		if m.DepartmentID != nil && *m.DepartmentID != "" {
			if dep, derr := config.Queries.GetDepartmentByID(ctx, sqlc.GetDepartmentByIDParams{ID: *m.DepartmentID}); derr == nil && dep.OrganizationID == orgID {
				m.Department = dep.Name
			}
		}

		// Enrich role name/id (Role can be a UUID or a role name)
		if len(m.Role) == 36 && strings.Contains(m.Role, "-") {
			if pgID, perr := parsePgUUID(m.Role); perr == nil {
				if role, rerr := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{ID: pgID}); rerr == nil {
					if role.OrganizationID == nil || *role.OrganizationID == orgID || *role.OrganizationID == "" {
						m.RoleName = role.Name
						m.RoleID = m.Role
						m.Role = role.Name
					}
				}
			}
		} else {
			orgIDPtr := orgID
			if role, rerr := config.Queries.GetOrganizationRoleByName(ctx, sqlc.GetOrganizationRoleByNameParams{
				OrganizationID: &orgIDPtr,
				Name:           m.Role,
			}); rerr == nil {
				m.RoleName = role.Name
				m.RoleID = uuidFromPg(role.ID).String()
			} else {
				m.RoleName = m.Role
				m.RoleID = ""
			}
		}

		members = append(members, m)
	}
	return members, nil
}

// SwitchOrganization sets the user's current organization, validating membership.
func (s *OrganizationService) SwitchOrganization(userID, orgID string) error {
	if userID == "" || orgID == "" {
		return errors.New("user ID and organization ID are required")
	}
	ctx := context.Background()

	mem, err := config.Queries.GetMember(ctx, sqlc.GetMemberParams{
		OrganizationID: orgID,
		UserID:         userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("user is not a member of this organization")
		}
		return fmt.Errorf("organization_service: lookup member: %w", err)
	}
	if mem.Active == nil || !*mem.Active {
		return errors.New("user is not a member of this organization")
	}

	org, err := config.Queries.GetOrganizationByID(ctx, sqlc.GetOrganizationByIDParams{ID: orgID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("organization not found or is inactive")
		}
		return fmt.Errorf("organization_service: lookup organization: %w", err)
	}
	if org.Active == nil || !*org.Active {
		return errors.New("organization not found or is inactive")
	}

	if _, err := config.PgxDB.Exec(ctx,
		`UPDATE users SET current_organization_id = $1, updated_at = NOW() WHERE id = $2`,
		orgID, userID,
	); err != nil {
		return fmt.Errorf("organization_service: set current organization: %w", err)
	}
	return nil
}

// UpdateOrganizationSettings upserts organization configuration.
func (s *OrganizationService) UpdateOrganizationSettings(orgID string, settings *models.OrganizationSettings) error {
	if orgID == "" {
		return errors.New("organization ID is required")
	}
	if settings == nil {
		return errors.New("settings payload is required")
	}
	ctx := context.Background()

	// Look up existing for ID + insert new if missing
	existing, err := config.Queries.GetOrganizationSettings(ctx, sqlc.GetOrganizationSettingsParams{OrganizationID: orgID})
	settingsID := uuid.New().String()
	if err == nil {
		settingsID = existing.ID
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("organization_service: lookup settings: %w", err)
	}

	requireSig := settings.RequireDigitalSignatures
	defaultChain := settings.DefaultApprovalChain
	currency := settings.Currency
	fy := int32(settings.FiscalYearStart)
	enableBudget := settings.EnableBudgetValidation
	threshold := decimal.NewFromFloat(settings.BudgetVarianceThreshold)
	procurement := settings.ProcurementFlow

	_, err = config.Queries.UpsertOrganizationSettings(ctx, sqlc.UpsertOrganizationSettingsParams{
		ID:                       settingsID,
		OrganizationID:           orgID,
		RequireDigitalSignatures: &requireSig,
		DefaultApprovalChain:     &defaultChain,
		Currency:                 &currency,
		FiscalYearStart:          &fy,
		EnableBudgetValidation:   &enableBudget,
		BudgetVarianceThreshold:  &threshold,
		ProcurementFlow:          &procurement,
	})
	if err != nil {
		return fmt.Errorf("organization_service: upsert settings: %w", err)
	}
	return nil
}

// GetOrganizationSettings retrieves settings, returning defaults if not yet stored.
func (s *OrganizationService) GetOrganizationSettings(orgID string) (*models.OrganizationSettings, error) {
	if orgID == "" {
		return nil, errors.New("organization ID is required")
	}
	ctx := context.Background()

	row, err := config.Queries.GetOrganizationSettings(ctx, sqlc.GetOrganizationSettingsParams{OrganizationID: orgID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &models.OrganizationSettings{
				ID:              uuid.New().String(),
				OrganizationID:  orgID,
				Currency:        "USD",
				FiscalYearStart: 1,
				ProcurementFlow: "goods_first",
			}, nil
		}
		return nil, fmt.Errorf("organization_service: get settings: %w", err)
	}
	return sqlcToSettings(row), nil
}

// UpdateOrganization updates name/description/logo/tagline.
func (s *OrganizationService) UpdateOrganization(orgID string, name, description string, logoURL *string, tagline *string) error {
	if orgID == "" {
		return errors.New("organization ID is required")
	}
	if name == "" {
		return errors.New("organization name is required")
	}
	ctx := context.Background()

	slugStr := slug.Make(name)
	descPtr := &description
	if _, err := config.Queries.UpdateOrganization(ctx, sqlc.UpdateOrganizationParams{
		ID:          orgID,
		Name:        name,
		Slug:        slugStr,
		Description: descPtr,
		LogoUrl:     logoURL,
		Tagline:     tagline,
	}); err != nil {
		return fmt.Errorf("organization_service: update organization: %w", err)
	}
	return nil
}

// DeleteOrganization soft-deletes an org and all related members atomically.
func (s *OrganizationService) DeleteOrganization(orgID, userID string) error {
	if orgID == "" {
		return errors.New("organization ID is required")
	}
	if userID == "" {
		return errors.New("user ID is required")
	}
	ctx := context.Background()

	// Verify caller is admin
	mem, err := config.Queries.GetMember(ctx, sqlc.GetMemberParams{
		OrganizationID: orgID,
		UserID:         userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("user is not an admin of this organization")
		}
		return fmt.Errorf("organization_service: lookup member: %w", err)
	}
	if mem.Role != "admin" || mem.Active == nil || !*mem.Active {
		return errors.New("user is not an admin of this organization")
	}

	org, err := config.Queries.GetOrganizationByID(ctx, sqlc.GetOrganizationByIDParams{ID: orgID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("organization not found or already deleted")
		}
		return fmt.Errorf("organization_service: lookup organization: %w", err)
	}
	if org.Active == nil || !*org.Active {
		return errors.New("organization not found or already deleted")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("organization_service: delete begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	q := config.Queries.WithTx(tx)
	if err := q.SoftDeleteOrganization(ctx, sqlc.SoftDeleteOrganizationParams{ID: orgID}); err != nil {
		return fmt.Errorf("organization_service: soft delete organization: %w", err)
	}
	if _, err := tx.Exec(ctx,
		`UPDATE organization_members SET active = false, updated_at = NOW() WHERE organization_id = $1`,
		orgID,
	); err != nil {
		return fmt.Errorf("organization_service: deactivate members: %w", err)
	}
	if _, err := tx.Exec(ctx,
		`UPDATE users SET current_organization_id = NULL, updated_at = NOW() WHERE current_organization_id = $1`,
		orgID,
	); err != nil {
		return fmt.Errorf("organization_service: clear current org pointers: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("organization_service: commit delete: %w", err)
	}
	return nil
}

// CanUserManageOrganization returns true if the user is an active admin.
func (s *OrganizationService) CanUserManageOrganization(userID, orgID string) (bool, error) {
	if userID == "" || orgID == "" {
		return false, errors.New("user ID and organization ID are required")
	}
	ctx := context.Background()

	var count int64
	if err := config.PgxDB.QueryRow(ctx, `
		SELECT COUNT(*) FROM organization_members
		WHERE user_id = $1 AND organization_id = $2 AND role = 'admin' AND active = true
	`, userID, orgID).Scan(&count); err != nil {
		return false, fmt.Errorf("organization_service: count admin membership: %w", err)
	}
	return count > 0, nil
}

// ----- helpers -----

func sqlcToOrganization(o sqlc.Organization) *models.Organization {
	out := &models.Organization{
		ID:   o.ID,
		Name: o.Name,
		Slug: o.Slug,
	}
	if o.Description != nil {
		out.Description = *o.Description
	}
	if o.LogoUrl != nil {
		out.LogoURL = *o.LogoUrl
	}
	if o.Tagline != nil {
		out.Tagline = *o.Tagline
	}
	if o.PrimaryColor != nil {
		out.PrimaryColor = *o.PrimaryColor
	}
	if o.Active != nil {
		out.Active = *o.Active
	}
	if o.CreatedBy != nil {
		out.CreatedBy = *o.CreatedBy
	}
	if o.CreatedAt.Valid {
		out.CreatedAt = o.CreatedAt.Time
	}
	if o.UpdatedAt.Valid {
		out.UpdatedAt = o.UpdatedAt.Time
	}
	return out
}

func sqlcToSettings(s sqlc.OrganizationSetting) *models.OrganizationSettings {
	out := &models.OrganizationSettings{
		ID:             s.ID,
		OrganizationID: s.OrganizationID,
	}
	if s.RequireDigitalSignatures != nil {
		out.RequireDigitalSignatures = *s.RequireDigitalSignatures
	}
	if s.DefaultApprovalChain != nil {
		out.DefaultApprovalChain = *s.DefaultApprovalChain
	}
	if s.Currency != nil {
		out.Currency = *s.Currency
	}
	if s.FiscalYearStart != nil {
		out.FiscalYearStart = int(*s.FiscalYearStart)
	}
	if s.EnableBudgetValidation != nil {
		out.EnableBudgetValidation = *s.EnableBudgetValidation
	}
	if s.BudgetVarianceThreshold != nil {
		f, _ := s.BudgetVarianceThreshold.Float64()
		out.BudgetVarianceThreshold = f
	}
	if s.ProcurementFlow != nil {
		out.ProcurementFlow = *s.ProcurementFlow
	}
	if s.CreatedAt.Valid {
		out.CreatedAt = s.CreatedAt.Time
	}
	if s.UpdatedAt.Valid {
		out.UpdatedAt = s.UpdatedAt.Time
	}
	return out
}

func sqlcToMember(m sqlc.OrganizationMember) models.OrganizationMember {
	out := models.OrganizationMember{
		ID:                m.ID,
		OrganizationID:    m.OrganizationID,
		UserID:            m.UserID,
		Role:              m.Role,
		DepartmentID:      m.DepartmentID,
		BranchID:          m.BranchID,
		InvitedBy:         m.InvitedBy,
		CustomPermissions: m.CustomPermissions,
	}
	if m.Department != nil {
		out.Department = *m.Department
	}
	if m.Title != nil {
		out.Title = *m.Title
	}
	if m.Active != nil {
		out.Active = *m.Active
	}
	if m.InvitedAt.Valid {
		t := m.InvitedAt.Time
		out.InvitedAt = &t
	}
	if m.JoinedAt.Valid {
		t := m.JoinedAt.Time
		out.JoinedAt = &t
	}
	if m.CreatedAt.Valid {
		out.CreatedAt = m.CreatedAt.Time
	}
	if m.UpdatedAt.Valid {
		out.UpdatedAt = m.UpdatedAt.Time
	}
	return out
}

func parsePgUUID(s string) (pgtype.UUID, error) {
	id, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return pgtype.UUID{Bytes: id, Valid: true}, nil
}

func uuidFromPg(p pgtype.UUID) uuid.UUID {
	if !p.Valid {
		return uuid.Nil
	}
	return uuid.UUID(p.Bytes)
}
