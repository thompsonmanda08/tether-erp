package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/tether-erp/config"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/models"
	"github.com/tether-erp/repository"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// Authentication service with session management and security features.
//
// Migrated off GORM: all direct DB writes go through the package-global
// pgx pool (config.PgxDB) and sqlc-generated queries (config.Queries).
// Repository abstractions (already sqlc-backed) are still used for
// session/lockout/login-attempt persistence.
type AuthService struct {
	userRepo          repository.UserRepositoryInterface
	sessionRepo       repository.SessionRepositoryInterface
	passwordResetRepo repository.PasswordResetRepositoryInterface
	loginAttemptRepo  repository.LoginAttemptRepositoryInterface
	lockoutRepo       repository.AccountLockoutRepositoryInterface
	auditService      *AuditService
	jwtSecret         string
}

// Configuration constants
const (
	AccessTokenDuration     = 24 * time.Hour     // 24 hours
	RefreshTokenDuration    = 7 * 24 * time.Hour // 7 days
	PasswordResetExpiry     = 1 * time.Hour
	EmailVerificationExpiry = 24 * time.Hour
	MaxFailedAttempts       = 5
	AccountLockoutDuration  = 15 * time.Minute // Import from auth_service
	MaxSessionsPerUser      = 5
)

// Custom errors
var (
	ErrInvalidCredentials    = errors.New("invalid email or password")
	ErrAccountLocked         = errors.New("account is locked due to too many failed login attempts")
	ErrAccountInactive       = errors.New("account is inactive")
	ErrEmailNotVerified      = errors.New("email not verified")
	ErrUserNotFound          = errors.New("user not found")
	ErrInvalidToken          = errors.New("invalid or expired token")
	ErrEmailAlreadyExists    = errors.New("email already exists")
	ErrTooManyFailedAttempts = errors.New("too many failed login attempts")
	ErrSessionExpired        = errors.New("session expired")
	ErrInvalidRefreshToken   = errors.New("invalid refresh token")
	ErrTokenReuseDetected    = errors.New("token reuse detected")
)

// JWT Claims structure
type JWTClaims struct {
	UserID         string  `json:"user_id"`
	Email          string  `json:"email"`
	Name           string  `json:"name"`
	Role           string  `json:"role"`
	OrganizationID *string `json:"organization_id,omitempty"`
	SessionID      string  `json:"session_id"`
	jwt.RegisteredClaims
}

// Login response structure
type LoginResponse struct {
	AccessToken  string                      `json:"accessToken"`
	RefreshToken string                      `json:"refreshToken"`
	ExpiresIn    int64                       `json:"expiresIn"`
	User         *types.UserResponse         `json:"user"`
	Organization *types.OrganizationResponse `json:"organization,omitempty"`
}

// Token refresh response
type TokenResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken,omitempty"` // Include new refresh token for rotation
	ExpiresIn    int64  `json:"expiresIn"`
}

// NewAuthService creates a new authentication service.
//
// The previous *gorm.DB parameter has been removed as part of the
// GORM → sqlc + pgxpool migration; ad-hoc DB access goes through
// config.PgxDB / config.Queries.
func NewAuthService(
	userRepo repository.UserRepositoryInterface,
	sessionRepo repository.SessionRepositoryInterface,
	passwordResetRepo repository.PasswordResetRepositoryInterface,
	loginAttemptRepo repository.LoginAttemptRepositoryInterface,
	lockoutRepo repository.AccountLockoutRepositoryInterface,
	auditService *AuditService,
	jwtSecret string,
) *AuthService {
	return &AuthService{
		userRepo:          userRepo,
		sessionRepo:       sessionRepo,
		passwordResetRepo: passwordResetRepo,
		loginAttemptRepo:  loginAttemptRepo,
		lockoutRepo:       lockoutRepo,
		auditService:      auditService,
		jwtSecret:         jwtSecret,
	}
}

