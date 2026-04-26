package utils

// TenantContext carries the resolved organization scope for a request.
// Populated by middleware.TenantMiddleware and read by handlers/services.
type TenantContext struct {
	OrganizationID string
	UserID         string
	UserRole       string
	Department     string
}
