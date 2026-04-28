package handlers

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/tether-erp/config"
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

type AuthHandler struct {
	authService     *services.AuthService
	rbacService     *services.RBACService
	activityService *services.ActivityService
	sessionService  *services.SessionService
	validate        *validator.Validate
}

func NewAuthHandler(authService *services.AuthService, rbacService *services.RBACService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		rbacService: rbacService,
		validate:    validator.New(),
	}
}

// SetActivityService injects the activity service (called during app bootstrap)
func (h *AuthHandler) SetActivityService(svc *services.ActivityService) {
	h.activityService = svc
}

// SetSessionService injects the session service (called during app bootstrap)
func (h *AuthHandler) SetSessionService(svc *services.SessionService) {
	h.sessionService = svc
}

// GetAuthService returns the auth service instance
func (h *AuthHandler) GetAuthService() *services.AuthService {
	return h.authService
}

// Login handles user authentication with enhanced security
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("login_attempt_started")

	var req types.LoginRequest

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_login_request")
		return utils.SendBadRequestError(c, "Failed to parse login request")
	}

	// Add user context for all subsequent logs
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"email":      req.Email,
		"operation":  "login",
		"ip_address": c.IP(),
		"user_agent": c.Get("User-Agent"),
	})

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "login_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	// Get client info
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	logger.Debug("attempting_authentication")

	// Attempt login
	result, err := h.authService.Login(c.Context(), req.Email, req.Password, ipAddress, userAgent)
	if err != nil {
		logging.LogError(c, err, "authentication_failed", map[string]interface{}{
			"error_type": "authentication_failure",
		})
		// Log failed login attempt to activity log (best-effort; no userID available)
		if h.activityService != nil {
			h.activityService.LogActivity(c.Context(), &models.UserActivityLog{
				ActionType: models.ActionFailedLogin,
				IPAddress:  ipAddress,
				UserAgent:  userAgent,
				// UserID unknown at this point — use email as resource_id for audit
				ResourceType: "auth",
				ResourceID:   req.Email,
			})
		}
		// Return generic error for security
		return utils.SendUnauthorizedError(c, "Invalid email or password")
	}

	// Log successful login
	if h.activityService != nil {
		h.activityService.LogActivity(c.Context(), &models.UserActivityLog{
			UserID:       result.User.ID,
			ActionType:   models.ActionLogin,
			ResourceType: "auth",
			IPAddress:    ipAddress,
			UserAgent:    userAgent,
		})
	}

	// Add successful login context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":         result.User.ID,
		"organization_id": result.User.CurrentOrganizationID,
		"login_success":   true,
	})

	logger.Info("authentication_successful")
	return utils.SendSimpleSuccess(c, result, "Login successful")
}

// RefreshToken handles token refresh with enhanced security
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("token_refresh_attempt")

	var req types.RefreshTokenRequest

	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_refresh_token_request")
		return utils.SendBadRequestError(c, "Failed to parse refresh token request")
	}

	// Add operation context
	logging.AddFieldToRequest(c, "operation", "refresh_token")

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "refresh_token_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	logger.Debug("attempting_token_refresh")

	// Refresh token
	result, err := h.authService.RefreshToken(c.Context(), req.RefreshToken)
	if err != nil {
		logging.LogError(c, err, "token_refresh_failed", map[string]interface{}{
			"error_type": "token_refresh_failure",
		})
		return utils.SendUnauthorizedError(c, "Invalid or expired refresh token")
	}

	// Add success context - TokenResponse doesn't include user info
	// We could get user info from the session if needed, but for now just log success
	logger.Info("token_refresh_successful")
	return utils.SendSimpleSuccess(c, result, "Token refreshed successfully")
}

// Logout handles user logout with session cleanup
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("logout_attempt")

	var req types.RefreshTokenRequest

	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_logout_request")
		return utils.SendBadRequestError(c, "Failed to parse logout request")
	}

	// Add operation context
	logging.AddFieldToRequest(c, "operation", "logout")

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "logout_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	logger.Debug("attempting_logout")

	// Logout
	if err := h.authService.Logout(c.Context(), req.RefreshToken); err != nil {
		logging.LogError(c, err, "logout_failed", map[string]interface{}{
			"error_type": "logout_failure",
		})
		return utils.SendInternalError(c, "Failed to invalidate session", err)
	}

	logger.Info("logout_successful")
	return utils.SendSimpleSuccess(c, nil, "Logged out successfully")
}