// Login authenticates a user and creates a session
func (s *AuthService) Login(ctx context.Context, email, password, ipAddress, userAgent string) (*LoginResponse, error) {
	// Check for recent failed attempts
	recentFailures, err := s.loginAttemptRepo.GetRecentFailedAttempts(ctx, email, time.Now().Add(-1*time.Hour))
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"email":     email,
			"operation": "check_recent_failed_attempts",
		}).WithError(err).Error("failed_to_check_recent_failed_attempts")
	}

	if recentFailures >= MaxFailedAttempts {
		// Record failed attempt
		s.recordLoginAttempt(ctx, "", email, ipAddress, userAgent, false, "too many failed attempts")
		return nil, ErrTooManyFailedAttempts
	}

	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Record failed attempt (user not found)
		s.recordLoginAttempt(ctx, "", email, ipAddress, userAgent, false, "user not found")
		return nil, ErrInvalidCredentials
	}

	// Check if account is locked
	lockout, err := s.lockoutRepo.GetActiveByUserID(ctx, user.ID)
	if err == nil && lockout != nil {
		// Record failed attempt (account locked)
		s.recordLoginAttempt(ctx, user.ID, email, ipAddress, userAgent, false, "account locked")
		return nil, ErrAccountLocked
	}

	// Check if account is active
	if !user.Active {
		// Record failed attempt (account inactive)
		s.recordLoginAttempt(ctx, user.ID, email, ipAddress, userAgent, false, "account inactive")
		return nil, ErrAccountInactive
	}

	// Verify password
	if !utils.VerifyPassword(user.Password, password) {
		// Record failed attempt
		s.recordLoginAttempt(ctx, user.ID, email, ipAddress, userAgent, false, "invalid password")

		// Check if we should lock the account
		recentUserFailures, _ := s.loginAttemptRepo.GetRecentFailedAttempts(ctx, email, time.Now().Add(-1*time.Hour))
		if recentUserFailures >= MaxFailedAttempts-1 { // -1 because we just recorded one
			s.lockAccount(ctx, user.ID, email, ipAddress, "too many failed login attempts")
		}

		return nil, ErrInvalidCredentials
	}

	// Generate refresh token
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("auth_service: generate refresh token: %w", err)
	}

	// Create session
	session, err := s.sessionRepo.Create(ctx, user.ID, refreshToken, ipAddress, userAgent, time.Now().Add(RefreshTokenDuration))
	if err != nil {
		return nil, fmt.Errorf("auth_service: create session: %w", err)
	}

	// Generate access token
	var sessionIDStr string
	if session.ID.Valid {
		sessionIDStr = uuid.UUID(session.ID.Bytes).String()
	}
	accessToken, err := s.generateAccessToken(user, sessionIDStr)
	if err != nil {
		return nil, fmt.Errorf("auth_service: generate access token: %w", err)
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		logging.WithFields(map[string]interface{}{
			"user_id":   user.ID,
			"operation": "update_last_login",
		}).WithError(err).Warn("failed_to_update_last_login")
	}

	// Record successful login attempt
	s.recordLoginAttempt(ctx, user.ID, email, ipAddress, userAgent, true, "")

	// Log audit event
	if s.auditService != nil {
		s.auditService.LogAuthEvent(ctx, user.ID, user.Email, user.CurrentOrganizationID, "login", true, "successful login", ipAddress, userAgent)
	}

	// Clean up old sessions for this user (keep only the latest 5)
	// Use a timeout context for background cleanup to ensure it doesn't run indefinitely
	cleanupCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	go func() {
		defer cancel()
		s.cleanupOldSessions(cleanupCtx, user.ID)
	}()

	// Build response
	response := &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(AccessTokenDuration.Seconds()),
		User: &types.UserResponse{
			ID:                 user.ID,
			Email:              user.Email,
			Name:               user.Name,
			Role:               user.Role,
			Active:             user.Active,
			MustChangePassword: user.MustChangePassword,
			CreatedAt:          user.CreatedAt.Format(time.RFC3339),
		},
	}

	// Add preferences if available
	if len(user.Preferences) > 0 {
		var prefs map[string]interface{}
		if err := json.Unmarshal(user.Preferences, &prefs); err == nil {
			response.User.Preferences = prefs
		}
	}

	// Add organization info if available
	if user.CurrentOrganization != nil {
		response.Organization = &types.OrganizationResponse{
			ID:          user.CurrentOrganization.ID,
			Name:        user.CurrentOrganization.Name,
			Slug:        user.CurrentOrganization.Slug,
			Description: user.CurrentOrganization.Description,
			Active:      user.CurrentOrganization.Active,
			CreatedAt:   user.CurrentOrganization.CreatedAt.Format(time.RFC3339),
		}
	}

	return response, nil
}

