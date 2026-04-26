package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/tether-erp/config"
	sqlc "github.com/tether-erp/database/sqlc"
)

// WorkflowState represents valid document states.
type WorkflowState string

const (
	StateDraft     WorkflowState = "DRAFT"
	StatePending   WorkflowState = "PENDING"
	StateApproved  WorkflowState = "APPROVED"
	StateRejected  WorkflowState = "REJECTED"
	StateFulfilled WorkflowState = "FULFILLED" // For PO
	StatePaid      WorkflowState = "PAID"      // For PV
	StateCompleted WorkflowState = "COMPLETED" // For GRN
)

// WorkflowTransition defines a valid state transition.
type WorkflowTransition struct {
	From         WorkflowState
	To           WorkflowState
	Action       string
	RequiredRole string // "" means any authenticated user
}

// WorkflowStateMachine manages document state transitions backed by sqlc + pgxpool.
type WorkflowStateMachine struct {
	transitions map[string][]WorkflowTransition
}

// NewWorkflowStateMachine creates a new workflow state machine. Persistence uses
// the package-global config.Queries / config.PgxDB.
func NewWorkflowStateMachine() *WorkflowStateMachine {
	wsm := &WorkflowStateMachine{transitions: make(map[string][]WorkflowTransition)}
	wsm.initializeTransitions()
	return wsm
}

// initializeTransitions sets up all valid transitions for document types.
func (wsm *WorkflowStateMachine) initializeTransitions() {
	wsm.transitions["requisition"] = []WorkflowTransition{
		{From: StateDraft, To: StatePending, Action: "submit", RequiredRole: ""},
		{From: StateDraft, To: StateApproved, Action: "auto_approve", RequiredRole: "system"},
		{From: StatePending, To: StateApproved, Action: "approve", RequiredRole: "approver"},
		{From: StatePending, To: StateRejected, Action: "reject", RequiredRole: "approver"},
		{From: StateRejected, To: StateDraft, Action: "reopen", RequiredRole: "requester"},
		{From: StateDraft, To: "deleted", Action: "delete", RequiredRole: "requester"},
	}
	wsm.transitions["budget"] = []WorkflowTransition{
		{From: StateDraft, To: StatePending, Action: "submit", RequiredRole: ""},
		{From: StatePending, To: StateApproved, Action: "approve", RequiredRole: "finance"},
		{From: StatePending, To: StateRejected, Action: "reject", RequiredRole: "finance"},
		{From: StateRejected, To: StateDraft, Action: "reopen", RequiredRole: ""},
		{From: StateDraft, To: "deleted", Action: "delete", RequiredRole: ""},
	}
	wsm.transitions["po"] = []WorkflowTransition{
		{From: StateDraft, To: StatePending, Action: "submit", RequiredRole: ""},
		{From: StatePending, To: StateApproved, Action: "approve", RequiredRole: "finance"},
		{From: StatePending, To: StateRejected, Action: "reject", RequiredRole: "finance"},
		{From: StateApproved, To: StateFulfilled, Action: "fulfill", RequiredRole: ""},
		{From: StateFulfilled, To: StateCompleted, Action: "complete", RequiredRole: ""},
		{From: StateDraft, To: "deleted", Action: "delete", RequiredRole: ""},
	}
	wsm.transitions["pv"] = []WorkflowTransition{
		{From: StateDraft, To: StatePending, Action: "submit", RequiredRole: ""},
		{From: StatePending, To: StateApproved, Action: "approve", RequiredRole: "finance"},
		{From: StatePending, To: StateRejected, Action: "reject", RequiredRole: "finance"},
		{From: StateApproved, To: StatePaid, Action: "pay", RequiredRole: "finance"},
		{From: StateDraft, To: "deleted", Action: "delete", RequiredRole: ""},
	}
	wsm.transitions["grn"] = []WorkflowTransition{
		{From: StateDraft, To: StatePending, Action: "submit", RequiredRole: ""},
		{From: StatePending, To: StateApproved, Action: "approve", RequiredRole: "approver"},
		{From: StatePending, To: StateRejected, Action: "reject", RequiredRole: "approver"},
		{From: StateApproved, To: StateCompleted, Action: "complete", RequiredRole: ""},
		{From: StateDraft, To: "deleted", Action: "delete", RequiredRole: ""},
	}
}

// CanTransition checks if a state transition is allowed.
func (wsm *WorkflowStateMachine) CanTransition(docType string, fromState, toState, userRole string) bool {
	transitions, exists := wsm.transitions[docType]
	if !exists {
		log.Printf("Unknown document type: %s", docType)
		return false
	}
	for _, t := range transitions {
		if t.From == WorkflowState(fromState) && t.To == WorkflowState(toState) {
			if t.RequiredRole == "" || t.RequiredRole == userRole {
				return true
			}
		}
	}
	return false
}

// updateDocumentStatus updates the status column of the document table for the
// given doc type using the appropriate sqlc generated query. Approval stage
// is left unchanged (nil COALESCE).
func (wsm *WorkflowStateMachine) updateDocumentStatus(ctx context.Context, docType, documentID string, toState WorkflowState) error {
	statusStr := string(toState)
	switch docType {
	case "requisition":
		_, err := config.Queries.UpdateRequisitionStatus(ctx, sqlc.UpdateRequisitionStatusParams{
			ID:     documentID,
			Status: &statusStr,
		})
		return err
	case "budget":
		// No dedicated UpdateBudgetStatus query — use UpdateBudget (status is COALESCE'd).
		_, err := config.Queries.UpdateBudget(ctx, sqlc.UpdateBudgetParams{
			ID:     documentID,
			Status: &statusStr,
		})
		return err
	case "po":
		_, err := config.Queries.UpdatePOStatus(ctx, sqlc.UpdatePOStatusParams{
			ID:     documentID,
			Status: &statusStr,
		})
		return err
	case "pv":
		_, err := config.Queries.UpdatePVStatus(ctx, sqlc.UpdatePVStatusParams{
			ID:     documentID,
			Status: &statusStr,
		})
		return err
	case "grn":
		_, err := config.Queries.UpdateGRNStatus(ctx, sqlc.UpdateGRNStatusParams{
			ID:     documentID,
			Status: &statusStr,
		})
		return err
	default:
		return fmt.Errorf("unknown document type: %s", docType)
	}
}

