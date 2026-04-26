package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
)

// ErrWorkflowNotFound is returned when a workflow cannot be located, or when
// the located workflow does not belong to the requesting organization.
var ErrWorkflowNotFound = errors.New("workflow not found")

// WorkflowRepositoryInterface defines the contract for workflow repository
type WorkflowRepositoryInterface interface {
	// Basic CRUD operations
	Create(ctx context.Context, organizationID, name, description, entityType string, stages json.RawMessage, isActive bool, createdBy string) (*models.Workflow, error)
	GetByID(ctx context.Context, id uuid.UUID, organizationID string) (*models.Workflow, error)
	GetByStringID(ctx context.Context, id string, organizationID string) (*models.Workflow, error)
	Update(ctx context.Context, id uuid.UUID, organizationID, name, description string, stages json.RawMessage) (*models.Workflow, error)
	Delete(ctx context.Context, id uuid.UUID, organizationID string) error

	// List operations
	List(ctx context.Context, organizationID string, limit, offset int) ([]*models.Workflow, error)
	ListActive(ctx context.Context, organizationID string, limit, offset int) ([]*models.Workflow, error)
	ListByDocumentType(ctx context.Context, organizationID, documentType string, limit, offset int) ([]*models.Workflow, error)
	ListActiveByDocumentType(ctx context.Context, organizationID, documentType string, limit, offset int) ([]*models.Workflow, error)

	// Special operations
	GetDefaultByDocumentType(ctx context.Context, organizationID, documentType string) (*models.Workflow, error)
	Activate(ctx context.Context, id uuid.UUID, organizationID string) (*models.Workflow, error)
	Deactivate(ctx context.Context, id uuid.UUID, organizationID string) (*models.Workflow, error)

	// Count operations
	Count(ctx context.Context, organizationID string) (int64, error)
	CountActive(ctx context.Context, organizationID string) (int64, error)
	CountByDocumentType(ctx context.Context, organizationID, documentType string) (int64, error)
}

// WorkflowRepository implements WorkflowRepositoryInterface backed by sqlc + pgxpool.
type WorkflowRepository struct {
	db *pgxpool.Pool
	q  *sqlc.Queries
}

// NewWorkflowRepository creates a new workflow repository.
func NewWorkflowRepository(pgxDB *pgxpool.Pool) WorkflowRepositoryInterface {
	return &WorkflowRepository{
		db: pgxDB,
		q:  sqlc.New(pgxDB),
	}
}

// Create creates a new workflow.
func (r *WorkflowRepository) Create(ctx context.Context, organizationID, name, description, entityType string, stages json.RawMessage, isActive bool, createdBy string) (*models.Workflow, error) {
	var descPtr *string
	if description != "" {
		descPtr = &description
	}
	var creatorPtr *string
	if createdBy != "" {
		creatorPtr = &createdBy
	}
	active := isActive

	row, err := r.q.CreateWorkflow(ctx, sqlc.CreateWorkflowParams{
		OrganizationID: organizationID,
		Name:           name,
		Description:    descPtr,
		DocumentType:   entityType,
		Stages:         stages,
		IsActive:       &active,
		CreatedBy:      creatorPtr,
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_repository: create: %w", err)
	}

	return workflowFromSQLC(row), nil
}

// GetByID retrieves a workflow by ID and verifies the organization match.
func (r *WorkflowRepository) GetByID(ctx context.Context, id uuid.UUID, organizationID string) (*models.Workflow, error) {
	row, err := r.q.GetWorkflowByID(ctx, sqlc.GetWorkflowByIDParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWorkflowNotFound
		}
		return nil, fmt.Errorf("workflow_repository: get_by_id: %w", err)
	}

	if row.OrganizationID != organizationID {
		return nil, ErrWorkflowNotFound
	}

	return workflowFromSQLC(row), nil
}

// GetByStringID retrieves a workflow by its string-form UUID.
func (r *WorkflowRepository) GetByStringID(ctx context.Context, id string, organizationID string) (*models.Workflow, error) {
	workflowID, err := uuid.Parse(id)
	if err != nil {
		return nil, fmt.Errorf("workflow_repository: get_by_string_id: %w", err)
	}
	return r.GetByID(ctx, workflowID, organizationID)
}