// RefreshToken generates a new access token using a refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*TokenResponse, error) {
	// Get session by refresh token
	session, err := s.sessionRepo.GetByRefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}

	// Check if session is expired
	if session.ExpiresAt.Valid && time.Now().After(session.ExpiresAt.Time) {
		// Clean up expired session
		if session.ID.Valid {
			sessionUUID := uuid.UUID(session.ID.Bytes)
			s.sessionRepo.Delete(ctx, sessionUUID)
		}
		return nil, ErrSessionExpired
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	// Check if user is still active
	if !user.Active {
		// Invalidate session
		if session.ID.Valid {
			sessionUUID := uuid.UUID(session.ID.Bytes)
			s.sessionRepo.Delete(ctx, sessionUUID)
		}
		return nil, ErrAccountInactive
	}

	// Generate new refresh token for rotation (security best practice)
	newRefreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("auth_service: generate new refresh token: %w", err)
	}

	// Update session with new refresh token and extended expiration
	// We use the old refresh token in the WHERE clause to ensure atomicity
	newExpiresAt := time.Now().Add(RefreshTokenDuration)
	if session.ID.Valid {
		sessionUUID := uuid.UUID(session.ID.Bytes)
		rowsAffected, err := s.sessionRepo.UpdateRefreshToken(ctx, sessionUUID, refreshToken, newRefreshToken, newExpiresAt)
		if err != nil {
			return nil, fmt.Errorf("auth_service: update session: %w", err)
		}

		if rowsAffected == 0 {
			// This happens if the session was deleted or the refresh token was already rotated
			// This is a sign of either a race condition or token theft (reuse)
			logging.WithFields(map[string]interface{}{
				"user_id":    user.ID,
				"session_id": sessionUUID.String(),
			}).Warn("refresh_token_reuse_detected")
			return nil, ErrTokenReuseDetected
		}
	}

	// Generate new access token
	var sessionIDStr string
	if session.ID.Valid {
		sessionIDStr = uuid.UUID(session.ID.Bytes).String()
	}
	accessToken, err := s.generateAccessToken(user, sessionIDStr)
	if err != nil {
		return nil, fmt.Errorf("auth_service: generate access token: %w", err)
	}

	// Log audit event for token refresh
	if s.auditService != nil {
		s.auditService.LogAuthEvent(ctx, user.ID, user.Email, user.CurrentOrganizationID, "token_refresh", true, "access token refreshed", "", "")
	}

	return &TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken, // Return new refresh token
		ExpiresIn:    int64(AccessTokenDuration.Seconds()),
	}, nil
}

// Logout invalidates a refresh token and deletes the session
func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	return s.sessionRepo.DeleteByRefreshToken(ctx, refreshToken)
}

// LogoutAll invalidates all sessions for a user
func (s *AuthService) LogoutAll(ctx context.Context, userID string) error {
	return s.sessionRepo.DeleteByUserID(ctx, userID)
}

// ValidateAccessToken validates and parses a JWT access token
func (s *AuthService) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// CreatePasswordReset creates a password reset token
func (s *AuthService) CreatePasswordReset(ctx context.Context, email string) (string, error) {
	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", ErrUserNotFound
	}

	// Generate reset token
	token, err := s.generateSecureToken()
	if err != nil {
		return "", fmt.Errorf("auth_service: generate reset token: %w", err)
	}

	// Create password reset record
	_, err = s.passwordResetRepo.Create(ctx, user.ID, token, time.Now().Add(PasswordResetExpiry))
	if err != nil {
		return "", fmt.Errorf("auth_service: create password reset: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		s.auditService.LogAuthEvent(ctx, user.ID, user.Email, user.CurrentOrganizationID, "password_reset_requested", true, "password reset token created", "", "")
	}

	return token, nil
}

