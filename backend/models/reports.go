package models

import "time"

// SystemStatistics represents overall system metrics
type SystemStatistics struct {
	TotalDocuments         int                   `json:"totalDocuments"`
	ApprovedDocuments      int                   `json:"approvedDocuments"`
	RejectedDocuments      int                   `json:"rejectedDocuments"`
	DraftDocuments         int                   `json:"draftDocuments"`
	SubmittedDocuments     int                   `json:"submittedDocuments"`
	PendingApproval        int                   `json:"pendingApproval"`
	AverageApprovalTime    float64               `json:"averageApprovalTime"`
	AverageProcessingTime  float64               `json:"averageProcessingTime"`
	ApprovalRate           float64               `json:"approvalRate"`
	RejectionRate          float64               `json:"rejectionRate"`
	BudgetUtilization      float64               `json:"budgetUtilization"`
	DocumentTypeBreakdown  DocumentTypeBreakdown `json:"documentTypeBreakdown"`
	StatusBreakdown        StatusBreakdown       `json:"statusBreakdown"`
}

// DocumentTypeBreakdown represents counts by document type
type DocumentTypeBreakdown struct {
	Requisitions    int `json:"requisitions"`
	PurchaseOrders  int `json:"purchaseOrders"`
	PaymentVouchers int `json:"paymentVouchers"`
	GRN             int `json:"grn"`
	Budgets         int `json:"budgets"`
}

// StatusBreakdown represents counts by status
type StatusBreakdown struct {
	Draft     int `json:"draft"`
	Submitted int `json:"submitted"`
	InReview  int `json:"inReview"`
	Approved  int `json:"approved"`
	Rejected  int `json:"rejected"`
}

// ApprovalMetrics represents approval-related metrics
type ApprovalMetrics struct {
	TotalApproved   int                `json:"totalApproved"`
	TotalRejected   int                `json:"totalRejected"`
	TotalPending    int                `json:"totalPending"`
	ApprovalRate    float64            `json:"approvalRate"`
	RecentApprovals []ApprovalActivity `json:"recentApprovals"`
}

// ApprovalActivity represents a single approval action
type ApprovalActivity struct {
	ID             string     `json:"id"`
	DocumentID     string     `json:"documentId"`
	DocumentNumber string     `json:"documentNumber"`
	DocumentType   string     `json:"documentType"`
	Action         string     `json:"action"`
	ApproverName   string     `json:"approverName"`
	ApproverRole   *string    `json:"approverRole"` // Can be NULL
	Comments       *string    `json:"comments"`
	CreatedAt      time.Time  `json:"createdAt"`
}

// UserActivityMetrics represents user activity statistics
type UserActivityMetrics struct {
	ActiveUsers         int            `json:"activeUsers"`
	TotalActions        int            `json:"totalActions"`
	DocumentsInProgress int            `json:"documentsInProgress"`
	Users               []UserActivity `json:"users"`
}

// UserActivity represents activity for a single user
type UserActivity struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	Role            string     `json:"role"`
	ApprovalCount   int        `json:"approvalCount"`
	RejectionCount  int        `json:"rejectionCount"`
	ActiveDocuments int        `json:"activeDocuments"`
	LastActivity    *time.Time `json:"lastActivity"`
}

// AnalyticsDashboard represents comprehensive analytics
type AnalyticsDashboard struct {
	TotalPending         int                    `json:"totalPending"`
	TotalApproved        int                    `json:"totalApproved"`
	TotalRejected        int                    `json:"totalRejected"`
	AvgApprovalTime      float64                `json:"avgApprovalTime"`
	SLACompliance        float64                `json:"slaCompliance"`
	ApprovalTrends       []ApprovalTrend        `json:"approvalTrends"`
	DocumentDistribution []DocumentDistribution `json:"documentDistribution"`
	StageMetrics         []StageMetric          `json:"stageMetrics"`
	Bottleneck           *BottleneckInfo        `json:"bottleneck"`
}

// ApprovalTrend represents daily approval trends
type ApprovalTrend struct {
	Date     string `json:"date"`
	Approved int    `json:"approved"`
	Rejected int    `json:"rejected"`
	Pending  int    `json:"pending"`
}

// DocumentDistribution represents document type distribution
type DocumentDistribution struct {
	Type       string  `json:"type"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

// StageMetric represents performance metrics for an approval stage
type StageMetric struct {
	StageName         string  `json:"stageName"`
	AvgProcessingTime float64 `json:"avgProcessingTime"`
	DocumentCount     int     `json:"documentCount"`
	SLACompliance     float64 `json:"slaCompliance"`
}

// BottleneckInfo represents the slowest approval stage
type BottleneckInfo struct {
	StageName     string  `json:"stageName"`
	AvgDays       float64 `json:"avgDays"`
	DocumentCount int     `json:"documentCount"`
}

// ReportDocumentStats is an internal struct for repository queries
type ReportDocumentStats struct {
	Total            int
	Approved         int
	Rejected         int
	Draft            int
	Submitted        int
	Pending          int
	AvgApprovalDays  float64
	TypeBreakdown    DocumentTypeBreakdown
	StatusBreakdown  StatusBreakdown
}