// LogoutAll handles logout from all devices
func (h *AuthHandler) LogoutAll(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("logout_all_attempt")

	userID, ok := c.Locals("userID").(string)
	if !ok {
		logging.LogWarn(c, "logout_all_unauthorized", map[string]interface{}{
			"error": "user_not_authenticated",
		})
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	// Add user context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":   userID,
		"operation": "logout_all",
	})

	logger.Debug("attempting_logout_all_devices")

	// Logout from all devices
	if err := h.authService.LogoutAll(c.Context(), userID); err != nil {
		logging.LogError(c, err, "logout_all_failed", map[string]interface{}{
			"error_type": "logout_all_failure",
		})
		return utils.SendInternalError(c, "Failed to invalidate all sessions", err)
	}

	logger.Info("logout_all_successful")
	return utils.SendSimpleSuccess(c, nil, "Logged out from all devices successfully")
}

// RequestPasswordReset handles password reset requests
func (h *AuthHandler) RequestPasswordReset(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("password_reset_request_started")

	var req types.PasswordResetRequest

	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_password_reset_request")
		return utils.SendBadRequestError(c, "Failed to parse password reset request")
	}

	// Add operation context (don't log email for security)
	logging.AddFieldToRequest(c, "operation", "password_reset_request")

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "password_reset_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	logger.Debug("attempting_password_reset_token_creation")

	// Create password reset token
	token, err := h.authService.CreatePasswordReset(c.Context(), req.Email)
	if err != nil {
		// Log error but don't reveal if user exists for security
		logging.LogError(c, err, "password_reset_request_failed", map[string]interface{}{
			"error_type": "password_reset_failure",
			"email_hash": utils.HashEmail(req.Email), // Hash email for security
		})
	} else {
		logger.WithField("email_hash", utils.HashEmail(req.Email)).Info("password_reset_token_created")
	}

	// Always return success for security (don't reveal if email exists)
	// Note: In production, the token should be sent via email, not returned in response
	// The token is logged securely for development/testing purposes only
	if token != "" {
		logger.WithField("token_generated", true).Debug("password_reset_token_created")
	}
	return utils.SendSimpleSuccess(c, nil, "If the email exists, a password reset link has been sent")
}

// ResetPassword handles password reset with token
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("password_reset_attempt")

	var req types.ResetPasswordRequest

	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_reset_password_request")
		return utils.SendBadRequestError(c, "Failed to parse reset password request")
	}

	// Add operation context
	logging.AddFieldToRequest(c, "operation", "password_reset")

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "password_reset_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	logger.Debug("attempting_password_reset")

	// Reset password
	if err := h.authService.ResetPassword(c.Context(), req.Token, req.NewPassword); err != nil {
		logging.LogError(c, err, "password_reset_failed", map[string]interface{}{
			"error_type": "password_reset_failure",
		})
		return utils.SendBadRequestError(c, "Invalid or expired reset token")
	}

	logger.Info("password_reset_successful")
	return utils.SendSimpleSuccess(c, nil, "Password reset successfully")
}

// ChangePassword handles password change (requires current password)
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("password_change_attempt")

	userID, ok := c.Locals("userID").(string)
	if !ok {
		logging.LogWarn(c, "password_change_unauthorized", map[string]interface{}{
			"error": "user_not_authenticated",
		})
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	// Add user context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":   userID,
		"operation": "password_change",
	})

	var req types.ChangePasswordRequest

	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_change_password_request")
		return utils.SendBadRequestError(c, "Failed to parse change password request")
	}

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "password_change_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	logger.Debug("attempting_password_change")

	// Change password
	if err := h.authService.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		logging.LogError(c, err, "password_change_failed", map[string]interface{}{
			"error_type": "password_change_failure",
		})
		return utils.SendBadRequestError(c, "Current password is incorrect")
	}

	logger.Info("password_change_successful")
	return utils.SendSimpleSuccess(c, nil, "Password changed successfully")
}

