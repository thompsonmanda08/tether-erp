package handlers

import (
	"log"
	"strconv"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/tether-erp/models"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

type DocumentHandler struct {
	documentService *services.DocumentService
	validate        *validator.Validate
}

func NewDocumentHandler(documentService *services.DocumentService) *DocumentHandler {
	return &DocumentHandler{
		documentService: documentService,
		validate:        validator.New(),
	}
}

// GetDocuments retrieves all documents with optional filtering
// GET /api/v1/documents
func (h *DocumentHandler) GetDocuments(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)

	// Get query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build filter from query parameters
	filter := &models.DocumentFilter{}

	// Document types filter
	if documentTypes := c.Query("documentTypes"); documentTypes != "" {
		filter.DocumentTypes = []string{documentTypes}
	}

	// Status filter
	if statuses := c.Query("statuses"); statuses != "" {
		filter.Statuses = []string{statuses}
	}

	// Department filter
	if departments := c.Query("departments"); departments != "" {
		filter.Departments = []string{departments}
	}

	// Date range filter
	if dateFrom := c.Query("dateFrom"); dateFrom != "" {
		if parsedDate, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filter.DateFrom = &parsedDate
		}
	}

	if dateTo := c.Query("dateTo"); dateTo != "" {
		if parsedDate, err := time.Parse("2006-01-02", dateTo); err == nil {
			filter.DateTo = &parsedDate
		}
	}

	// Amount range filter
	if amountMin := c.Query("amountMin"); amountMin != "" {
		if parsedAmount, err := strconv.ParseFloat(amountMin, 64); err == nil {
			filter.AmountMin = &parsedAmount
		}
	}

	if amountMax := c.Query("amountMax"); amountMax != "" {
		if parsedAmount, err := strconv.ParseFloat(amountMax, 64); err == nil {
			filter.AmountMax = &parsedAmount
		}
	}

	// Search query
	filter.Search = c.Query("search", "")

	// Get documents
	documents, total, err := h.documentService.ListDocuments(c.Context(), organizationID, filter, limit, offset)
	if err != nil {
		log.Printf("Error fetching documents: %v", err)
		return utils.SendInternalError(c, "Failed to retrieve documents", err)
	}

	return utils.SendPaginatedSuccess(c, documents, "Documents retrieved successfully", page, limit, total)
}

// GetMyDocuments retrieves documents created by the authenticated user
// GET /api/v1/documents/my
func (h *DocumentHandler) GetMyDocuments(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Get user documents
	documents, total, err := h.documentService.ListUserDocuments(c.Context(), organizationID, userID, limit, offset)
	if err != nil {
		log.Printf("Error fetching user documents: %v", err)
		return utils.SendInternalError(c, "Failed to retrieve user documents", err)
	}

	return utils.SendPaginatedSuccess(c, documents, "User documents retrieved successfully", page, limit, total)
}

// GetDocumentByID retrieves a single document by ID
// GET /api/v1/documents/:id
func (h *DocumentHandler) GetDocumentByID(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)

	// Get document ID from params
	documentIDStr := c.Params("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		return utils.SendBadRequestError(c, "Invalid document ID")
	}

	// Get document
	document, err := h.documentService.GetDocument(c.Context(), documentID, organizationID)
	if err != nil {
		log.Printf("Error fetching document %s: %v", documentID, err)
		return utils.SendNotFoundError(c, "Document not found")
	}

	return utils.SendSimpleSuccess(c, document, "Document retrieved successfully")
}

// GetDocumentByNumber retrieves a single document by document number
// GET /api/v1/documents/number/:number
func (h *DocumentHandler) GetDocumentByNumber(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)

	// Get document number from params
	documentNumber := c.Params("number")
	if documentNumber == "" {
		return utils.SendBadRequestError(c, "Document number is required")
	}

	// Get document
	document, err := h.documentService.GetDocumentByNumber(c.Context(), documentNumber, organizationID)
	if err != nil {
		log.Printf("Error fetching document by number %s: %v", documentNumber, err)
		return utils.SendNotFoundError(c, "Document not found")
	}

	return utils.SendSimpleSuccess(c, document, "Document retrieved successfully")
}

