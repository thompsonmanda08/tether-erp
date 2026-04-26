package types

import "time"

// CreateCategoryRequest represents a category creation request
type CreateCategoryRequest struct {
	Name        string   `json:"name" validate:"required,min=3,max=100"`
	Description string   `json:"description" validate:"max=500"`
	BudgetCodes []string `json:"budgetCodes" validate:"omitempty,dive,required"`
}

// UpdateCategoryRequest represents a category update request
type UpdateCategoryRequest struct {
	Name        string   `json:"name" validate:"omitempty,min=3,max=100"`
	Description string   `json:"description" validate:"omitempty,max=500"`
	BudgetCodes []string `json:"budgetCodes" validate:"omitempty,dive,required"`
	Active      *bool    `json:"active"`
}

// CategoryResponse represents a category in responses
type CategoryResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	BudgetCodes []string  `json:"budgetCodes"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CategoryBudgetCodeResponse represents a category-budget mapping
type CategoryBudgetCodeResponse struct {
	ID         string    `json:"id"`
	CategoryID string    `json:"categoryId"`
	BudgetCode string    `json:"budgetCode"`
	Active     bool      `json:"active"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