// Register handles user registration
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("user_registration_attempt")

	var req types.RegisterRequest

	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_registration_request")
		return utils.SendBadRequestError(c, "Failed to parse registration request")
	}

	// Add registration context (don't log sensitive data)
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":  "register",
		"email":      req.Email,
		"role":       req.Role,
		"ip_address": c.IP(),
		"user_agent": c.Get("User-Agent"),
	})

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "registration_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	logger.Debug("attempting_user_registration")

	// Register user
	response, err := h.authService.Register(c.Context(), req.Email, req.Password, req.Name, req.Role, req.Position, req.ManNumber, req.NrcNumber, req.Contact)
	if err != nil {
		logging.LogError(c, err, "user_registration_failed", map[string]interface{}{
			"error_type": "registration_failure",
		})
		
		// Handle specific errors
		switch err {
		case services.ErrEmailAlreadyExists:
			return utils.SendConflictError(c, "Email already exists")
		default:
			return utils.SendInternalError(c, "Registration failed", err)
		}
	}

	// Add successful registration context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":         response.User.ID,
		"organization_id": response.User.CurrentOrganizationID,
		"registration_success": true,
	})

	logger.Info("user_registration_successful")

	// Return success response in the format expected by frontend
	return utils.SendCreatedSuccess(c, map[string]interface{}{
		"token":        response.AccessToken, // Legacy support
		"accessToken":  response.AccessToken,
		"refreshToken": response.RefreshToken,
		"expiresIn":    response.ExpiresIn,
		"user":         response.User,
		"organization": response.Organization,
	}, "User registered successfully")
}

// VerifyToken verifies a JWT token
func (h *AuthHandler) VerifyToken(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("token_verification_attempt")

	var req types.VerifyTokenRequest

	if err := c.BodyParser(&req); err != nil {
		logging.LogError(c, err, "failed_to_parse_token_verification_request")
		return utils.SendBadRequestError(c, "Failed to parse token verification request")
	}

	// Add operation context
	logging.AddFieldToRequest(c, "operation", "verify_token")

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		logging.LogWarn(c, "token_verification_validation_failed", map[string]interface{}{
			"validation_error": err.Error(),
		})
		return utils.SendValidationError(c, err.Error())
	}

	logger.Debug("attempting_token_verification")

	// Verify token using the auth service
	claims, err := h.authService.ValidateAccessToken(req.Token)
	if err != nil {
		logging.LogError(c, err, "token_verification_failed", map[string]interface{}{
			"error_type": "token_verification_failure",
		})
		return utils.SendUnauthorizedError(c, "Invalid or expired token")
	}

	// Add verified token context
	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":         claims.UserID,
		"organization_id": claims.OrganizationID,
		"role":            claims.Role,
	})

	logger.Info("token_verification_successful")

	return utils.SendSimpleSuccess(c, map[string]interface{}{
		"user_id":         claims.UserID,
		"email":           claims.Email,
		"role":            claims.Role,
		"organization_id": claims.OrganizationID,
		"expires_at":      claims.ExpiresAt,
	}, "Token is valid")
}

// GetProfile returns the current user's full profile (requires auth)
func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_profile_attempt")

	userID, ok := c.Locals("userID").(string)
	if !ok {
		logging.LogWarn(c, "get_profile_unauthorized", map[string]interface{}{
			"error": "user_not_authenticated",
		})
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":   userID,
		"operation": "get_profile",
	})

	user, err := h.authService.GetProfileByID(c.Context(), userID)
	if err != nil {
		return utils.SendNotFoundError(c, "User not found")
	}

	// Populate user's custom org role UUIDs so the frontend can match UUID-stored assigned_role values
	orgID, _ := c.Locals("organizationID").(string)
	if orgID != "" {
		roles, qerr := config.Queries.GetUserRoles(c.Context(), db.GetUserRolesParams{
			UserID:         userID,
			OrganizationID: orgID,
		})
		if qerr == nil {
			user.OrgRoleIds = make([]string, 0, len(roles))
			for _, r := range roles {
				if r.ID.Valid {
					user.OrgRoleIds = append(user.OrgRoleIds, uuid.UUID(r.ID.Bytes).String())
				}
			}
		}
	}

	logger.Info("profile_retrieved_successfully")
	return utils.SendSimpleSuccess(c, user, "Profile retrieved successfully")
}

