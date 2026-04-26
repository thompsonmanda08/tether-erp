package types

// Authentication request/response types
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	Name      string `json:"name" validate:"required"`
	Role      string `json:"role" validate:"required"`
	Position  string `json:"position,omitempty"`
	ManNumber string `json:"manNumber,omitempty"`
	NrcNumber string `json:"nrcNumber,omitempty"`
	Contact   string `json:"contact,omitempty"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
	Token        string `json:"token,omitempty"` // Legacy support
}

type VerifyTokenRequest struct {
	Token string `json:"token" validate:"required"`
}

type PasswordResetRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"newPassword" validate:"required,min=8"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" validate:"required"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

// Authentication response types
type AuthResponse struct {
	Success      bool                     `json:"success"`
	Message      string                   `json:"message"`
	Token        string                   `json:"token,omitempty"`        // Legacy JWT token
	AccessToken  string                   `json:"accessToken,omitempty"`  // New access token
	RefreshToken string                   `json:"refreshToken,omitempty"` // New refresh token
	ExpiresIn    int64                    `json:"expiresIn,omitempty"`    // Token expiration in seconds
	User         *UserResponse            `json:"user,omitempty"`
	Organization *OrganizationResponse    `json:"organization,omitempty"`
}

type VerifyTokenResponse struct {
	Valid bool          `json:"valid"`
	User  *UserResponse `json:"user,omitempty"`
	Error string        `json:"error,omitempty"`
}

type TokenResponse struct {
	AccessToken string `json:"accessToken"`
	ExpiresIn   int64  `json:"expiresIn"`
}

// User response type
type UserResponse struct {
	ID                    string                 `json:"id"`
	Email                 string                 `json:"email"`
	Name                  string                 `json:"name"`
	Role                  string                 `json:"role"`
	Active                bool                   `json:"active"`
	LastLogin             *string                `json:"lastLogin,omitempty"`
	CurrentOrganizationID *string                `json:"currentOrganizationId,omitempty"`
	IsSuperAdmin          bool                   `json:"isSuperAdmin,omitempty"`
	MustChangePassword    bool                   `json:"mustChangePassword,omitempty"`
	Preferences           map[string]interface{} `json:"preferences,omitempty"`
	CreatedAt             string                 `json:"createdAt"`
	UpdatedAt             string                 `json:"updatedAt,omitempty"`
}

// Organization response type
type OrganizationResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Active      bool   `json:"active"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt,omitempty"`
}

// Error response type
type ErrorResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// Generic API response wrapper
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    *MetaData   `json:"meta,omitempty"`
}

// Pagination metadata
type MetaData struct {
	Total       int64 `json:"total"`
	Page        int   `json:"page"`
	Limit       int   `json:"limit"`
	TotalPages  int   `json:"totalPages"`
	HasNext     bool  `json:"hasNext"`
	HasPrevious bool  `json:"hasPrevious"`
}
// Success response type
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Paginated response type
type PaginatedResponse struct {
	Success    bool           `json:"success"`
	Data       interface{}    `json:"data"`
	Pagination interface{}    `json:"pagination"` // Can be PaginationMeta or other pagination types
}