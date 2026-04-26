package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	sqlc "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/models"
)

type UserRepository struct {
	queries *sqlc.Queries
}

func NewUserRepository(db *pgxpool.Pool) UserRepositoryInterface {
	return &UserRepository{
		queries: sqlc.New(db),
	}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) (*models.User, error) {
	params := sqlc.CreateUserParams{
		ID:                 user.ID,
		Email:              user.Email,
		Name:               user.Name,
		Password:           user.Password,
		Role:               user.Role,
		Active:             user.Active,
		IsSuperAdmin:       user.IsSuperAdmin,
		MustChangePassword: user.MustChangePassword,
	}
	if user.CurrentOrganizationID != nil {
		params.CurrentOrganizationID = user.CurrentOrganizationID
	}
	if user.Position != "" {
		params.Position = &user.Position
	}
	if user.ManNumber != "" {
		params.ManNumber = &user.ManNumber
	}
	if user.NrcNumber != "" {
		params.NrcNumber = &user.NrcNumber
	}
	if user.Contact != "" {
		params.Contact = &user.Contact
	}

	sqlcUser, err := r.queries.CreateUser(ctx, params)
	if err != nil {
		return nil, err
	}
	return sqlcUserToModel(sqlcUser), nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	sqlcUser, err := r.queries.GetUserByID(ctx, sqlc.GetUserByIDParams{ID: id})
	if err != nil {
		return nil, err
	}
	return sqlcUserToModel(sqlcUser), nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	sqlcUser, err := r.queries.GetUserByEmail(ctx, sqlc.GetUserByEmailParams{Email: email})
	if err != nil {
		return nil, err
	}
	return sqlcUserToModel(sqlcUser), nil
}

func (r *UserRepository) Update(ctx context.Context, user *models.User) (*models.User, error) {
	params := sqlc.UpdateUserParams{
		ID:                 user.ID,
		Name:               user.Name,
		Email:              user.Email,
		Role:               user.Role,
		Active:             user.Active,
		IsSuperAdmin:       user.IsSuperAdmin,
		MustChangePassword: user.MustChangePassword,
	}
	if user.CurrentOrganizationID != nil {
		params.CurrentOrganizationID = user.CurrentOrganizationID
	}
	if user.Position != "" {
		params.Position = &user.Position
	}
	if user.ManNumber != "" {
		params.ManNumber = &user.ManNumber
	}
	if user.NrcNumber != "" {
		params.NrcNumber = &user.NrcNumber
	}
	if user.Contact != "" {
		params.Contact = &user.Contact
	}

	sqlcUser, err := r.queries.UpdateUser(ctx, params)
	if err != nil {
		return nil, err
	}
	return sqlcUserToModel(sqlcUser), nil
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	return r.queries.UpdateUserPassword(ctx, sqlc.UpdateUserPasswordParams{
		ID:       id,
		Password: hashedPassword,
	})
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, id string) error {
	return r.queries.UpdateUserLastLogin(ctx, sqlc.UpdateUserLastLoginParams{ID: id})
}

func (r *UserRepository) Delete(ctx context.Context, id string) error {
	return r.queries.SoftDeleteUser(ctx, sqlc.SoftDeleteUserParams{ID: id})
}

func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*models.User, error) {
	sqlcUsers, err := r.queries.ListUsers(ctx, sqlc.ListUsersParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, err
	}
	return sqlcUsersToModels(sqlcUsers), nil
}

func (r *UserRepository) ListByOrganization(ctx context.Context, organizationID string, limit, offset int) ([]*models.User, error) {
	sqlcUsers, err := r.queries.ListUsersByOrganization(ctx, sqlc.ListUsersByOrganizationParams{
		OrganizationID: organizationID,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return nil, err
	}
	return sqlcUsersToModels(sqlcUsers), nil
}

func (r *UserRepository) Count(ctx context.Context) (int64, error) {
	return r.queries.CountUsers(ctx)
}

func (r *UserRepository) CountActive(ctx context.Context) (int64, error) {
	return r.queries.CountActiveUsers(ctx)
}

func (r *UserRepository) Activate(ctx context.Context, id string) error {
	return r.queries.ActivateUser(ctx, sqlc.ActivateUserParams{ID: id})
}

func (r *UserRepository) Deactivate(ctx context.Context, id string) error {
	return r.queries.DeactivateUser(ctx, sqlc.DeactivateUserParams{ID: id})
}

// sqlcUserToModel converts a sqlc User row to the domain User type.
func sqlcUserToModel(u sqlc.User) *models.User {
	user := &models.User{
		ID:                 u.ID,
		Email:              u.Email,
		Name:               u.Name,
		Password:           u.Password,
		Role:               u.Role,
		Active:             u.Active,
		IsSuperAdmin:       u.IsSuperAdmin,
		MustChangePassword: u.MustChangePassword,
	}
	if u.CreatedAt.Valid {
		user.CreatedAt = u.CreatedAt.Time
	}
	if u.UpdatedAt.Valid {
		user.UpdatedAt = u.UpdatedAt.Time
	}
	if u.LastLogin.Valid {
		t := u.LastLogin.Time
		user.LastLogin = &t
	}
	if u.CurrentOrganizationID != nil {
		user.CurrentOrganizationID = u.CurrentOrganizationID
	}
	if u.Position != nil {
		user.Position = *u.Position
	}
	if u.ManNumber != nil {
		user.ManNumber = *u.ManNumber
	}
	if u.NrcNumber != nil {
		user.NrcNumber = *u.NrcNumber
	}
	if u.Contact != nil {
		user.Contact = *u.Contact
	}
	if u.DeletedAt.Valid {
		t := u.DeletedAt.Time
		user.DeletedAt = &t
	}
	if len(u.Preferences) > 0 {
		user.Preferences = u.Preferences
	}
	return user
}

func sqlcUsersToModels(users []sqlc.User) []*models.User {
	result := make([]*models.User, len(users))
	for i, u := range users {
		result[i] = sqlcUserToModel(u)
	}
	return result
}
