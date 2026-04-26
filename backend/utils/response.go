package utils

import (
	"crypto/rand"
	"encoding/hex"
	"math"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/types"
)

// APIResponse represents a standardized API response
type APIResponse struct {
	Success    bool                   `json:"success"`
	Message    string                 `json:"message,omitempty"`
	Data       interface{}            `json:"data,omitempty"`
	Error      string                 `json:"error,omitempty"`
	Pagination *types.PaginationMeta  `json:"pagination,omitempty"`
}

// SuccessResponse returns a successful API response
func SuccessResponse(data interface{}, message string, pagination *types.PaginationMeta) APIResponse {
	return APIResponse{
		Success:    true,
		Message:    message,
		Data:       data,
		Pagination: pagination,
	}
}

// ErrorResponse returns an error API response
func ErrorResponse(errorMsg string) APIResponse {
	return APIResponse{
		Success: false,
		Error:   errorMsg,
	}
}

// ErrorResponseWithMessage returns an error response with both message and error
func ErrorResponseWithMessage(message string, errorMsg string) APIResponse {
	return APIResponse{
		Success: false,
		Message: message,
		Error:   errorMsg,
	}
}

// NormalizePaginationParams validates and normalizes pagination parameters
// Returns normalized page and pageSize values
func NormalizePaginationParams(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize
}

// CalculatePagination calculates pagination metadata
func CalculatePagination(page, pageSize int, total int64) *types.PaginationMeta {
	page, pageSize = NormalizePaginationParams(page, pageSize)

	totalPages := int64(math.Ceil(float64(total) / float64(pageSize)))
	hasNext := int64(page) < totalPages
	hasPrev := page > 1

	return &types.PaginationMeta{
		Page:       page,
		PageSize:   pageSize,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    hasNext,
		HasPrev:    hasPrev,
	}
}

// SendSuccess sends a successful response with optional pagination
func SendSuccess(c *fiber.Ctx, statusCode int, data interface{}, message string, pagination *types.PaginationMeta) error {
	return c.Status(statusCode).JSON(SuccessResponse(data, message, pagination))
}

// SendError sends an error response
func SendError(c *fiber.Ctx, statusCode int, message string, err error) error {
	errorMsg := ""
	if err != nil {
		errorMsg = err.Error()
	}
	return c.Status(statusCode).JSON(ErrorResponseWithMessage(message, errorMsg))
}

// SendValidationError sends a validation error response
func SendValidationError(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusBadRequest, "Validation Error", &ValidationError{Message: message})
}

// ValidationError for validation errors
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// SendNotFoundError sends a 404 not found error
func SendNotFoundError(c *fiber.Ctx, resource string) error {
	return SendError(c, fiber.StatusNotFound, resource+" not found", nil)
}

// SendUnauthorizedError sends a 401 unauthorized error
func SendUnauthorizedError(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusUnauthorized, message, nil)
}

// SendForbiddenError sends a 403 forbidden error
func SendForbiddenError(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusForbidden, message, nil)
}

// SendConflictError sends a 409 conflict error
func SendConflictError(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusConflict, message, nil)
}

// SendInternalError sends a 500 internal server error
func SendInternalError(c *fiber.Ctx, message string, err error) error {
	return SendError(c, fiber.StatusInternalServerError, message, err)
}

// SendUnprocessableEntityError sends a 422 unprocessable entity error
func SendUnprocessableEntityError(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusUnprocessableEntity, message, nil)
}
// SendPaginatedSuccess sends a successful response with pagination
func SendPaginatedSuccess(c *fiber.Ctx, data interface{}, message string, page, pageSize int, total int64) error {
	pagination := CalculatePagination(page, pageSize, total)
	return c.Status(fiber.StatusOK).JSON(SuccessResponse(data, message, pagination))
}

// SendSimpleSuccess sends a simple successful response without pagination
func SendSimpleSuccess(c *fiber.Ctx, data interface{}, message string) error {
	return c.Status(fiber.StatusOK).JSON(SuccessResponse(data, message, nil))
}

// SendCreatedSuccess sends a 201 created response
func SendCreatedSuccess(c *fiber.Ctx, data interface{}, message string) error {
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(data, message, nil))
}

// SendNoContentSuccess sends a 204 no content response
func SendNoContentSuccess(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

// SendBadRequestError sends a 400 bad request error
func SendBadRequestError(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusBadRequest, message, nil)
}

// SendNotImplementedError sends a 501 not implemented error
func SendNotImplementedError(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusNotImplemented, message, nil)
}

// SendCustomError sends a custom error with specified status code
func SendCustomError(c *fiber.Ctx, statusCode int, message string, err error) error {
	return SendError(c, statusCode, message, err)
}

// GenerateID generates a random ID string
func GenerateID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// SendNotFound sends a 404 not found response
func SendNotFound(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusNotFound, message, nil)
}

// SendBadRequest sends a 400 bad request response
func SendBadRequest(c *fiber.Ctx, message string) error {
	return SendError(c, fiber.StatusBadRequest, message, nil)
}