// CreateDocument creates a new document
// POST /api/v1/documents
func (h *DocumentHandler) CreateDocument(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Parse request body
	var req services.CreateDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Validate request
	if err := h.validate.Struct(req); err != nil {
		return utils.SendBadRequestError(c, "Validation failed: "+err.Error())
	}

	// Create document
	document, err := h.documentService.CreateDocument(c.Context(), organizationID, userID, req)
	if err != nil {
		log.Printf("Error creating document: %v", err)
		return utils.SendInternalError(c, "Failed to create document", err)
	}

	return utils.SendCreatedSuccess(c, document, "Document created successfully")
}

// UpdateDocument updates an existing document
// PUT /api/v1/documents/:id
func (h *DocumentHandler) UpdateDocument(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get document ID from params
	documentIDStr := c.Params("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		return utils.SendBadRequestError(c, "Invalid document ID")
	}

	// Parse request body
	var req services.UpdateDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	// Update document
	document, err := h.documentService.UpdateDocument(c.Context(), documentID, organizationID, userID, req)
	if err != nil {
		log.Printf("Error updating document %s: %v", documentID, err)
		return utils.SendInternalError(c, "Failed to update document", err)
	}

	return utils.SendSimpleSuccess(c, document, "Document updated successfully")
}

// SubmitDocument submits a document for approval
// POST /api/v1/documents/:id/submit
func (h *DocumentHandler) SubmitDocument(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get document ID from params
	documentIDStr := c.Params("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		return utils.SendBadRequestError(c, "Invalid document ID")
	}

	// Submit document
	document, err := h.documentService.SubmitDocument(c.Context(), documentID, organizationID, userID)
	if err != nil {
		log.Printf("Error submitting document %s: %v", documentID, err)
		return utils.SendInternalError(c, "Failed to submit document", err)
	}

	return utils.SendSimpleSuccess(c, document, "Document submitted successfully")
}

// DeleteDocument deletes a document
// DELETE /api/v1/documents/:id
func (h *DocumentHandler) DeleteDocument(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)
	userID := c.Locals("userID").(string)

	// Get document ID from params
	documentIDStr := c.Params("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		return utils.SendBadRequestError(c, "Invalid document ID")
	}

	// Delete document
	if err := h.documentService.DeleteDocument(c.Context(), documentID, organizationID, userID); err != nil {
		log.Printf("Error deleting document %s: %v", documentID, err)
		return utils.SendInternalError(c, "Failed to delete document", err)
	}

	return utils.SendSimpleSuccess(c, nil, "Document deleted successfully")
}

