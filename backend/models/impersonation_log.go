package models

import "time"

// ImpersonationLog records every impersonation event for audit and security purposes.
// Only super_admin users can view this log via the admin console.
type ImpersonationLog struct {
	ID                string     `json:"id"`
	ImpersonatorID    string     `json:"impersonator_id"`
	ImpersonatorEmail string     `json:"impersonator_email"`
	TargetID          string     `json:"target_id"`
	TargetEmail       string     `json:"target_email"`
	// ImpersonationType: "platform_user" or "admin_user"
	ImpersonationType string     `json:"impersonation_type"`
	TokenJTI          string     `json:"token_jti"`
	Reason            string     `json:"reason,omitempty"`
	ExpiresAt         time.Time  `json:"expires_at"`
	Revoked           bool       `json:"revoked"`
	RevokedAt         *time.Time `json:"revoked_at,omitempty"`
	RevokedBy         *string    `json:"revoked_by,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}
