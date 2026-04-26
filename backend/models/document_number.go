package models

import (
	"time"

	"github.com/google/uuid"
)

// GenerateDocumentNumber generates a document number based on type and a UUID.
// The repository should call this before INSERT when DocumentNumber is empty.
// Format: <PREFIX>-<YYYYMMDD>-<first 8 chars of UUID>
func GenerateDocumentNumber(documentType string, id uuid.UUID) string {
	prefix := DocumentPrefix(documentType)
	timestamp := time.Now().Format("20060102")
	return prefix + "-" + timestamp + "-" + id.String()[:8]
}

// DocumentPrefix returns the prefix for document numbers based on type.
func DocumentPrefix(documentType string) string {
	prefixes := map[string]string{
		"REQUISITION":     "REQ",
		"BUDGET":          "BUD",
		"PURCHASE_ORDER":  "PO",
		"PAYMENT_VOUCHER": "PV",
		"GRN":             "GRN",
		"CATEGORY":        "CAT",
		"VENDOR":          "VEN",
	}

	if prefix, exists := prefixes[documentType]; exists {
		return prefix
	}

	return "DOC" // Default prefix
}
