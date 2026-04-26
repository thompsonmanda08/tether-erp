package utils

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// GenerateDocumentNumber generates a standardized document number
// Format: {PREFIX}-{6CHARS_TIMESTAMP}-{4CHARS_UUID}
// Example: REQ-240108-A1B2 (6 chars from timestamp + 4 chars from UUID)
// GenerateDocumentNumber generates a document number with the given prefix
// Format: PREFIX-YYMMDD-XXXX (6 chars timestamp + 4 chars UUID)
func GenerateDocumentNumber(prefix string) string {
	now := time.Now()
	
	// Get 6 characters from timestamp (YYMMDD format for date)
	timestampStr := now.Format("060102") // YY MM DD (6 characters)
	
	// Get first 4 characters of UUID (uppercase)
	uuidStr := strings.ToUpper(uuid.New().String()[:4])
	
	// Ensure prefix is uppercase
	prefix = strings.ToUpper(prefix)
	
	return fmt.Sprintf("%s-%s-%s", prefix, timestampStr, uuidStr)
}

// GenerateRequisitionNumber generates a requisition document number
// Format: REQ-240108-A1B2 (6 chars timestamp + 4 chars UUID)
func GenerateRequisitionNumber() string {
	return GenerateDocumentNumber("REQ")
}

// GeneratePurchaseOrderNumber generates a purchase order document number
// Format: PO-240108-A1B2 (6 chars timestamp + 4 chars UUID)
func GeneratePurchaseOrderNumber() string {
	return GenerateDocumentNumber("PO")
}

// GeneratePaymentVoucherNumber generates a payment voucher document number
// Format: PV-240108-A1B2 (6 chars timestamp + 4 chars UUID)
func GeneratePaymentVoucherNumber() string {
	return GenerateDocumentNumber("PV")
}

// GenerateGRNNumber generates a goods received note document number
// Format: GRN-240108-A1B2 (6 chars timestamp + 4 chars UUID)
func GenerateGRNNumber() string {
	return GenerateDocumentNumber("GRN")
}

// GenerateVendorCode generates a vendor code
// Format: VND-240108-A1B2 (6 chars timestamp + 4 chars UUID)
func GenerateVendorCode() string {
	return GenerateDocumentNumber("VND")
}

// Legacy function names for backward compatibility
// These will be deprecated in future versions

// GenerateRequisitionDocumentNumber is an alias for GenerateRequisitionNumber
// Deprecated: Use GenerateRequisitionNumber instead
func GenerateRequisitionDocumentNumber() string {
	return GenerateRequisitionNumber()
}

// GeneratePurchaseOrderDocumentNumber is an alias for GeneratePurchaseOrderNumber  
// Deprecated: Use GeneratePurchaseOrderNumber instead
func GeneratePurchaseOrderDocumentNumber() string {
	return GeneratePurchaseOrderNumber()
}

// GeneratePaymentVoucherDocumentNumber is an alias for GeneratePaymentVoucherNumber
// Deprecated: Use GeneratePaymentVoucherNumber instead
func GeneratePaymentVoucherDocumentNumber() string {
	return GeneratePaymentVoucherNumber()
}

// GenerateGRNDocumentNumber is an alias for GenerateGRNNumber
// Deprecated: Use GenerateGRNNumber instead
func GenerateGRNDocumentNumber() string {
	return GenerateGRNNumber()
}

// Legacy function for backward compatibility (using Unix timestamp)
// Format: {PREFIX}-{timestamp}-{uuid8chars}
func GenerateDocumentNumberLegacy(prefix string) string {
	prefix = strings.ToUpper(prefix)
	return fmt.Sprintf("%s-%d-%s", prefix, time.Now().Unix(), uuid.New().String()[:8])
}