// ResetPassword resets a user's password using a reset token
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	// Get password reset record
	resetRecord, err := s.passwordResetRepo.GetByToken(ctx, token)
	if err != nil {
		return ErrInvalidToken
	}

	// Validate password strength
	if err := utils.ValidatePasswordStrength(newPassword); err != nil {
		return fmt.Errorf("auth_service: password validation: %w", err)
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("auth_service: hash password: %w", err)
	}

	// Update user password
	if err := s.userRepo.UpdatePassword(ctx, resetRecord.UserID, hashedPassword); err != nil {
		return fmt.Errorf("auth_service: update password: %w", err)
	}

	// Mark reset token as used
	if resetRecord.ID.Valid {
		resetUUID := uuid.UUID(resetRecord.ID.Bytes)
		if err := s.passwordResetRepo.MarkAsUsed(ctx, resetUUID); err != nil {
			logging.WithFields(map[string]interface{}{
				"reset_id":  resetUUID.String(),
				"operation": "mark_password_reset_as_used",
			}).WithError(err).Warn("failed_to_mark_password_reset_as_used")
		}
	}

	// Invalidate all sessions for the user (force re-login)
	if err := s.sessionRepo.DeleteByUserID(ctx, resetRecord.UserID); err != nil {
		logging.WithFields(map[string]interface{}{
			"user_id":   resetRecord.UserID,
			"operation": "invalidate_user_sessions_after_password_reset",
		}).WithError(err).Warn("failed_to_invalidate_user_sessions")
	}

	// Log audit event
	if s.auditService != nil {
		user, _ := s.userRepo.GetByID(ctx, resetRecord.UserID)
		if user != nil {
			s.auditService.LogAuthEvent(ctx, user.ID, user.Email, user.CurrentOrganizationID, "password_reset_completed", true, "password reset using token", "", "")
		}
	}

	return nil
}

// ChangePassword changes a user's password (requires current password)
func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	// Verify current password
	if !utils.VerifyPassword(user.Password, currentPassword) {
		return ErrInvalidCredentials
	}

	// Validate new password strength
	if err := utils.ValidatePasswordStrength(newPassword); err != nil {
		return fmt.Errorf("auth_service: password validation: %w", err)
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("auth_service: hash password: %w", err)
	}

	// Update password
	if err := s.userRepo.UpdatePassword(ctx, userID, hashedPassword); err != nil {
		return fmt.Errorf("auth_service: update password: %w", err)
	}

	// Clear the must-change-password flag now that the user has set their own password.
	// Direct pgx UPDATE — non-fatal: log but don't fail the request.
	if config.PgxDB != nil {
		if _, err := config.PgxDB.Exec(ctx,
			`UPDATE users SET must_change_password = false, updated_at = NOW() WHERE id = $1`,
			userID,
		); err != nil {
			logging.WithFields(map[string]interface{}{
				"user_id": userID,
			}).WithError(err).Warn("failed_to_clear_must_change_password_flag")
		}
	}

	// Log audit event
	if s.auditService != nil {
		s.auditService.LogAuthEvent(ctx, user.ID, user.Email, user.CurrentOrganizationID, "password_changed", true, "password changed by user", "", "")
	}

	return nil
}

