package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
)

var ErrNotImplemented = errors.New("repository method not implemented - requires sqlc generation")

type AccountLockoutRepository struct {
	db *pgxpool.Pool
}

func NewAccountLockoutRepository(db *pgxpool.Pool) AccountLockoutRepositoryInterface {
	return &AccountLockoutRepository{
		db: db,
	}
}

// Temporary implementations that return not implemented errors
// These will be replaced once sqlc generation is working properly

func (r *AccountLockoutRepository) Create(ctx context.Context, userID, email, ipAddress, reason string, unlocksAt time.Time) (*sqlc.AccountLockout, error) {
	return nil, ErrNotImplemented
}

func (r *AccountLockoutRepository) GetActiveByUserID(ctx context.Context, userID string) (*sqlc.AccountLockout, error) {
	return nil, ErrNotImplemented
}

func (r *AccountLockoutRepository) GetActiveByEmail(ctx context.Context, email string) (*sqlc.AccountLockout, error) {
	return nil, ErrNotImplemented
}

func (r *AccountLockoutRepository) Unlock(ctx context.Context, userID string) error {
	return ErrNotImplemented
}

func (r *AccountLockoutRepository) UnlockByEmail(ctx context.Context, email string) error {
	return ErrNotImplemented
}

func (r *AccountLockoutRepository) GetHistory(ctx context.Context, userID string, limit, offset int) ([]*sqlc.AccountLockout, error) {
	return nil, ErrNotImplemented
}

func (r *AccountLockoutRepository) CleanupExpired(ctx context.Context) error {
	return ErrNotImplemented
}