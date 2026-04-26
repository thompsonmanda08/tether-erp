package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
)

type LoginAttemptRepository struct {
	db      *pgxpool.Pool
	queries *sqlc.Queries
}

func NewLoginAttemptRepository(db *pgxpool.Pool) LoginAttemptRepositoryInterface {
	return &LoginAttemptRepository{
		db:      db,
		queries: sqlc.New(db),
	}
}

func (r *LoginAttemptRepository) Create(ctx context.Context, userID, email, ipAddress, userAgent string, success bool, failureReason string) (*sqlc.LoginAttempt, error) {
	var userIDPtr, ipAddrPtr, userAgPtr, failureReasonPtr *string

	if userID != "" {
		userIDPtr = &userID
	}
	if ipAddress != "" {
		ipAddrPtr = &ipAddress
	}
	if userAgent != "" {
		userAgPtr = &userAgent
	}
	if failureReason != "" {
		failureReasonPtr = &failureReason
	}

	attempt, err := r.queries.CreateLoginAttempt(ctx, sqlc.CreateLoginAttemptParams{
		UserID:        userIDPtr,
		Email:         email,
		IpAddress:     ipAddrPtr,
		UserAgent:     userAgPtr,
		Success:       success,
		FailureReason: failureReasonPtr,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create login attempt: %w", err)
	}
	return &attempt, nil
}

func (r *LoginAttemptRepository) GetRecentFailedAttempts(ctx context.Context, email string, since time.Time) (int64, error) {
	count, err := r.queries.GetRecentFailedAttempts(ctx, sqlc.GetRecentFailedAttemptsParams{
		Email:       email,
		AttemptedAt: pgtype.Timestamptz{Time: since, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get recent failed attempts: %w", err)
	}
	return count, nil
}

func (r *LoginAttemptRepository) GetRecentFailedAttemptsByIP(ctx context.Context, ipAddress string, since time.Time) (int64, error) {
	var ipAddrPtr *string
	if ipAddress != "" {
		ipAddrPtr = &ipAddress
	}
	count, err := r.queries.GetRecentFailedAttemptsByIP(ctx, sqlc.GetRecentFailedAttemptsByIPParams{
		IpAddress:   ipAddrPtr,
		AttemptedAt: pgtype.Timestamptz{Time: since, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get recent failed attempts by IP: %w", err)
	}
	return count, nil
}

func (r *LoginAttemptRepository) GetByUser(ctx context.Context, userID string, limit, offset int) ([]*sqlc.LoginAttempt, error) {
	var userIDPtr *string
	if userID != "" {
		userIDPtr = &userID
	}
	attempts, err := r.queries.GetLoginAttemptsByUser(ctx, sqlc.GetLoginAttemptsByUserParams{
		UserID: userIDPtr,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get login attempts by user: %w", err)
	}
	result := make([]*sqlc.LoginAttempt, len(attempts))
	for i := range attempts {
		result[i] = &attempts[i]
	}
	return result, nil
}

func (r *LoginAttemptRepository) GetByEmail(ctx context.Context, email string, limit, offset int) ([]*sqlc.LoginAttempt, error) {
	attempts, err := r.queries.GetLoginAttemptsByEmail(ctx, sqlc.GetLoginAttemptsByEmailParams{
		Email:  email,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get login attempts by email: %w", err)
	}
	result := make([]*sqlc.LoginAttempt, len(attempts))
	for i := range attempts {
		result[i] = &attempts[i]
	}
	return result, nil
}

func (r *LoginAttemptRepository) DeleteOld(ctx context.Context, before time.Time) error {
	if err := r.queries.DeleteOldLoginAttempts(ctx, sqlc.DeleteOldLoginAttemptsParams{
		AttemptedAt: pgtype.Timestamptz{Time: before, Valid: true},
	}); err != nil {
		return fmt.Errorf("failed to delete old login attempts: %w", err)
	}
	return nil
}