// Register creates a new user account with organization
func (s *AuthService) Register(ctx context.Context, email, password, name, role string, position, manNumber, nrcNumber, contact string) (*LoginResponse, error) {
	// Check if user already exists
	existingUser, err := s.userRepo.GetByEmail(ctx, email)
	if err == nil && existingUser != nil {
		return nil, ErrEmailAlreadyExists
	}

	// Validate password strength
	if err := utils.ValidatePasswordStrength(password); err != nil {
		return nil, fmt.Errorf("auth_service: password validation: %w", err)
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("auth_service: hash password: %w", err)
	}

	// Create user
	user := &models.User{
		ID:        uuid.New().String(),
		Email:     email,
		Name:      name,
		Password:  hashedPassword,
		Role:      role,
		Active:    true,
		Position:  position,
		ManNumber: manNumber,
		NrcNumber: nrcNumber,
		Contact:   contact,
	}

	createdUser, err := s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("auth_service: create user: %w", err)
	}

	// Create personal organization for the user.
	//
	// The previous implementation wrapped this in a single GORM transaction
	// that also flipped the user's current_organization_id. The org creation
	// itself already runs inside its own pgx transaction (see
	// OrganizationService.CreateOrganization), so we run the user-update as
	// a separate statement afterwards. If either step fails we log and
	// continue — registration shouldn't fail because of org bootstrap issues.
	var personalOrg *models.Organization
	{
		orgService := NewOrganizationService()
		org, orgErr := orgService.CreateOrganization(
			fmt.Sprintf("%s's Organization", name),
			fmt.Sprintf("Personal organization for %s", name),
			"",
			createdUser.ID,
		)
		if orgErr != nil {
			logging.WithFields(map[string]interface{}{
				"user_id":   createdUser.ID,
				"operation": "create_personal_organization",
			}).WithError(orgErr).Error("failed_to_create_personal_organization")
		} else {
			personalOrg = org
			createdUser.CurrentOrganizationID = &personalOrg.ID

			if config.PgxDB != nil {
				if _, updErr := config.PgxDB.Exec(ctx,
					`UPDATE users SET current_organization_id = $1, updated_at = NOW() WHERE id = $2`,
					personalOrg.ID, createdUser.ID,
				); updErr != nil {
					logging.WithFields(map[string]interface{}{
						"user_id":         createdUser.ID,
						"organization_id": personalOrg.ID,
						"operation":       "update_user_current_organization",
					}).WithError(updErr).Error("failed_to_update_user_current_organization")
				}
			}
		}
	}

	// Generate refresh token
	refreshToken, err := s.generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("auth_service: generate refresh token: %w", err)
	}

	// Create session
	session, err := s.sessionRepo.Create(ctx, createdUser.ID, refreshToken, "", "", time.Now().Add(RefreshTokenDuration))
	if err != nil {
		return nil, fmt.Errorf("auth_service: create session: %w", err)
	}

	// Generate access token
	var sessionIDStr string
	if session.ID.Valid {
		sessionIDStr = uuid.UUID(session.ID.Bytes).String()
	}
	accessToken, err := s.generateAccessToken(createdUser, sessionIDStr)
	if err != nil {
		return nil, fmt.Errorf("auth_service: generate access token: %w", err)
	}

	// Log audit event
	if s.auditService != nil {
		s.auditService.LogAuthEvent(ctx, createdUser.ID, createdUser.Email, createdUser.CurrentOrganizationID, "user_registered", true, "user account created", "", "")
	}

	// Build response
	response := &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(AccessTokenDuration.Seconds()),
		User: &types.UserResponse{
			ID:        createdUser.ID,
			Email:     createdUser.Email,
			Name:      createdUser.Name,
			Role:      createdUser.Role,
			Active:    createdUser.Active,
			CreatedAt: createdUser.CreatedAt.Format(time.RFC3339),
		},
	}

	// Add preferences if available
	if len(createdUser.Preferences) > 0 {
		var prefs map[string]interface{}
		if err := json.Unmarshal(createdUser.Preferences, &prefs); err == nil {
			response.User.Preferences = prefs
		}
	}

	// Add organization info if available
	if personalOrg != nil {
		response.Organization = &types.OrganizationResponse{
			ID:          personalOrg.ID,
			Name:        personalOrg.Name,
			Slug:        personalOrg.Slug,
			Description: personalOrg.Description,
			Active:      personalOrg.Active,
			CreatedAt:   personalOrg.CreatedAt.Format(time.RFC3339),
		}
	}

	return response, nil
}

// Helper methods