// Update updates a workflow's name, description and stages.
func (r *WorkflowRepository) Update(ctx context.Context, id uuid.UUID, organizationID, name, description string, stages json.RawMessage) (*models.Workflow, error) {
	var descPtr *string
	if description != "" {
		descPtr = &description
	}

	row, err := r.q.UpdateWorkflow(ctx, sqlc.UpdateWorkflowParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
		Name:           name,
		Description:    descPtr,
		Stages:         stages,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWorkflowNotFound
		}
		return nil, fmt.Errorf("workflow_repository: update: %w", err)
	}

	return workflowFromSQLC(row), nil
}

// Delete soft-deletes a workflow.
func (r *WorkflowRepository) Delete(ctx context.Context, id uuid.UUID, organizationID string) error {
	if err := r.q.SoftDeleteWorkflow(ctx, sqlc.SoftDeleteWorkflowParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
	}); err != nil {
		return fmt.Errorf("workflow_repository: delete: %w", err)
	}
	return nil
}

// List retrieves workflows for an organization with pagination.
func (r *WorkflowRepository) List(ctx context.Context, organizationID string, limit, offset int) ([]*models.Workflow, error) {
	rows, err := r.q.ListWorkflows(ctx, sqlc.ListWorkflowsParams{
		OrganizationID: organizationID,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_repository: list: %w", err)
	}

	out := make([]*models.Workflow, 0, len(rows))
	for _, row := range rows {
		out = append(out, workflowFromSQLC(row))
	}
	return out, nil
}

// ListActive retrieves active workflows with pagination.
func (r *WorkflowRepository) ListActive(ctx context.Context, organizationID string, limit, offset int) ([]*models.Workflow, error) {
	rows, err := r.q.ListActiveWorkflows(ctx, sqlc.ListActiveWorkflowsParams{
		OrganizationID: organizationID,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_repository: list_active: %w", err)
	}

	out := make([]*models.Workflow, 0, len(rows))
	for _, row := range rows {
		out = append(out, workflowFromSQLC(row))
	}
	return out, nil
}

// ListByDocumentType retrieves workflows by document type with pagination.
func (r *WorkflowRepository) ListByDocumentType(ctx context.Context, organizationID, documentType string, limit, offset int) ([]*models.Workflow, error) {
	rows, err := r.q.ListWorkflowsByDocumentType(ctx, sqlc.ListWorkflowsByDocumentTypeParams{
		OrganizationID: organizationID,
		DocumentType:   documentType,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_repository: list_by_document_type: %w", err)
	}

	out := make([]*models.Workflow, 0, len(rows))
	for _, row := range rows {
		out = append(out, workflowFromSQLC(row))
	}
	return out, nil
}

// ListActiveByDocumentType retrieves active workflows by document type with pagination.
func (r *WorkflowRepository) ListActiveByDocumentType(ctx context.Context, organizationID, documentType string, limit, offset int) ([]*models.Workflow, error) {
	rows, err := r.q.ListActiveWorkflowsByDocumentType(ctx, sqlc.ListActiveWorkflowsByDocumentTypeParams{
		OrganizationID: organizationID,
		DocumentType:   documentType,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("workflow_repository: list_active_by_document_type: %w", err)
	}

	out := make([]*models.Workflow, 0, len(rows))
	for _, row := range rows {
		out = append(out, workflowFromSQLC(row))
	}
	return out, nil
}

// GetDefaultByDocumentType retrieves the default workflow for a document type.
//
// TODO: The generated GetDefaultWorkflowByDocumentType returns the most recent
// active workflow for the document type but does not filter on is_default.
// Consider adding a dedicated sqlc query that adds `AND is_default = true`
// for stricter "default" semantics if/when the schema requires it.
func (r *WorkflowRepository) GetDefaultByDocumentType(ctx context.Context, organizationID, documentType string) (*models.Workflow, error) {
	row, err := r.q.GetDefaultWorkflowByDocumentType(ctx, sqlc.GetDefaultWorkflowByDocumentTypeParams{
		OrganizationID: organizationID,
		DocumentType:   documentType,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWorkflowNotFound
		}
		return nil, fmt.Errorf("workflow_repository: get_default_by_document_type: %w", err)
	}

	return workflowFromSQLC(row), nil
}

// Activate marks a workflow as active.
func (r *WorkflowRepository) Activate(ctx context.Context, id uuid.UUID, organizationID string) (*models.Workflow, error) {
	row, err := r.q.ActivateWorkflow(ctx, sqlc.ActivateWorkflowParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWorkflowNotFound
		}
		return nil, fmt.Errorf("workflow_repository: activate: %w", err)
	}
	return workflowFromSQLC(row), nil
}

// Deactivate marks a workflow as inactive.
func (r *WorkflowRepository) Deactivate(ctx context.Context, id uuid.UUID, organizationID string) (*models.Workflow, error) {
	row, err := r.q.DeactivateWorkflow(ctx, sqlc.DeactivateWorkflowParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		OrganizationID: organizationID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWorkflowNotFound
		}
		return nil, fmt.Errorf("workflow_repository: deactivate: %w", err)
	}
	return workflowFromSQLC(row), nil
}

// Count returns the total number of workflows for an organization.
func (r *WorkflowRepository) Count(ctx context.Context, organizationID string) (int64, error) {
	count, err := r.q.CountWorkflows(ctx, sqlc.CountWorkflowsParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		return 0, fmt.Errorf("workflow_repository: count: %w", err)
	}
	return count, nil
}

// CountActive returns the number of active workflows for an organization.
func (r *WorkflowRepository) CountActive(ctx context.Context, organizationID string) (int64, error) {
	count, err := r.q.CountActiveWorkflows(ctx, sqlc.CountActiveWorkflowsParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		return 0, fmt.Errorf("workflow_repository: count_active: %w", err)
	}
	return count, nil
}

// CountByDocumentType returns the count of workflows for a given document type.
func (r *WorkflowRepository) CountByDocumentType(ctx context.Context, organizationID, documentType string) (int64, error) {
	count, err := r.q.CountWorkflowsByDocumentType(ctx, sqlc.CountWorkflowsByDocumentTypeParams{
		OrganizationID: organizationID,
		DocumentType:   documentType,
	})
	if err != nil {
		return 0, fmt.Errorf("workflow_repository: count_by_document_type: %w", err)
	}
	return count, nil
}

// derefString returns the value of *string or "" when nil.
func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// timeFromTimestamptz converts a pgtype.Timestamptz into time.Time, returning
// the zero value when the timestamptz is null/invalid.
func timeFromTimestamptz(ts pgtype.Timestamptz) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}

// timePtrFromTimestamptz converts a pgtype.Timestamptz into *time.Time,
// returning nil when the timestamptz is null/invalid.
func timePtrFromTimestamptz(ts pgtype.Timestamptz) *time.Time {
	if !ts.Valid {
		return nil
	}
	t := ts.Time
	return &t
}

// uuidFromPg converts a pgtype.UUID into a uuid.UUID. Returns the zero UUID
// when the pg value is null/invalid.
func uuidFromPg(id pgtype.UUID) uuid.UUID {
	if !id.Valid {
		return uuid.UUID{}
	}
	return uuid.UUID(id.Bytes)
}

// workflowFromSQLC converts a sqlc Workflow row into the domain models.Workflow.
func workflowFromSQLC(row sqlc.Workflow) *models.Workflow {
	w := &models.Workflow{
		ID:             uuidFromPg(row.ID),
		OrganizationID: row.OrganizationID,
		Name:           row.Name,
		Description:    derefString(row.Description),
		DocumentType:   row.DocumentType,
		EntityType:     row.EntityType,
		CreatedBy:      derefString(row.CreatedBy),
		CreatedAt:      timeFromTimestamptz(row.CreatedAt),
		UpdatedAt:      timeFromTimestamptz(row.UpdatedAt),
		DeletedAt:      timePtrFromTimestamptz(row.DeletedAt),
	}

	if row.Version != nil {
		w.Version = int(*row.Version)
	}
	if row.IsActive != nil {
		w.IsActive = *row.IsActive
	}
	if row.IsDefault != nil {
		w.IsDefault = *row.IsDefault
	}

	if len(row.Stages) > 0 {
		w.Stages = json.RawMessage(row.Stages)
	}
	if len(row.Conditions) > 0 {
		w.Conditions = json.RawMessage(row.Conditions)
	}

	// Populate computed TotalStages from the stages payload when possible.
	if len(w.Stages) > 0 {
		var stages []models.WorkflowStage
		if err := json.Unmarshal(w.Stages, &stages); err == nil {
			w.TotalStages = len(stages)
		}
	}

	return w
}