// UpdateProfileRequest is the request body for PUT /auth/profile
type UpdateProfileRequest struct {
	Name        string                 `json:"name" validate:"required"`
	Email       string                 `json:"email" validate:"required,email"`
	Position    string                 `json:"position"`
	ManNumber   string                 `json:"manNumber"`
	NrcNumber   string                 `json:"nrcNumber"`
	Contact     string                 `json:"contact"`
	Preferences map[string]interface{} `json:"preferences"`
}

// UpdateProfile updates the current user's name, email, and preferences
func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("update_profile_attempt")

	userID, ok := c.Locals("userID").(string)
	if !ok {
		return utils.SendUnauthorizedError(c, "User not authenticated")
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Failed to parse request body")
	}
	if err := h.validate.Struct(req); err != nil {
		return utils.SendValidationError(c, err.Error())
	}

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"user_id":   userID,
		"operation": "update_profile",
	})

	user, err := h.authService.UpdateProfile(c.Context(), userID, req.Name, req.Email, req.Position, req.ManNumber, req.NrcNumber, req.Contact, req.Preferences)
	if err != nil {
		logger.WithError(err).Error("update_profile_failed")
		return utils.SendInternalError(c, "Failed to update profile", err)
	}

	logger.Info("profile_updated_successfully")
	return utils.SendSimpleSuccess(c, user, "Profile updated successfully")
}

// GetUserActivity returns the authenticated user's own activity log.
// GET /api/v1/auth/activity?page=1&limit=50&start_date=...&end_date=...&action_type=...
func (h *AuthHandler) GetUserActivity(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return utils.SendUnauthorizedError(c, "Unauthorized")
	}
	if h.activityService == nil {
		return utils.SendInternalError(c, "Activity service unavailable", nil)
	}

	var filters models.ActivityFilters
	if err := c.QueryParser(&filters); err != nil {
		return utils.SendBadRequestError(c, "Invalid query parameters")
	}

	resp, err := h.activityService.GetUserActivity(c.Context(), userID, filters)
	if err != nil {
		logging.LogError(c, err, "get_user_activity_failed")
		return utils.SendInternalError(c, "Failed to retrieve activity logs", err)
	}

	return utils.SendSimpleSuccess(c, resp, "Activity logs retrieved successfully")
}

// GetUserSessions returns the authenticated user's active sessions.
// GET /api/v1/auth/sessions
func (h *AuthHandler) GetUserSessions(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return utils.SendUnauthorizedError(c, "Unauthorized")
	}
	if h.sessionService == nil {
		return utils.SendInternalError(c, "Session service unavailable", nil)
	}

	// Pass the refresh token from cookie/header so we can mark isCurrent
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		refreshToken = c.Get("X-Refresh-Token")
	}

	sessions, err := h.sessionService.GetUserSessions(c.Context(), userID, refreshToken)
	if err != nil {
		logging.LogError(c, err, "get_user_sessions_failed")
		return utils.SendInternalError(c, "Failed to retrieve sessions", err)
	}

	return utils.SendSimpleSuccess(c, sessions, "Sessions retrieved successfully")
}

// TerminateSession deletes a specific session owned by the authenticated user.
// DELETE /api/v1/auth/sessions/:id
func (h *AuthHandler) TerminateSession(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(string)
	if !ok || userID == "" {
		return utils.SendUnauthorizedError(c, "Unauthorized")
	}
	if h.sessionService == nil {
		return utils.SendInternalError(c, "Session service unavailable", nil)
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return utils.SendBadRequestError(c, "Session ID is required")
	}

	if err := h.sessionService.TerminateSession(c.Context(), sessionID, userID); err != nil {
		if err.Error() == "session_service: session not owned by user" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You do not have permission to terminate this session",
			})
		}
		logging.LogError(c, err, "terminate_session_failed")
		return utils.SendInternalError(c, "Failed to terminate session", err)
	}

	// Log session termination to activity logs
	if h.activityService != nil {
		orgID, _ := c.Locals("organizationID").(string)
		var orgPtr *string
		if orgID != "" {
			orgPtr = &orgID
		}
		h.activityService.LogActivity(c.Context(), &models.UserActivityLog{
			UserID:         userID,
			OrganizationID: orgPtr,
			ActionType:     models.ActionSessionTerminate,
			ResourceType:   "session",
			ResourceID:     sessionID,
			IPAddress:      c.IP(),
			UserAgent:      c.Get("User-Agent"),
		})
	}

	return utils.SendSimpleSuccess(c, nil, "Session terminated successfully")
}