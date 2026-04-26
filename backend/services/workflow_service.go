package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
	"github.com/tether-erp/repository"
)

// WorkflowService handles workflow business logic.
//
// Migrated off GORM: workflow CRUD and ancillary lookups (workflow_defaults,
// workflow_assignments, organization_roles) all go through the package-global
// sqlc Queries handle (config.Queries) or direct pgx execution against
// config.PgxDB. The repository.WorkflowRepositoryInterface (already
// sqlc-backed) is still used for first-class workflow reads/writes.
type WorkflowService struct {
	workflowRepo repository.WorkflowRepositoryInterface
	auditService *AuditService
}

// CreateWorkflowRequest represents a workflow creation request
type CreateWorkflowRequest struct {
	Name         string                     `json:"name" validate:"required"`
	Description  string                     `json:"description"`
	EntityType   string                     `json:"entityType"`   // Primary field (no longer required in validation)
	DocumentType string                     `json:"documentType"` // Legacy support
	Stages       []models.WorkflowStage     `json:"stages" validate:"required"`
	Conditions   *models.WorkflowConditions `json:"conditions"`
	IsDefault    bool                       `json:"isDefault"`
}

// UpdateWorkflowRequest represents a workflow update request
type UpdateWorkflowRequest struct {
	Name        *string                    `json:"name"`
	Description *string                    `json:"description"`
	Stages      []models.WorkflowStage     `json:"stages"`
	Conditions  *models.WorkflowConditions `json:"conditions"`
	IsDefault   *bool                      `json:"isDefault"`
}

// WorkflowListFilter represents filters for listing workflows
type WorkflowListFilter struct {
	EntityType string `json:"entityType"`
	IsActive   *bool  `json:"isActive"`
	IsDefault  *bool  `json:"isDefault"`
}

// NewWorkflowService creates a new workflow service.
//
// The previous *gorm.DB parameter has been removed as part of the
// GORM → sqlc + pgxpool migration; ad-hoc DB access goes through
// config.PgxDB / config.Queries.
func NewWorkflowService(workflowRepo repository.WorkflowRepositoryInterface, auditService *AuditService) *WorkflowService {
	return &WorkflowService{
		workflowRepo: workflowRepo,
		auditService: auditService,
	}
}

// normalizeStageRoles converts any system role UUID stored in RequiredRole back
// to the role's name string. System role UUIDs are environment-specific (created
// with uuid.New() on each fresh DB) so storing them is fragile. Custom org role
// UUIDs are stable per org and should remain as UUIDs.
func (s *WorkflowService) normalizeStageRoles(ctx context.Context, stages []models.WorkflowStage) {
	if config.Queries == nil {
		return
	}
	for i, stage := range stages {
		if stage.RequiredRole == "" {
			continue
		}
		parsed, err := uuid.Parse(stage.RequiredRole)
		if err != nil {
			continue // already a name string — nothing to do
		}
		role, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
			ID: pgtype.UUID{Bytes: parsed, Valid: true},
		})
		if err != nil {
			continue // role not found — leave as-is
		}
		isSystem := role.IsSystemRole != nil && *role.IsSystemRole
		if isSystem {
			stages[i].RequiredRole = role.Name // normalize UUID → stable name
		}
		// Custom org role UUID stays as UUID — correct
	}
}

