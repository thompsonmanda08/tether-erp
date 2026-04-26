package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/tether-erp/services"
	"github.com/tether-erp/utils"
)

type DocumentGenerationHandler struct {
	generationService *services.DocumentGenerationService
}

func NewDocumentGenerationHandler(generationService *services.DocumentGenerationService) *DocumentGenerationHandler {
	return &DocumentGenerationHandler{generationService: generationService}
}

// GenerateDocument creates the next document from an approved source document.
// POST /api/v1/documents/generate
func (h *DocumentGenerationHandler) GenerateDocument(c *fiber.Ctx) error {
	organizationID, ok := c.Locals("organizationID").(string)
	if !ok || organizationID == "" {
		return utils.SendUnauthorizedError(c, "Organization context required")
	}

	var req struct {
		ID            string `json:"id"`
		DocType       string `json:"docType"`
		TargetDocType string `json:"targetDocType"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.SendBadRequestError(c, "Invalid request body")
	}

	if strings.TrimSpace(req.ID) == "" || strings.TrimSpace(req.DocType) == "" {
		return utils.SendBadRequestError(c, "id and docType are required")
	}

	result, err := h.generationService.GenerateFromSource(
		c.Context(),
		organizationID,
		req.ID,
		req.DocType,
		req.TargetDocType,
	)
	if err != nil {
		errMsg := strings.ToLower(err.Error())
		switch {
		case strings.Contains(errMsg, "not found"):
			return utils.SendNotFoundError(c, err.Error())
		case strings.Contains(errMsg, "must be approved"), strings.Contains(errMsg, "already generated"):
			return utils.SendBadRequestError(c, err.Error())
		default:
			return utils.SendInternalError(c, "Failed to generate document", err)
		}
	}

	return utils.SendSimpleSuccess(c, result, "Document generated successfully")
}
