package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tether-erp/models"
	"github.com/tether-erp/repository"
)

// SessionService provides session management with metadata enrichment
type SessionService struct {
	sessionRepo repository.SessionRepositoryInterface
}

// NewSessionService creates a new SessionService
func NewSessionService(sessionRepo repository.SessionRepositoryInterface) *SessionService {
	return &SessionService{sessionRepo: sessionRepo}
}

// GetUserSessions returns all active sessions for a user, with device/browser metadata.
// currentSessionToken is the Bearer token from the current request — used to mark isCurrent.
func (s *SessionService) GetUserSessions(
	ctx context.Context,
	userID string,
	currentRefreshToken string,
) ([]*models.SessionWithMetadata, error) {
	raw, err := s.sessionRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("session_service: get sessions: %w", err)
	}

	now := time.Now()
	result := make([]*models.SessionWithMetadata, 0, len(raw))
	for _, r := range raw {
		ua := ""
		ip := ""
		if r.UserAgent != nil {
			ua = *r.UserAgent
		}
		if r.IpAddress != nil {
			ip = *r.IpAddress
		}
		expiresAt := r.ExpiresAt.Time
		isCurrent := r.RefreshToken == currentRefreshToken
		isExpired := expiresAt.Before(now)
		inactiveDays := int(now.Sub(r.CreatedAt.Time).Hours() / 24)

		result = append(result, &models.SessionWithMetadata{
			ID:           uuid.UUID(r.ID.Bytes),
			UserID:       r.UserID,
			IPAddress:    ip,
			UserAgent:    ua,
			DeviceType:   parseDeviceType(ua),
			Browser:      parseBrowser(ua),
			OS:           parseOS(ua),
			IsCurrent:    isCurrent,
			IsExpired:    isExpired,
			InactiveDays: inactiveDays,
			CreatedAt:    r.CreatedAt.Time,
			UpdatedAt:    r.UpdatedAt.Time,
			ExpiresAt:    expiresAt,
		})
	}
	return result, nil
}

// GetUserSessionsAdmin returns sessions for a user — admin can see expired ones too.
func (s *SessionService) GetUserSessionsAdmin(
	ctx context.Context,
	userID string,
	includeExpired bool,
) ([]*models.SessionWithMetadata, error) {
	raw, err := s.sessionRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("session_service: admin get sessions: %w", err)
	}

	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)

	result := make([]*models.SessionWithMetadata, 0, len(raw))
	for _, r := range raw {
		ua := ""
		ip := ""
		if r.UserAgent != nil {
			ua = *r.UserAgent
		}
		if r.IpAddress != nil {
			ip = *r.IpAddress
		}
		expiresAt := r.ExpiresAt.Time
		isExpired := expiresAt.Before(now)

		// For admin view: include expired if within last 30 days and includeExpired=true
		if isExpired && !includeExpired {
			continue
		}
		if isExpired && r.CreatedAt.Time.Before(thirtyDaysAgo) {
			continue
		}

		inactiveDays := int(now.Sub(r.UpdatedAt.Time).Hours() / 24)

		result = append(result, &models.SessionWithMetadata{
			ID:           uuid.UUID(r.ID.Bytes),
			UserID:       r.UserID,
			IPAddress:    ip,
			UserAgent:    ua,
			DeviceType:   parseDeviceType(ua),
			Browser:      parseBrowser(ua),
			OS:           parseOS(ua),
			IsCurrent:    false,
			IsExpired:    isExpired,
			InactiveDays: inactiveDays,
			CreatedAt:    r.CreatedAt.Time,
			UpdatedAt:    r.UpdatedAt.Time,
			ExpiresAt:    expiresAt,
		})
	}
	return result, nil
}

// TerminateSession deletes a session, verifying it belongs to the requesting user.
func (s *SessionService) TerminateSession(
	ctx context.Context,
	sessionIDStr string,
	requestingUserID string,
) error {
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		return fmt.Errorf("session_service: invalid session id: %w", err)
	}

	// Fetch sessions for this user and confirm ownership
	sessions, err := s.sessionRepo.GetByUserID(ctx, requestingUserID)
	if err != nil {
		return fmt.Errorf("session_service: verify ownership: %w", err)
	}

	owned := false
	for _, sess := range sessions {
		if uuid.UUID(sess.ID.Bytes) == sessionID {
			owned = true
			break
		}
	}
	if !owned {
		return fmt.Errorf("session_service: session not owned by user")
	}

	return s.sessionRepo.Delete(ctx, sessionID)
}

// TerminateAllUserSessions removes all sessions for the given user.
func (s *SessionService) TerminateAllUserSessions(ctx context.Context, userID string) error {
	return s.sessionRepo.DeleteByUserID(ctx, userID)
}

// ---- User-Agent parsing helpers (simple, no external library) ----

func parseDeviceType(ua string) string {
	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "mobile") || strings.Contains(lower, "android") || strings.Contains(lower, "iphone"):
		return "mobile"
	case strings.Contains(lower, "tablet") || strings.Contains(lower, "ipad"):
		return "tablet"
	default:
		return "desktop"
	}
}

func parseBrowser(ua string) string {
	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "edg/") || strings.Contains(lower, "edge/"):
		return "Microsoft Edge"
	case strings.Contains(lower, "chrome/") && !strings.Contains(lower, "chromium"):
		return "Google Chrome"
	case strings.Contains(lower, "firefox/"):
		return "Mozilla Firefox"
	case strings.Contains(lower, "safari/") && !strings.Contains(lower, "chrome"):
		return "Safari"
	case strings.Contains(lower, "opr/") || strings.Contains(lower, "opera/"):
		return "Opera"
	case strings.Contains(lower, "msie") || strings.Contains(lower, "trident/"):
		return "Internet Explorer"
	default:
		return "Unknown"
	}
}

func parseOS(ua string) string {
	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "windows nt"):
		return "Windows"
	case strings.Contains(lower, "mac os x") || strings.Contains(lower, "macos"):
		return "macOS"
	case strings.Contains(lower, "iphone os") || strings.Contains(lower, "ios"):
		return "iOS"
	case strings.Contains(lower, "android"):
		return "Android"
	case strings.Contains(lower, "linux"):
		return "Linux"
	default:
		return "Unknown"
	}
}
