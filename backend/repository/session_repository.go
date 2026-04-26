package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
)

type SessionRepository struct {
	db      *pgxpool.Pool
	queries *sqlc.Queries
}

func NewSessionRepository(db *pgxpool.Pool) SessionRepositoryInterface {
	return &SessionRepository{
		db:      db,
		queries: sqlc.New(db),
	}
}

func (r *SessionRepository) Create(ctx context.Context, userID, refreshToken, ipAddress, userAgent string, expiresAt time.Time) (*sqlc.Session, error) {
	var ipAddr, userAg *string
	if ipAddress != "" {
		ipAddr = &ipAddress
	}
	if userAgent != "" {
		userAg = &userAgent
	}

	session, err := r.queries.CreateSession(ctx, sqlc.CreateSessionParams{
		UserID:       userID,
		RefreshToken: refreshToken,
		IpAddress:    ipAddr,
		UserAgent:    userAg,
		ExpiresAt:    pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}
	return &session, nil
}

func (r *SessionRepository) GetByRefreshToken(ctx context.Context, refreshToken string) (*sqlc.Session, error) {
	session, err := r.queries.GetSessionByRefreshToken(ctx, sqlc.GetSessionByRefreshTokenParams{RefreshToken: refreshToken})
	if err != nil {
		return nil, fmt.Errorf("failed to get session by refresh token: %w", err)
	}
	return &session, nil
}

func (r *SessionRepository) GetByUserID(ctx context.Context, userID string) ([]*sqlc.Session, error) {
	sessions, err := r.queries.GetSessionsByUserID(ctx, sqlc.GetSessionsByUserIDParams{UserID: userID})
	if err != nil {
		return nil, fmt.Errorf("failed to get sessions by user ID: %w", err)
	}
	result := make([]*sqlc.Session, len(sessions))
	for i := range sessions {
		result[i] = &sessions[i]
	}
	return result, nil
}

func (r *SessionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.queries.DeleteSession(ctx, sqlc.DeleteSessionParams{ID: pgtype.UUID{Bytes: id, Valid: true}}); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

func (r *SessionRepository) DeleteByRefreshToken(ctx context.Context, refreshToken string) error {
	if err := r.queries.DeleteSessionByRefreshToken(ctx, sqlc.DeleteSessionByRefreshTokenParams{RefreshToken: refreshToken}); err != nil {
		return fmt.Errorf("failed to delete session by refresh token: %w", err)
	}
	return nil
}

func (r *SessionRepository) DeleteByUserID(ctx context.Context, userID string) error {
	if err := r.queries.DeleteSessionsByUserID(ctx, sqlc.DeleteSessionsByUserIDParams{UserID: userID}); err != nil {
		return fmt.Errorf("failed to delete sessions by user ID: %w", err)
	}
	return nil
}

func (r *SessionRepository) DeleteExpired(ctx context.Context) error {
	if err := r.queries.DeleteExpiredSessions(ctx); err != nil {
		return fmt.Errorf("failed to delete expired sessions: %w", err)
	}
	return nil
}

func (r *SessionRepository) CountActive(ctx context.Context) (int64, error) {
	count, err := r.queries.CountActiveSessions(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to count active sessions: %w", err)
	}
	return count, nil
}

func (r *SessionRepository) CountUserActive(ctx context.Context, userID string) (int64, error) {
	count, err := r.queries.CountUserActiveSessions(ctx, sqlc.CountUserActiveSessionsParams{UserID: userID})
	if err != nil {
		return 0, fmt.Errorf("failed to count user active sessions: %w", err)
	}
	return count, nil
}

// UpdateRefreshToken updates the refresh token for a session with old token verification.
func (r *SessionRepository) UpdateRefreshToken(ctx context.Context, id uuid.UUID, oldRefreshToken, newRefreshToken string, expiresAt time.Time) (int64, error) {
	rowsAffected, err := r.queries.UpdateSessionRefreshToken(ctx, sqlc.UpdateSessionRefreshTokenParams{
		ID:             pgtype.UUID{Bytes: id, Valid: true},
		RefreshToken:   newRefreshToken,
		ExpiresAt:      pgtype.Timestamptz{Time: expiresAt, Valid: true},
		RefreshToken_2: oldRefreshToken,
	})
	if err != nil {
		return 0, err
	}
	return rowsAffected, nil
}