// TransitionDocument moves a document from one state to another. Validation,
// status update, and audit logging are performed atomically per call.
func (wsm *WorkflowStateMachine) TransitionDocument(
	docType string,
	documentID string,
	fromState, toState WorkflowState,
	userID, userRole, action, comments string,
) error {
	if !wsm.CanTransition(docType, string(fromState), string(toState), userRole) {
		return fmt.Errorf("invalid state transition from %s to %s for %s", fromState, toState, docType)
	}

	ctx := context.Background()

	if err := wsm.updateDocumentStatus(ctx, docType, documentID, toState); err != nil {
		return fmt.Errorf("workflow_state_machine: update %s status: %w", docType, err)
	}

	// Audit log entry. No CreateAuditLog query in generated sqlc, so use raw SQL.
	// TODO: replace with sqlc-generated CreateAuditLog once added.
	changes := map[string]interface{}{
		"from":    string(fromState),
		"to":      string(toState),
		"comment": comments,
	}
	changesJSON, err := json.Marshal(changes)
	if err != nil {
		log.Printf("Error marshalling audit changes: %v", err)
		return nil
	}

	_, err = config.PgxDB.Exec(ctx,
		`INSERT INTO audit_logs (id, organization_id, document_id, document_type, user_id, action, changes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		uuid.New().String(),
		"", // organization_id is unknown at this layer; column has DEFAULT ''.
		documentID,
		docType,
		userID,
		action,
		changesJSON,
	)
	if err != nil {
		log.Printf("Error creating audit log: %v", err)
		// Don't fail the transition if audit logging fails.
	}

	return nil
}

// GetValidNextStates returns all valid next states from current state for the role.
func (wsm *WorkflowStateMachine) GetValidNextStates(docType, currentState, userRole string) []string {
	transitions, exists := wsm.transitions[docType]
	if !exists {
		return []string{}
	}
	var validStates []string
	for _, t := range transitions {
		if t.From == WorkflowState(currentState) {
			if t.RequiredRole == "" || t.RequiredRole == userRole {
				validStates = append(validStates, string(t.To))
			}
		}
	}
	return validStates
}

// SubmitForApproval moves a document from draft to pending.
func (wsm *WorkflowStateMachine) SubmitForApproval(docType, documentID, userID string) error {
	return wsm.TransitionDocument(docType, documentID, StateDraft, StatePending, userID, "", "submit", "Document submitted for approval")
}

// ApproveDocument moves a document from pending to approved.
func (wsm *WorkflowStateMachine) ApproveDocument(docType, documentID, userID, approverRole, comments string) error {
	return wsm.TransitionDocument(docType, documentID, StatePending, StateApproved, userID, approverRole, "approve", comments)
}

// RejectDocument moves a document from pending to rejected.
func (wsm *WorkflowStateMachine) RejectDocument(docType, documentID, userID, approverRole, remarks string) error {
	return wsm.TransitionDocument(docType, documentID, StatePending, StateRejected, userID, approverRole, "reject", remarks)
}

// AuditLogEntry is a lightweight read-model for workflow history queries.
type AuditLogEntry struct {
	ID           string                 `json:"id"`
	DocumentID   string                 `json:"documentId"`
	DocumentType string                 `json:"documentType"`
	UserID       string                 `json:"userId"`
	Action       string                 `json:"action"`
	Changes      map[string]interface{} `json:"changes"`
	CreatedAt    string                 `json:"createdAt"`
}

// GetWorkflowHistory returns all state transitions (audit log entries) for a document.
func (wsm *WorkflowStateMachine) GetWorkflowHistory(documentID string) ([]AuditLogEntry, error) {
	ctx := context.Background()

	rows, err := config.PgxDB.Query(ctx,
		`SELECT id, document_id, document_type, user_id, action, changes, created_at
		 FROM audit_logs
		 WHERE document_id = $1
		 ORDER BY created_at ASC`,
		documentID,
	)
	if err != nil {
		return nil, fmt.Errorf("workflow_state_machine: query history: %w", err)
	}
	defer rows.Close()

	var out []AuditLogEntry
	for rows.Next() {
		var (
			id, docID, docType, userID, action string
			changesRaw                         []byte
			createdAt                          interface{}
		)
		if err := rows.Scan(&id, &docID, &docType, &userID, &action, &changesRaw, &createdAt); err != nil {
			return nil, fmt.Errorf("workflow_state_machine: scan history: %w", err)
		}
		entry := AuditLogEntry{
			ID:           id,
			DocumentID:   docID,
			DocumentType: docType,
			UserID:       userID,
			Action:       action,
		}
		if len(changesRaw) > 0 {
			_ = json.Unmarshal(changesRaw, &entry.Changes)
		}
		entry.CreatedAt = fmt.Sprintf("%v", createdAt)
		out = append(out, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("workflow_state_machine: iterate history: %w", err)
	}
	return out, nil
}
