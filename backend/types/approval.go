package types

import "time"

// ApprovalTaskResponse represents an approval task in API responses
type ApprovalTaskResponse struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	DocumentID     string    `json:"documentId"`
	DocumentType   string    `json:"documentType"`
	ApproverID     string    `json:"approverId"`
	Status         string    `json:"status"` // pending, approved, rejected, cancelled
	Stage          int       `json:"stage"`
	Comments       string    `json:"comments,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// ApproveTaskRequest represents a request to approve a task
type ApproveTaskRequest struct {
	Comments    string `json:"comments"`
	Signature   string `json:"signature"` // Base64 encoded signature image
	StageNumber int    `json:"stageNumber"`
}

// RejectTaskRequest represents a request to reject a task
type RejectTaskRequest struct {
	Remarks   string `json:"remarks"`   // Required reason for rejection
	Comments  string `json:"comments"`  // Additional comments
	Signature string `json:"signature"` // Base64 encoded signature image
	ReturnTo  string `json:"returnTo,omitempty"`
}

// ReassignTaskRequest represents a request to reassign a task
type ReassignTaskRequest struct {
	NewApproverId string `json:"newApproverId"`
	Reason        string `json:"reason"`
}

// ApprovalRecord represents a single approval in the approval history
type ApprovalRecord struct {
	ApproverID   string    `json:"approverId"`
	ApproverName string    `json:"approverName"`
	Status       string    `json:"status"`     // approved, rejected
	Comments     string    `json:"comments,omitempty"`
	Signature    string    `json:"signature,omitempty"` // Base64 encoded
	ApprovedAt   time.Time `json:"approvedAt"`
	ManNumber    string    `json:"manNumber,omitempty"`
	Position     string    `json:"position,omitempty"`

	// Extended fields for UI compatibility
	StageNumber      *int       `json:"stageNumber,omitempty"`        // Stage number
	StageName        *string    `json:"stageName,omitempty"`          // Stage name
	AssignedTo       *string    `json:"assignedTo,omitempty"`         // Assigned to user
	AssignedRole     *string    `json:"assignedRole,omitempty"`       // Assigned role
	ActionTakenBy    *string    `json:"actionTakenBy,omitempty"`      // User who took action
	ActionTakenByRole *string   `json:"actionTakenByRole,omitempty"`  // Role of user who took action
	ActionTakenAt    *time.Time `json:"actionTakenAt,omitempty"`      // When action was taken
	Remarks          *string    `json:"remarks,omitempty"`            // Action remarks
}

// ApprovalTaskDetailResponse includes task and document details
type ApprovalTaskDetailResponse struct {
	Task     ApprovalTaskResponse `json:"task"`
	Document interface{}          `json:"document"`
}
