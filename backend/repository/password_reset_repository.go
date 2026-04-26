package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
)

type PasswordResetRepository struct {
	db *pgxpool.Pool
}

func NewPasswordResetRepository(db *pgxpool.Pool) PasswordResetRepositoryInterface {
	return &PasswordResetRepository{
		db: db,
	}
}

// Temporary implementations that return not implemented errors
// These will be replaced once sqlc generation is working properly

func (r *PasswordResetRepository) Create(ctx context.Context, userID, token string, expiresAt time.Time) (*sqlc.PasswordReset, error) {
	return nil, ErrNotImplemented
}

func (r *PasswordResetRepository) GetByToken(ctx context.Context, token string) (*sqlc.PasswordReset, error) {
	return nil, ErrNotImplemented
}

func (r *PasswordResetRepository) MarkAsUsed(ctx context.Context, id uuid.UUID) error {
	return ErrNotImplemented
}

func (r *PasswordResetRepository) DeleteByUserID(ctx context.Context, userID string) error {
	return ErrNotImplemented
}

func (r *PasswordResetRepository) DeleteExpired(ctx context.Context) error {
	return ErrNotImplemented
}

func (r *PasswordResetRepository) DeleteUsed(ctx context.Context) error {
	return ErrNotImplemented
}