func (s *AuthService) generateAccessToken(user *models.User, sessionID string) (string, error) {
	claims := JWTClaims{
		UserID:         user.ID,
		Email:          user.Email,
		Name:           user.Name,
		Role:           user.Role,
		OrganizationID: user.CurrentOrganizationID,
		SessionID:      sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) generateRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (s *AuthService) generateSecureToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (s *AuthService) recordLoginAttempt(ctx context.Context, userID, email, ipAddress, userAgent string, success bool, failureReason string) {
	_, err := s.loginAttemptRepo.Create(ctx, userID, email, ipAddress, userAgent, success, failureReason)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"user_id":        userID,
			"email":          email,
			"ip_address":     ipAddress,
			"success":        success,
			"failure_reason": failureReason,
			"operation":      "record_login_attempt",
		}).WithError(err).Warn("failed_to_record_login_attempt")
	}
}

func (s *AuthService) lockAccount(ctx context.Context, userID, email, ipAddress, reason string) {
	unlocksAt := time.Now().Add(AccountLockoutDuration)
	_, err := s.lockoutRepo.Create(ctx, userID, email, ipAddress, reason, unlocksAt)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"user_id":    userID,
			"email":      email,
			"ip_address": ipAddress,
			"reason":     reason,
			"unlocks_at": unlocksAt,
			"operation":  "lock_account",
		}).WithError(err).Warn("failed_to_lock_account")
	}

	// Log audit event
	if s.auditService != nil {
		s.auditService.LogAuthEvent(ctx, userID, email, nil, "account_locked", true, reason, ipAddress, "")
	}
}

func (s *AuthService) cleanupOldSessions(ctx context.Context, userID string) {
	sessions, err := s.sessionRepo.GetByUserID(ctx, userID)
	if err != nil {
		logging.WithFields(map[string]interface{}{
			"user_id":   userID,
			"operation": "get_user_sessions_for_cleanup",
		}).WithError(err).Warn("failed_to_get_user_sessions_for_cleanup")
		return
	}

	if len(sessions) > MaxSessionsPerUser {
		// Sort by creation date and keep only the latest ones
		// This is a simplified approach - in production you might want more sophisticated logic
		for i := MaxSessionsPerUser; i < len(sessions); i++ {
			if sessions[i].ID.Valid {
				sessionUUID := uuid.UUID(sessions[i].ID.Bytes)
				s.sessionRepo.Delete(ctx, sessionUUID)
			}
		}
	}
}

// Cleanup methods (should be called periodically)

func (s *AuthService) CleanupExpiredSessions(ctx context.Context) error {
	return s.sessionRepo.DeleteExpired(ctx)
}

func (s *AuthService) CleanupExpiredPasswordResets(ctx context.Context) error {
	return s.passwordResetRepo.DeleteExpired(ctx)
}

func (s *AuthService) CleanupExpiredLockouts(ctx context.Context) error {
	return s.lockoutRepo.CleanupExpired(ctx)
}

func (s *AuthService) CleanupOldLoginAttempts(ctx context.Context, retentionDays int) error {
	cutoff := time.Now().Add(-time.Duration(retentionDays) * 24 * time.Hour)
	return s.loginAttemptRepo.DeleteOld(ctx, cutoff)
}

// GetProfileByID returns the full user record for the given user ID.
func (s *AuthService) GetProfileByID(ctx context.Context, userID string) (*models.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

// UpdateProfile updates the user's name, email, profile fields, and preferences JSONB column.
func (s *AuthService) UpdateProfile(ctx context.Context, userID, name, email, position, manNumber, nrcNumber, contact string, preferences map[string]interface{}) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	user.Name = name
	user.Email = email
	user.Position = position
	user.ManNumber = manNumber
	user.NrcNumber = nrcNumber
	user.Contact = contact
	if preferences != nil {
		// Merge with existing preferences so unrelated keys (e.g. device tokens) are preserved
		merged := make(map[string]interface{})
		if len(user.Preferences) > 0 {
			if err := json.Unmarshal(user.Preferences, &merged); err != nil {
				merged = make(map[string]interface{})
			}
		}
		for k, v := range preferences {
			merged[k] = v
		}
		prefsJSON, err := json.Marshal(merged)
		if err != nil {
			return nil, err
		}
		user.Preferences = json.RawMessage(prefsJSON)
	}
	return s.userRepo.Update(ctx, user)
}