// CreateWorkflow creates a new workflow
func (s *WorkflowService) CreateWorkflow(ctx context.Context, organizationID, userID string, req CreateWorkflowRequest) (*models.Workflow, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_service: pgx pool not initialized")
	}

	// Validate request
	if err := s.validateCreateRequest(req); err != nil {
		return nil, fmt.Errorf("workflow_service: validate create: %w", err)
	}

	// Normalize entity type to lowercase for consistency
	req.EntityType = strings.ToLower(req.EntityType)

	// Start transaction
	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("workflow_service: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Check if this is the first workflow for this entity type (case-insensitive).
	// We use raw SQL inside the transaction to keep the count consistent with
	// the subsequent inserts.
	var existingCount int64
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflows WHERE organization_id = $1 AND LOWER(entity_type) = $2 AND deleted_at IS NULL`,
		organizationID, req.EntityType,
	).Scan(&existingCount); err != nil {
		return nil, fmt.Errorf("workflow_service: count existing workflows: %w", err)
	}

	// If this is the first workflow for this entity type, make it default
	isFirstWorkflow := existingCount == 0
	if isFirstWorkflow {
		req.IsDefault = true
	}

	// If this is set as default, unset other defaults for the same entity type
	if req.IsDefault {
		if err := s.unsetDefaultWorkflowsTx(ctx, tx, organizationID, req.EntityType); err != nil {
			return nil, fmt.Errorf("workflow_service: unset existing defaults: %w", err)
		}
	}

	// Build stages JSON (normalize role UUIDs → names first).
	s.normalizeStageRoles(ctx, req.Stages)
	stagesJSON, err := json.Marshal(req.Stages)
	if err != nil {
		return nil, fmt.Errorf("workflow_service: marshal stages: %w", err)
	}

	// Build conditions JSON (may be nil).
	var conditionsJSON []byte
	if req.Conditions != nil {
		if conditionsJSON, err = json.Marshal(req.Conditions); err != nil {
			return nil, fmt.Errorf("workflow_service: marshal conditions: %w", err)
		}
	}

	now := time.Now()
	workflowID := uuid.New()

	// Insert workflow row directly so we can set both entity_type and
	// document_type (sqlc.CreateWorkflow only sets document_type) plus
	// is_default and conditions in a single statement.
	if _, err := tx.Exec(ctx, `
		INSERT INTO workflows (
			id, organization_id, name, description, document_type, entity_type,
			version, stages, conditions, is_active, is_default, created_by,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $5, 1, $6, $7, true, $8, $9, $10, $10
		)`,
		workflowID, organizationID, req.Name, req.Description, req.EntityType,
		stagesJSON, conditionsJSON, req.IsDefault, userID, now,
	); err != nil {
		return nil, fmt.Errorf("workflow_service: create workflow: %w", err)
	}

	// Create default workflow record if needed
	if req.IsDefault {
		if _, err := tx.Exec(ctx, `
			INSERT INTO workflow_defaults (
				id, organization_id, entity_type, default_workflow_id,
				default_workflow_version, set_by, set_at
			) VALUES ($1, $2, $3, $4, 1, $5, $6)`,
			uuid.New().String(), organizationID, req.EntityType, workflowID,
			userID, now,
		); err != nil {
			return nil, fmt.Errorf("workflow_service: create default record: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("workflow_service: commit: %w", err)
	}

	// Build the returned model from in-memory state (avoids a re-read).
	workflow := &models.Workflow{
		ID:             workflowID,
		OrganizationID: organizationID,
		Name:           req.Name,
		Description:    req.Description,
		DocumentType:   req.EntityType,
		EntityType:     req.EntityType,
		Version:        1,
		IsActive:       true,
		IsDefault:      req.IsDefault,
		Stages:         json.RawMessage(stagesJSON),
		Conditions:     json.RawMessage(conditionsJSON),
		CreatedBy:      userID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Load computed fields
	s.loadComputedFields(ctx, workflow)

	// Log audit event
	if s.auditService != nil {
		details := fmt.Sprintf("Created workflow '%s' for entity type '%s' with %d stages", req.Name, req.EntityType, len(req.Stages))
		if isFirstWorkflow {
			details += " (automatically set as default - first workflow for this entity type)"
		} else if req.IsDefault {
			details += " (set as default workflow)"
		}
		s.auditService.LogEvent(ctx, userID, organizationID, "workflow_created", "workflow", workflow.ID.String(), details, "", "")
	}

	return workflow, nil
}

// GetWorkflow retrieves a workflow by ID
func (s *WorkflowService) GetWorkflow(ctx context.Context, id uuid.UUID, organizationID string) (*models.Workflow, error) {
	if config.Queries == nil {
		return nil, errors.New("workflow_service: queries not initialized")
	}

	row, err := config.Queries.GetWorkflowByID(ctx, sqlc.GetWorkflowByIDParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("workflow not found")
		}
		return nil, fmt.Errorf("workflow_service: get workflow: %w", err)
	}

	workflow := sqlcWorkflowToModel(row)
	s.loadComputedFields(ctx, workflow)
	return workflow, nil
}

// GetWorkflowByStringID retrieves a workflow by string ID (for frontend compatibility)
func (s *WorkflowService) GetWorkflowByStringID(ctx context.Context, id string, organizationID string) (*models.Workflow, error) {
	workflowID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("invalid workflow ID format")
	}
	return s.GetWorkflow(ctx, workflowID, organizationID)
}

// UpdateWorkflow updates an existing workflow in place.
//
// Note: sqlc's UpdateWorkflow query only updates name/description/stages.
// We need to update is_default and conditions as well, so we issue a single
// dynamic UPDATE inside a pgx transaction.
func (s *WorkflowService) UpdateWorkflow(ctx context.Context, id uuid.UUID, organizationID, userID string, req UpdateWorkflowRequest) (*models.Workflow, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_service: pgx pool not initialized")
	}

	// Get existing workflow (used for validation and audit)
	existing, err := s.GetWorkflow(ctx, id, organizationID)
	if err != nil {
		return nil, err
	}

	// Normalize stage roles ahead of time (uses the read pool — non-tx).
	if req.Stages != nil {
		s.normalizeStageRoles(ctx, req.Stages)
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("workflow_service: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Apply updates as a dynamic UPDATE — keep the field set deterministic by
	// including every column we may touch and using COALESCE for nil values.
	var (
		newName, newDesc *string
		newStages, newConditions []byte
		newIsDefault             *bool
	)
	if req.Name != nil {
		newName = req.Name
	}
	if req.Description != nil {
		newDesc = req.Description
	}
	if req.Stages != nil {
		newStages, err = json.Marshal(req.Stages)
		if err != nil {
			return nil, fmt.Errorf("workflow_service: marshal stages: %w", err)
		}
	}
	if req.Conditions != nil {
		newConditions, err = json.Marshal(req.Conditions)
		if err != nil {
			return nil, fmt.Errorf("workflow_service: marshal conditions: %w", err)
		}
	}
	if req.IsDefault != nil {
		newIsDefault = req.IsDefault
		// If setting as default, unset other defaults first
		if *req.IsDefault && !existing.IsDefault {
			if err := s.unsetDefaultWorkflowsTx(ctx, tx, organizationID, existing.EntityType); err != nil {
				return nil, fmt.Errorf("workflow_service: unset existing defaults: %w", err)
			}
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE workflows SET
			name        = COALESCE($3, name),
			description = COALESCE($4, description),
			stages      = COALESCE($5, stages),
			conditions  = COALESCE($6, conditions),
			is_default  = COALESCE($7, is_default),
			updated_at  = NOW()
		WHERE id = $1 AND organization_id = $2`,
		id, organizationID, newName, newDesc, newStages, newConditions, newIsDefault,
	); err != nil {
		return nil, fmt.Errorf("workflow_service: update workflow: %w", err)
	}

	// Re-read in the same tx to return a consistent view.
	updated, err := s.readWorkflowTx(ctx, tx, id, organizationID)
	if err != nil {
		return nil, fmt.Errorf("workflow_service: reload updated workflow: %w", err)
	}

	if err := updated.Validate(); err != nil {
		return nil, fmt.Errorf("workflow_service: validate updated workflow: %w", err)
	}

	// Update default workflow record if needed
	if req.IsDefault != nil && *req.IsDefault {
		if err := s.updateDefaultWorkflowTx(ctx, tx, organizationID, updated); err != nil {
			return nil, fmt.Errorf("workflow_service: update default workflow: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("workflow_service: commit: %w", err)
	}

	// Load computed fields outside the tx
	s.loadComputedFields(ctx, updated)

	if s.auditService != nil {
		details := fmt.Sprintf("Updated workflow '%s'", updated.Name)
		s.auditService.LogEvent(ctx, userID, organizationID, "workflow_updated", "workflow", updated.ID.String(), details, "", "")
	}

	return updated, nil
}

// ListWorkflows retrieves workflows with filtering and pagination.
//
// Backed by sqlc.ListWorkflowsByOrg / CountWorkflowsByOrg which support
// optional is_active and document_type filters.
func (s *WorkflowService) ListWorkflows(ctx context.Context, organizationID string, entityType string, activeOnly bool, limit, offset int) ([]*models.Workflow, int64, error) {
	if config.Queries == nil {
		return nil, 0, errors.New("workflow_service: queries not initialized")
	}

	docType := strings.ToLower(entityType)

	total, err := config.Queries.CountWorkflowsByOrg(ctx, sqlc.CountWorkflowsByOrgParams{
		OrganizationID: organizationID,
		Column2:        activeOnly, // is_active filter when true
		Column3:        docType,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("workflow_service: count workflows: %w", err)
	}

	rows, err := config.Queries.ListWorkflowsByOrg(ctx, sqlc.ListWorkflowsByOrgParams{
		OrganizationID: organizationID,
		Column2:        activeOnly,
		Column3:        docType,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return nil, 0, fmt.Errorf("workflow_service: list workflows: %w", err)
	}

	workflows := make([]*models.Workflow, 0, len(rows))
	for i := range rows {
		w := sqlcWorkflowToModel(rows[i])
		s.loadComputedFields(ctx, w)
		workflows = append(workflows, w)
	}
	return workflows, total, nil
}

// GetWorkflows retrieves workflows with optional filters (for frontend compatibility).
func (s *WorkflowService) GetWorkflows(ctx context.Context, organizationID string, filter WorkflowListFilter) ([]models.Workflow, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_service: pgx pool not initialized")
	}

	// We use a single pgx query so we can express the optional is_default
	// filter (sqlc generated query only supports is_active + document_type).
	var (
		args []interface{}
		i    = 1
	)
	q := `SELECT id, organization_id, name, description, document_type, entity_type, version, stages, conditions, is_active, is_default, created_by, deleted_at, created_at, updated_at
		FROM workflows
		WHERE organization_id = $1 AND deleted_at IS NULL`
	args = append(args, organizationID)
	i++

	if filter.EntityType != "" {
		q += fmt.Sprintf(" AND entity_type = $%d", i)
		args = append(args, filter.EntityType)
		i++
	}
	if filter.IsActive != nil {
		q += fmt.Sprintf(" AND is_active = $%d", i)
		args = append(args, *filter.IsActive)
		i++
	}
	if filter.IsDefault != nil {
		q += fmt.Sprintf(" AND is_default = $%d", i)
		args = append(args, *filter.IsDefault)
		i++
	}
	q += " ORDER BY created_at DESC"

	rows, err := config.PgxDB.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("workflow_service: list workflows: %w", err)
	}
	defer rows.Close()

	workflows := []models.Workflow{}
	for rows.Next() {
		var r sqlc.Workflow
		if err := rows.Scan(
			&r.ID, &r.OrganizationID, &r.Name, &r.Description, &r.DocumentType, &r.EntityType,
			&r.Version, &r.Stages, &r.Conditions, &r.IsActive, &r.IsDefault, &r.CreatedBy,
			&r.DeletedAt, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("workflow_service: scan workflow: %w", err)
		}
		w := sqlcWorkflowToModel(r)
		s.loadComputedFields(ctx, w)
		workflows = append(workflows, *w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("workflow_service: iterate workflows: %w", err)
	}
	return workflows, nil
}

// DeleteWorkflow deletes a workflow (soft delete via deleted_at).
func (s *WorkflowService) DeleteWorkflow(ctx context.Context, id uuid.UUID, organizationID, userID string) error {
	if config.PgxDB == nil {
		return errors.New("workflow_service: pgx pool not initialized")
	}

	existing, err := s.GetWorkflow(ctx, id, organizationID)
	if err != nil {
		return fmt.Errorf("workflow not found: %w", err)
	}

	if existing.IsDefault {
		return fmt.Errorf("cannot delete default workflow: '%s' is set as the default workflow for %s", existing.Name, existing.EntityType)
	}

	// Check if workflow is in use
	count, err := config.Queries.CountAssignmentsByWorkflow(ctx, sqlc.CountAssignmentsByWorkflowParams{
		OrganizationID: organizationID,
		WorkflowID:     pgtype.UUID{Bytes: id, Valid: true},
	})
	if err != nil {
		return fmt.Errorf("workflow_service: check workflow usage: %w", err)
	}
	if count > 0 {
		return fmt.Errorf("cannot delete workflow: it is currently in use by %d assignments", count)
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("workflow_service: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Soft delete: set deleted_at + is_active=false (mirrors sqlc.SoftDeleteWorkflow).
	if _, err := tx.Exec(ctx,
		`UPDATE workflows SET deleted_at = NOW(), is_active = false, updated_at = NOW()
		 WHERE id = $1 AND organization_id = $2`,
		id, organizationID,
	); err != nil {
		return fmt.Errorf("workflow_service: soft delete workflow: %w", err)
	}

	// Defensive: also clean up any orphaned default record (the IsDefault check
	// above should already prevent reaching this branch with a default workflow).
	if _, err := tx.Exec(ctx,
		`DELETE FROM workflow_defaults WHERE default_workflow_id = $1 AND organization_id = $2`,
		id, organizationID,
	); err != nil {
		return fmt.Errorf("workflow_service: delete default record: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("workflow_service: commit: %w", err)
	}

	if s.auditService != nil {
		details := fmt.Sprintf("Deleted workflow '%s'", existing.Name)
		s.auditService.LogEvent(ctx, userID, organizationID, "workflow_deleted", "workflow", existing.ID.String(), details, "", "")
	}

	return nil
}

// GetDefaultWorkflow retrieves the default workflow for an entity type.
func (s *WorkflowService) GetDefaultWorkflow(ctx context.Context, organizationID, entityType string) (*models.Workflow, error) {
	if config.PgxDB == nil {
		return nil, errors.New("workflow_service: pgx pool not initialized")
	}

	// First, try workflow_defaults (case-insensitive on entity_type).
	var defaultID uuid.UUID
	err := config.PgxDB.QueryRow(ctx,
		`SELECT default_workflow_id FROM workflow_defaults
		 WHERE organization_id = $1 AND LOWER(entity_type) = LOWER($2)
		 LIMIT 1`,
		organizationID, entityType,
	).Scan(&defaultID)

	if err == nil {
		return s.GetWorkflow(ctx, defaultID, organizationID)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("workflow_service: lookup workflow_defaults: %w", err)
	}

	// Fallback: any workflow with is_default=true and is_active=true.
	var (
		row   sqlc.Workflow
	)
	err = config.PgxDB.QueryRow(ctx,
		`SELECT id, organization_id, name, description, document_type, entity_type, version, stages, conditions, is_active, is_default, created_by, deleted_at, created_at, updated_at
		 FROM workflows
		 WHERE organization_id = $1 AND LOWER(entity_type) = LOWER($2)
		   AND is_default = true AND is_active = true AND deleted_at IS NULL
		 LIMIT 1`,
		organizationID, entityType,
	).Scan(
		&row.ID, &row.OrganizationID, &row.Name, &row.Description, &row.DocumentType, &row.EntityType,
		&row.Version, &row.Stages, &row.Conditions, &row.IsActive, &row.IsDefault, &row.CreatedBy,
		&row.DeletedAt, &row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("no default workflow found for entity type: %s", entityType)
		}
		return nil, fmt.Errorf("workflow_service: lookup fallback default: %w", err)
	}

	w := sqlcWorkflowToModel(row)
	s.loadComputedFields(ctx, w)
	return w, nil
}

// ActivateWorkflow activates a workflow.
func (s *WorkflowService) ActivateWorkflow(ctx context.Context, id uuid.UUID, organizationID, userID string) (*models.Workflow, error) {
	if config.Queries == nil {
		return nil, errors.New("workflow_service: queries not initialized")
	}

	row, err := config.Queries.ActivateWorkflow(ctx, sqlc.ActivateWorkflowParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_service: activate workflow: %w", err)
	}

	workflow := sqlcWorkflowToModel(row)
	s.loadComputedFields(ctx, workflow)

	if s.auditService != nil {
		details := fmt.Sprintf("Activated workflow '%s'", workflow.Name)
		s.auditService.LogEvent(ctx, userID, organizationID, "workflow_activated", "workflow", workflow.ID.String(), details, "", "")
	}

	return workflow, nil
}

// DeactivateWorkflow deactivates a workflow.
func (s *WorkflowService) DeactivateWorkflow(ctx context.Context, id uuid.UUID, organizationID, userID string) (*models.Workflow, error) {
	if config.Queries == nil {
		return nil, errors.New("workflow_service: queries not initialized")
	}

	row, err := config.Queries.DeactivateWorkflow(ctx, sqlc.DeactivateWorkflowParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_service: deactivate workflow: %w", err)
	}

	workflow := sqlcWorkflowToModel(row)
	s.loadComputedFields(ctx, workflow)

	if s.auditService != nil {
		details := fmt.Sprintf("Deactivated workflow '%s'", workflow.Name)
		s.auditService.LogEvent(ctx, userID, organizationID, "workflow_deactivated", "workflow", workflow.ID.String(), details, "", "")
	}

	return workflow, nil
}

// DuplicateWorkflow creates a copy of an existing workflow
func (s *WorkflowService) DuplicateWorkflow(ctx context.Context, id uuid.UUID, organizationID, userID, newName string) (*models.Workflow, error) {
	existing, err := s.GetWorkflow(ctx, id, organizationID)
	if err != nil {
		return nil, err
	}

	stages, err := existing.GetStages()
	if err != nil {
		return nil, fmt.Errorf("workflow_service: get stages: %w", err)
	}

	conditions, err := existing.GetConditions()
	if err != nil {
		return nil, fmt.Errorf("workflow_service: get conditions: %w", err)
	}

	req := CreateWorkflowRequest{
		Name:        newName,
		Description: existing.Description + " (Copy)",
		EntityType:  existing.EntityType,
		Stages:      stages,
		Conditions:  conditions,
		IsDefault:   false, // Duplicates are never default
	}

	return s.CreateWorkflow(ctx, organizationID, userID, req)
}

// SetDefaultWorkflow sets a workflow as the default for an entity type
func (s *WorkflowService) SetDefaultWorkflow(ctx context.Context, organizationID, entityType, workflowId, userID string) error {
	if config.PgxDB == nil {
		return errors.New("workflow_service: pgx pool not initialized")
	}

	workflowUUID, err := uuid.Parse(workflowId)
	if err != nil {
		return fmt.Errorf("invalid workflow ID format")
	}

	workflow, err := s.GetWorkflow(ctx, workflowUUID, organizationID)
	if err != nil {
		return err
	}

	if !workflow.IsActive {
		return fmt.Errorf("cannot set inactive workflow as default")
	}

	if workflow.EntityType != entityType {
		return fmt.Errorf("workflow entity type mismatch")
	}

	tx, err := config.PgxDB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("workflow_service: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := s.unsetDefaultWorkflowsTx(ctx, tx, organizationID, entityType); err != nil {
		return fmt.Errorf("workflow_service: unset existing defaults: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE workflows SET is_default = true, updated_at = NOW()
		 WHERE id = $1 AND organization_id = $2`,
		workflowUUID, organizationID,
	); err != nil {
		return fmt.Errorf("workflow_service: update workflow: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO workflow_defaults (
			id, organization_id, entity_type, default_workflow_id,
			default_workflow_version, set_by, set_at
		) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
		uuid.New().String(), organizationID, entityType, workflowUUID, workflow.Version, userID,
	); err != nil {
		return fmt.Errorf("workflow_service: create default record: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("workflow_service: commit: %w", err)
	}

	return nil
}

// ResolveWorkflowForEntity finds the appropriate workflow for an entity
func (s *WorkflowService) ResolveWorkflowForEntity(ctx context.Context, organizationID, entityType string, document interface{}) (*models.Workflow, error) {
	active := true
	workflows, err := s.GetWorkflows(ctx, organizationID, WorkflowListFilter{
		EntityType: entityType,
		IsActive:   &active,
	})
	if err != nil {
		return nil, err
	}

	for _, workflow := range workflows {
		conditions, err := workflow.GetConditions()
		if err != nil {
			continue // Skip workflows with invalid conditions
		}
		if conditions == nil || conditions.MatchesDocument(document) {
			return &workflow, nil
		}
	}

	return s.GetDefaultWorkflow(ctx, organizationID, entityType)
}

// GetWorkflowStages parses and returns the stages from a workflow
func (s *WorkflowService) GetWorkflowStages(workflow *models.Workflow) ([]models.WorkflowStage, error) {
	return workflow.GetStages()
}

// ValidateWorkflowStages validates workflow stages.
// Note: 0 stages is allowed when auto-approve is enabled — callers should check
// conditions before calling this method. See validateCreateRequest().
func (s *WorkflowService) ValidateWorkflowStages(stages []models.WorkflowStage) error {
	if len(stages) == 0 {
		return fmt.Errorf("workflow must have at least one stage")
	}

	stageNumbers := make(map[int]bool)
	for i, stage := range stages {
		expectedNumber := i + 1
		if stage.StageNumber != expectedNumber {
			return fmt.Errorf("stage %d: stage number should be %d, got %d", i+1, expectedNumber, stage.StageNumber)
		}

		if err := stage.Validate(); err != nil {
			return fmt.Errorf("stage %d validation failed: %w", i+1, err)
		}

		if stageNumbers[stage.StageNumber] {
			return fmt.Errorf("duplicate stage number: %d", stage.StageNumber)
		}
		stageNumbers[stage.StageNumber] = true
	}

	return nil
}

// GetWorkflowUsageCount returns the number of times a workflow has been used.
func (s *WorkflowService) GetWorkflowUsageCount(ctx context.Context, organizationID, workflowId string) (int64, error) {
	if config.Queries == nil {
		return 0, errors.New("workflow_service: queries not initialized")
	}

	workflowUUID, err := uuid.Parse(workflowId)
	if err != nil {
		return 0, fmt.Errorf("invalid workflow ID format")
	}

	count, err := config.Queries.CountAssignmentsByWorkflow(ctx, sqlc.CountAssignmentsByWorkflowParams{
		OrganizationID: organizationID,
		WorkflowID:     pgtype.UUID{Bytes: workflowUUID, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("workflow_service: count assignments: %w", err)
	}
	return count, nil
}

// Helper methods

func (s *WorkflowService) validateCreateRequest(req CreateWorkflowRequest) error {
	if req.Name == "" {
		return fmt.Errorf("workflow name is required")
	}
	if req.EntityType == "" {
		return fmt.Errorf("entity type is required")
	}

	// Allow 0 stages only when auto-approve is enabled in conditions
	if len(req.Stages) == 0 {
		if req.Conditions != nil && req.Conditions.AutoApprove {
			return nil // Valid: auto-approve workflow with no manual stages
		}
		return fmt.Errorf("workflow must have at least one stage (or enable auto-approval)")
	}

	// Validate stages
	return s.ValidateWorkflowStages(req.Stages)
}

// unsetDefaultWorkflowsTx unsets is_default for all workflows of the given
// entity type and removes their workflow_defaults rows. Runs inside the given
// pgx transaction.
func (s *WorkflowService) unsetDefaultWorkflowsTx(ctx context.Context, tx pgx.Tx, organizationID, entityType string) error {
	if _, err := tx.Exec(ctx,
		`UPDATE workflows
		 SET is_default = false, updated_at = NOW()
		 WHERE organization_id = $1 AND LOWER(entity_type) = LOWER($2) AND is_default = true`,
		organizationID, entityType,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM workflow_defaults
		 WHERE organization_id = $1 AND LOWER(entity_type) = LOWER($2)`,
		organizationID, entityType,
	); err != nil {
		return err
	}
	return nil
}

// updateDefaultWorkflowTx replaces the existing default record for the given
// entity type with one that points at the supplied workflow.
func (s *WorkflowService) updateDefaultWorkflowTx(ctx context.Context, tx pgx.Tx, organizationID string, workflow *models.Workflow) error {
	if _, err := tx.Exec(ctx,
		`DELETE FROM workflow_defaults WHERE organization_id = $1 AND entity_type = $2`,
		organizationID, workflow.EntityType,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO workflow_defaults (
			id, organization_id, entity_type, default_workflow_id,
			default_workflow_version, set_by, set_at
		) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
		uuid.New().String(), organizationID, workflow.EntityType, workflow.ID,
		workflow.Version, workflow.CreatedBy,
	); err != nil {
		return err
	}
	return nil
}

// readWorkflowTx fetches a workflow row inside the given transaction.
func (s *WorkflowService) readWorkflowTx(ctx context.Context, tx pgx.Tx, id uuid.UUID, organizationID string) (*models.Workflow, error) {
	var r sqlc.Workflow
	err := tx.QueryRow(ctx,
		`SELECT id, organization_id, name, description, document_type, entity_type, version, stages, conditions, is_active, is_default, created_by, deleted_at, created_at, updated_at
		 FROM workflows WHERE id = $1 AND organization_id = $2`,
		id, organizationID,
	).Scan(
		&r.ID, &r.OrganizationID, &r.Name, &r.Description, &r.DocumentType, &r.EntityType,
		&r.Version, &r.Stages, &r.Conditions, &r.IsActive, &r.IsDefault, &r.CreatedBy,
		&r.DeletedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return sqlcWorkflowToModel(r), nil
}

// loadComputedFields populates TotalStages, UsageCount, and resolved role
// names on the workflow. It is best-effort: errors are swallowed because
// computed fields are advisory.
func (s *WorkflowService) loadComputedFields(ctx context.Context, workflow *models.Workflow) {
	if workflow == nil || config.Queries == nil {
		return
	}

	stages, err := workflow.GetStages()
	if err == nil {
		workflow.TotalStages = len(stages)

		// Resolve UUID roles to names.
		uuidRoles := make(map[string]uuid.UUID)
		for _, stage := range stages {
			if parsed, parseErr := uuid.Parse(stage.RequiredRole); parseErr == nil {
				uuidRoles[stage.RequiredRole] = parsed
			}
		}

		if len(uuidRoles) > 0 {
			roleNameMap := make(map[string]string, len(uuidRoles))
			for raw, parsed := range uuidRoles {
				role, err := config.Queries.GetOrganizationRoleByID(ctx, sqlc.GetOrganizationRoleByIDParams{
					ID: pgtype.UUID{Bytes: parsed, Valid: true},
				})
				if err != nil {
					continue
				}
				roleNameMap[raw] = role.Name
			}

			changed := false
			for i := range stages {
				if name, ok := roleNameMap[stages[i].RequiredRole]; ok {
					stages[i].RequiredRoleName = name
					changed = true
				}
			}
			if changed {
				_ = workflow.SetStages(stages)
			}
		}
	}

	// Usage count via sqlc.
	count, err := config.Queries.CountAssignmentsByWorkflow(ctx, sqlc.CountAssignmentsByWorkflowParams{
		OrganizationID: workflow.OrganizationID,
		WorkflowID:     pgtype.UUID{Bytes: workflow.ID, Valid: true},
	})
	if err == nil {
		workflow.UsageCount = int(count)
	}
}

// sqlcWorkflowToModel converts a sqlc.Workflow row into the in-process
// models.Workflow representation.
func sqlcWorkflowToModel(row sqlc.Workflow) *models.Workflow {
	w := &models.Workflow{
		OrganizationID: row.OrganizationID,
		Name:           row.Name,
		Stages:         json.RawMessage(row.Stages),
	}

	if row.ID.Valid {
		w.ID = uuid.UUID(row.ID.Bytes)
	}
	if row.Description != nil {
		w.Description = *row.Description
	}
	w.DocumentType = row.DocumentType
	if row.EntityType != "" {
		w.EntityType = row.EntityType
	} else {
		w.EntityType = row.DocumentType
	}
	if row.Version != nil {
		w.Version = int(*row.Version)
	}
	if len(row.Conditions) > 0 {
		w.Conditions = json.RawMessage(row.Conditions)
	}
	if row.IsActive != nil {
		w.IsActive = *row.IsActive
	}
	if row.IsDefault != nil {
		w.IsDefault = *row.IsDefault
	}
	if row.CreatedBy != nil {
		w.CreatedBy = *row.CreatedBy
	}
	if row.CreatedAt.Valid {
		w.CreatedAt = row.CreatedAt.Time
	}
	if row.UpdatedAt.Valid {
		w.UpdatedAt = row.UpdatedAt.Time
	}
	if row.DeletedAt.Valid {
		t := row.DeletedAt.Time
		w.DeletedAt = &t
	}
	return w
}
