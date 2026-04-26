package handlers

import (
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tether-erp/config"
	db "github.com/tether-erp/database/sqlc"
	"github.com/tether-erp/logging"
	"github.com/tether-erp/middleware"
	"github.com/tether-erp/models"
	"github.com/tether-erp/types"
	"github.com/tether-erp/utils"
)

// strPtrOrNil returns nil for empty strings, otherwise &s.
func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// strFromPtr derefs a *string to string with empty default.
func strFromPtr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// boolFromPtr derefs a *bool to bool with false default.
func boolFromPtr(p *bool) bool {
	if p == nil {
		return false
	}
	return *p
}

// sqlcVendorToModel converts an sqlc-generated db.Vendor row to models.Vendor.
func sqlcVendorToModel(v db.Vendor) models.Vendor {
	out := models.Vendor{
		ID:              v.ID,
		OrganizationID:  v.OrganizationID,
		VendorCode:      v.VendorCode,
		Name:            v.Name,
		Email:           strFromPtr(v.Email),
		Phone:           strFromPtr(v.Phone),
		Country:         strFromPtr(v.Country),
		City:            strFromPtr(v.City),
		BankAccount:     strFromPtr(v.BankAccount),
		TaxID:           strFromPtr(v.TaxID),
		Active:          boolFromPtr(v.Active),
		CreatedBy:       strFromPtr(v.CreatedBy),
		BankName:        v.BankName,
		AccountName:     v.AccountName,
		AccountNumber:   v.AccountNumber,
		BranchCode:      v.BranchCode,
		SwiftCode:       v.SwiftCode,
		ContactPerson:   v.ContactPerson,
		PhysicalAddress: v.PhysicalAddress,
	}
	if v.CreatedAt.Valid {
		out.CreatedAt = v.CreatedAt.Time
	}
	if v.UpdatedAt.Valid {
		out.UpdatedAt = v.UpdatedAt.Time
	}
	return out
}

// GetVendors retrieves all vendors with pagination and filtering
func GetVendors(c *fiber.Ctx) error {
	logger := logging.FromContext(c)
	logger.Info("get_vendors_request")

	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	active := c.Query("active")
	country := c.Query("country")

	logging.AddFieldsToRequest(c, map[string]interface{}{
		"operation":      "get_vendors",
		"page":           page,
		"limit":          limit,
		"active":         active,
		"country":        country,
		"organizationID": tenant.OrganizationID,
	})

	ctx := c.Context()
	offset := int32((page - 1) * limit)

	total, err := config.Queries.CountVendors(ctx, db.CountVendorsParams{
		OrganizationID: tenant.OrganizationID,
		Column2:        active,
		Column3:        country,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to count vendors", err)
	}

	rows, err := config.Queries.ListVendors(ctx, db.ListVendorsParams{
		OrganizationID: tenant.OrganizationID,
		Column2:        active,
		Column3:        country,
		Limit:          int32(limit),
		Offset:         offset,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to fetch vendors", err)
	}

	responses := make([]types.VendorResponse, 0, len(rows))
	for _, row := range rows {
		responses = append(responses, modelToVendorResponse(sqlcVendorToModel(row)))
	}

	return utils.SendPaginatedSuccess(c, responses, "Vendors retrieved successfully", page, limit, total)
}

// CreateVendor creates a new vendor
func CreateVendor(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	var req types.CreateVendorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	if req.Name == "" || len(req.Name) < 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Vendor name is required and must be at least 3 characters",
		})
	}
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Email is required",
		})
	}
	if len(req.Email) < 5 || !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid email format",
		})
	}
	if req.Phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Phone is required",
		})
	}
	if req.Country == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Country is required",
		})
	}
	if req.City == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "City is required",
		})
	}
	if req.TaxID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Tax ID is required",
		})
	}

	ctx := c.Context()

	// Org-scoped uniqueness on email
	var existingID string
	err = config.PgxDB.QueryRow(ctx,
		`SELECT id FROM vendors WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL LIMIT 1`,
		req.Email, tenant.OrganizationID,
	).Scan(&existingID)
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "Vendor with this email already exists in your organization",
		})
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return utils.SendInternalError(c, "Failed to check vendor uniqueness", err)
	}

	vendorCode := utils.GenerateVendorCode()
	id := uuid.New().String()
	active := true

	row, err := config.Queries.CreateVendor(ctx, db.CreateVendorParams{
		ID:              id,
		OrganizationID:  tenant.OrganizationID,
		Name:            req.Name,
		VendorCode:      vendorCode,
		Email:           strPtrOrNil(req.Email),
		Phone:           strPtrOrNil(req.Phone),
		Country:         strPtrOrNil(req.Country),
		City:            strPtrOrNil(req.City),
		BankAccount:     strPtrOrNil(req.BankAccount),
		BankName:        req.BankName,
		AccountName:     req.AccountName,
		AccountNumber:   req.AccountNumber,
		BranchCode:      req.BranchCode,
		SwiftCode:       req.SwiftCode,
		ContactPerson:   req.ContactPerson,
		PhysicalAddress: req.PhysicalAddress,
		TaxID:           strPtrOrNil(req.TaxID),
		Active:          &active,
		CreatedBy:       strPtrOrNil(tenant.UserID),
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to create vendor", err)
	}

	return c.Status(fiber.StatusCreated).JSON(types.DetailResponse{
		Success: true,
		Data:    modelToVendorResponse(sqlcVendorToModel(row)),
	})
}

