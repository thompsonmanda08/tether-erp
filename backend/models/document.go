package models

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Document represents a generic document that can be any business document type
type Document struct {
	ID             uuid.UUID       `json:"id"`
	OrganizationID string          `json:"organizationId"`
	DocumentType   string          `json:"documentType"` // REQUISITION, BUDGET, PURCHASE_ORDER, etc.
	DocumentNumber string          `json:"documentNumber"`
	Title          string          `json:"title"`
	Description    *string         `json:"description"`
	Status         string          `json:"status"` // draft, submitted, approved, rejected
	Amount         *float64        `json:"amount"`
	Currency       *string         `json:"currency"`
	Department     *string         `json:"department"`
	CreatedBy      string          `json:"createdBy"`
	UpdatedBy      *string         `json:"updatedBy"`
	WorkflowID     *uuid.UUID      `json:"workflowId"`
	Data           json.RawMessage `json:"data"` // Type-specific fields as JSONB
	Metadata       json.RawMessage `json:"metadata"` // Additional metadata
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	DeletedAt      *time.Time      `json:"deletedAt,omitempty"`

	// Relationships
	Organization *Organization `json:"organization,omitempty"`
	Creator      *User         `json:"creator,omitempty"`
	Updater      *User         `json:"updater,omitempty"`
	Workflow     *Workflow     `json:"workflow,omitempty"`
}

// IsEditable checks if the document can be edited based on its status
func (d *Document) IsEditable() bool {
	s := strings.ToUpper(d.Status)
	return s == "DRAFT" || s == "REJECTED"
}

// CanBeSubmitted checks if the document can be submitted for approval
func (d *Document) CanBeSubmitted() bool {
	s := strings.ToUpper(d.Status)
	return s == "DRAFT" || s == "REJECTED"
}

// CanBeApproved checks if the document can be approved
func (d *Document) CanBeApproved() bool {
	return strings.ToUpper(d.Status) == "SUBMITTED"
}

// DocumentSearchResult represents a document search result with highlighting
type DocumentSearchResult struct {
	Document
	Relevance float64 `json:"relevance"`
	Matches   []string `json:"matches,omitempty"` // Fields that matched the search
}

// DocumentFilter represents filters for document queries
type DocumentFilter struct {
	DocumentNumber string    `json:"documentNumber,omitempty"` // Exact document number match
	DocumentTypes  []string  `json:"documentTypes,omitempty"`
	Statuses       []string  `json:"statuses,omitempty"`
	Departments    []string  `json:"departments,omitempty"`
	CreatedBy      []string  `json:"createdBy,omitempty"`
	DateFrom       *time.Time `json:"dateFrom,omitempty"`
	DateTo         *time.Time `json:"dateTo,omitempty"`
	AmountMin      *float64  `json:"amountMin,omitempty"`
	AmountMax      *float64  `json:"amountMax,omitempty"`
	Search         string    `json:"search,omitempty"` // Full-text search
}

// DocumentStats represents document statistics
type DocumentStats struct {
	TotalDocuments     int64                    `json:"totalDocuments"`
	DocumentsByType    map[string]int64         `json:"documentsByType"`
	DocumentsByStatus  map[string]int64         `json:"documentsByStatus"`
	DocumentsByDept    map[string]int64         `json:"documentsByDepartment"`
	RecentDocuments    int64                    `json:"recentDocuments"` // Last 7 days
	PendingApprovals   int64                    `json:"pendingApprovals"`
	TotalValue         float64                  `json:"totalValue"`
	AverageValue       float64                  `json:"averageValue"`
}