// SearchDocuments performs full-text search on documents or lists all documents with filters
// GET /api/v1/documents/search
// Supports both full-text search (q param) and filter-based listing
func (h *DocumentHandler) SearchDocuments(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)

	// Get query parameters - q is now optional for listing all documents
	query := c.Query("q", "")
	documentNumber := c.Query("documentNumber", "")

	// Support both 'pageSize' (frontend) and 'limit' (backend convention)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", ""))
	if limit == 0 {
		limit, _ = strconv.Atoi(c.Query("pageSize", "20"))
	}

	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build filter from query parameters
	filter := &models.DocumentFilter{}

	// Document number filter (for specific document search)
	if documentNumber != "" {
		filter.DocumentNumber = documentNumber
	}

	// Document types filter - support both 'documentTypes' and 'documentType' params
	if documentTypes := c.Query("documentTypes"); documentTypes != "" {
		filter.DocumentTypes = []string{documentTypes}
	} else if documentType := c.Query("documentType"); documentType != "" && documentType != "ALL" {
		filter.DocumentTypes = []string{documentType}
	}

	// Status filter - support both 'statuses' and 'status' params
	if statuses := c.Query("statuses"); statuses != "" {
		filter.Statuses = []string{statuses}
	} else if status := c.Query("status"); status != "" && status != "ALL" {
		filter.Statuses = []string{status}
	}

	// Department filter
	if departments := c.Query("departments"); departments != "" {
		filter.Departments = []string{departments}
	}

	// Date range filter - support both naming conventions
	if dateFrom := c.Query("dateFrom"); dateFrom != "" {
		if parsedDate, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filter.DateFrom = &parsedDate
		}
	} else if startDate := c.Query("startDate"); startDate != "" {
		if parsedDate, err := time.Parse("2006-01-02", startDate); err == nil {
			filter.DateFrom = &parsedDate
		}
	}

	if dateTo := c.Query("dateTo"); dateTo != "" {
		if parsedDate, err := time.Parse("2006-01-02", dateTo); err == nil {
			filter.DateTo = &parsedDate
		}
	} else if endDate := c.Query("endDate"); endDate != "" {
		if parsedDate, err := time.Parse("2006-01-02", endDate); err == nil {
			filter.DateTo = &parsedDate
		}
	}

	// Search documents - if query is empty, this will list all documents with filters
	results, total, err := h.documentService.SearchDocuments(c.Context(), organizationID, query, filter, limit, offset)
	if err != nil {
		log.Printf("Error searching documents: %v", err)
		return utils.SendInternalError(c, "Failed to search documents", err)
	}

	return utils.SendPaginatedSuccess(c, results, "Document search completed successfully", page, limit, total)
}

// GetDocumentStats retrieves document statistics
// GET /api/v1/documents/stats
func (h *DocumentHandler) GetDocumentStats(c *fiber.Ctx) error {
	organizationID := c.Locals("organizationID").(string)

	// Get document statistics
	stats, err := h.documentService.GetDocumentStats(c.Context(), organizationID)
	if err != nil {
		log.Printf("Error fetching document stats: %v", err)
		return utils.SendInternalError(c, "Failed to retrieve document statistics", err)
	}

	return utils.SendSimpleSuccess(c, stats, "Document statistics retrieved successfully")
}

// VerifyDocumentPublic verifies a document by document number (public endpoint)
// GET /api/v1/public/verify/:documentNumber
func (h *DocumentHandler) VerifyDocumentPublic(c *fiber.Ctx) error {
	// Set cache control headers to prevent caching of verification results
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")

	// Get document number from params
	documentNumber := c.Params("documentNumber")
	if documentNumber == "" {
		return utils.SendBadRequestError(c, "Document number is required")
	}

	// Verify document
	verification, err := h.documentService.VerifyDocumentPublic(c.Context(), documentNumber)
	if err != nil {
		log.Printf("Error verifying document %s: %v", documentNumber, err)
		return utils.SendNotFoundError(c, "Document not found or could not be verified")
	}

	return utils.SendSimpleSuccess(c, verification, "Document verified successfully")
}

// GetDocumentForPDFPublic retrieves full document data for PDF generation (public endpoint)
// GET /api/v1/public/verify/:documentNumber/document
func (h *DocumentHandler) GetDocumentForPDFPublic(c *fiber.Ctx) error {
	// Set cache control headers to prevent caching of document data
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")

	// Get document number from params
	documentNumber := c.Params("documentNumber")
	if documentNumber == "" {
		return utils.SendBadRequestError(c, "Document number is required")
	}

	// Get full document data for PDF
	documentData, err := h.documentService.GetDocumentForPDFPublic(c.Context(), documentNumber)
	if err != nil {
		log.Printf("Error fetching document for PDF %s: %v", documentNumber, err)
		return utils.SendNotFoundError(c, "Document not found")
	}

	return utils.SendSimpleSuccess(c, documentData, "Document retrieved successfully")
}