// GetVendor retrieves a single vendor by ID
func GetVendor(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Vendor ID is required",
		})
	}

	ctx := c.Context()
	row, err := config.Queries.GetVendorByID(ctx, db.GetVendorByIDParams{ID: id})
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Vendor not found",
		})
	}
	if row.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Vendor not found",
		})
	}

	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    modelToVendorResponse(sqlcVendorToModel(row)),
	})
}

// UpdateVendor updates an existing vendor
func UpdateVendor(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Vendor ID is required",
		})
	}

	var req types.UpdateVendorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()

	current, err := config.Queries.GetVendorByID(ctx, db.GetVendorByIDParams{ID: id})
	if err != nil || current.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Vendor not found",
		})
	}

	if req.Name != "" && len(req.Name) < 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Vendor name must be at least 3 characters",
		})
	}

	if req.Email != "" {
		var conflictID string
		err := config.PgxDB.QueryRow(ctx,
			`SELECT id FROM vendors WHERE email = $1 AND id != $2 AND organization_id = $3 AND deleted_at IS NULL LIMIT 1`,
			req.Email, id, tenant.OrganizationID,
		).Scan(&conflictID)
		if err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"message": "Vendor with this email already exists in your organization",
			})
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return utils.SendInternalError(c, "Failed to check vendor uniqueness", err)
		}
	}

	// Active flag: only override when ?active= query param is present
	active := boolFromPtr(current.Active)
	if c.Query("active") != "" {
		active = req.Active
	}

	// Helper: pick first non-empty
	pickStr := func(newVal, oldVal string) string {
		if newVal != "" {
			return newVal
		}
		return oldVal
	}
	pickStrPtr := func(newVal string, oldPtr *string) *string {
		if newVal != "" {
			return &newVal
		}
		return oldPtr
	}

	row, err := config.Queries.UpdateVendor(ctx, db.UpdateVendorParams{
		ID:              id,
		Name:            pickStr(req.Name, current.Name),
		VendorCode:      current.VendorCode,
		Email:           pickStrPtr(req.Email, current.Email),
		Phone:           pickStrPtr(req.Phone, current.Phone),
		Country:         pickStrPtr(req.Country, current.Country),
		City:            pickStrPtr(req.City, current.City),
		BankAccount:     pickStrPtr(req.BankAccount, current.BankAccount),
		BankName:        pickStr(req.BankName, current.BankName),
		AccountName:     pickStr(req.AccountName, current.AccountName),
		AccountNumber:   pickStr(req.AccountNumber, current.AccountNumber),
		BranchCode:      pickStr(req.BranchCode, current.BranchCode),
		SwiftCode:       pickStr(req.SwiftCode, current.SwiftCode),
		ContactPerson:   pickStr(req.ContactPerson, current.ContactPerson),
		PhysicalAddress: pickStr(req.PhysicalAddress, current.PhysicalAddress),
		TaxID:           pickStrPtr(req.TaxID, current.TaxID),
		Active:          &active,
	})
	if err != nil {
		return utils.SendInternalError(c, "Failed to update vendor", err)
	}

	return c.JSON(types.DetailResponse{
		Success: true,
		Data:    modelToVendorResponse(sqlcVendorToModel(row)),
	})
}

// DeleteVendor deactivates a vendor (soft delete via active flag)
func DeleteVendor(c *fiber.Ctx) error {
	tenant, err := middleware.GetTenantContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Organization context required",
		})
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Vendor ID is required",
		})
	}

	ctx := c.Context()
	current, err := config.Queries.GetVendorByID(ctx, db.GetVendorByIDParams{ID: id})
	if err != nil || current.OrganizationID != tenant.OrganizationID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Vendor not found",
		})
	}

	// Soft delete by toggling active=false (keeps row queryable, matches old behavior)
	_, err = config.PgxDB.Exec(ctx,
		`UPDATE vendors SET active = false, updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	)
	if err != nil {
		return utils.SendInternalError(c, "Failed to delete vendor", err)
	}

	return c.JSON(types.MessageResponse{
		Success: true,
		Message: "Vendor deactivated successfully",
	})
}

// modelToVendorResponse converts a Vendor model to a VendorResponse
func modelToVendorResponse(vendor models.Vendor) types.VendorResponse {
	return types.VendorResponse{
		ID:              vendor.ID,
		VendorCode:      vendor.VendorCode,
		Name:            vendor.Name,
		Email:           vendor.Email,
		Phone:           vendor.Phone,
		Country:         vendor.Country,
		City:            vendor.City,
		BankAccount:     vendor.BankAccount,
		TaxID:           vendor.TaxID,
		Active:          vendor.Active,
		BankName:        vendor.BankName,
		AccountName:     vendor.AccountName,
		AccountNumber:   vendor.AccountNumber,
		BranchCode:      vendor.BranchCode,
		SwiftCode:       vendor.SwiftCode,
		ContactPerson:   vendor.ContactPerson,
		PhysicalAddress: vendor.PhysicalAddress,
		CreatedAt:       vendor.CreatedAt,
		UpdatedAt:       vendor.UpdatedAt,
	}
}
