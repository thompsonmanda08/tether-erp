package types

import "time"

// RequisitionMetricsResponse represents comprehensive requisition analytics
type RequisitionMetricsResponse struct {
	StatusCounts          map[string]int64     `json:"statusCounts"`
	RejectionRate         float64              `json:"rejectionRate"`
	RejectionsOverTime    []RejectionTimeData  `json:"rejectionsOverTime"`
	RejectionReasons      []RejectionReason    `json:"rejectionReasons"`
	TopRejectingApprovers []ApproverStats      `json:"topRejectingApprovers"`
	TotalRequisitions     int64                `json:"totalRequisitions"`
	Period                string               `json:"period"`
}

// RejectionTimeData represents rejection data aggregated over time
type RejectionTimeData struct {
	Date       string  `json:"date"`
	Rejections int64   `json:"rejections"`
	Total      int64   `json:"total"`
	Rate       float64 `json:"rate"`
}

// RejectionReason represents a breakdown of rejection reasons
type RejectionReason struct {
	Reason     string  `json:"reason"`
	Count      int64   `json:"count"`
	Percentage float64 `json:"percentage"`
}

// ApproverStats represents statistics for an approver's performance
type ApproverStats struct {
	ApproverID    string  `json:"approverId"`
	ApproverName  string  `json:"approverName"`
	Rejections    int64   `json:"rejections"`
	Approvals     int64   `json:"approvals"`
	RejectionRate float64 `json:"rejectionRate"`
}

// AnalyticsQueryParams represents parameters for filtering analytics
type AnalyticsQueryParams struct {
	OrganizationID string
	StartDate      *time.Time
	EndDate        *time.Time
	Period         string // daily, weekly, monthly
	Department     string
}
