/**
 * Configuration Checklist Banner - Usage Examples
 *
 * This file demonstrates how to use the configuration checklist components
 * for different document types and scenarios.
 */

import { ConfigurationChecklistBanner } from "./configuration-checklist-banner";
import { WorkflowRequirementBanner } from "./workflow-requirement-banner";
import { useConfigurationStatus } from "@/hooks/use-configuration-status";

// ============================================================================
// EXAMPLE 1: Requisition Creation
// ============================================================================

export function RequisitionCreationExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: false, // Not needed for creation
  });

  return (
    <div className="space-y-4">
      {/* Show banner if any configs are missing */}
      {!configStatus.allConfigured && (
        <ConfigurationChecklistBanner
          requirements={configStatus.requirements}
          variant="creation"
          title="Complete Required Configurations"
          description="Set up these configurations before creating requisitions:"
        />
      )}

      {/* Your form content here */}
      <div>Requisition Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Requisition Submission
// ============================================================================

export function RequisitionSubmissionExample() {
  return (
    <div className="space-y-4">
      {/* Show workflow banner if no workflows configured */}
      <WorkflowRequirementBanner entityType="requisition" />

      {/* Your submission form here */}
      <div>Submission Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Budget Creation
// ============================================================================

export function BudgetCreationExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: false,
  });

  return (
    <div className="space-y-4">
      <ConfigurationChecklistBanner
        requirements={configStatus.requirements}
        variant="creation"
        title="Budget Configuration Required"
        description="Complete these configurations to create budgets:"
      />

      <div>Budget Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Budget Submission
// ============================================================================

export function BudgetSubmissionExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: true,
    workflowEntityType: "budget",
  });

  return (
    <div className="space-y-4">
      {/* Show both creation and workflow requirements */}
      {!configStatus.allConfigured && (
        <ConfigurationChecklistBanner
          requirements={configStatus.requirements}
          variant="submission"
          title="Configuration Required for Submission"
          description="Complete all configurations to submit budgets for approval:"
        />
      )}

      <div>Budget Submission Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Purchase Order Creation
// ============================================================================

export function PurchaseOrderCreationExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: false,
  });

  return (
    <div className="space-y-4">
      <ConfigurationChecklistBanner
        requirements={configStatus.requirements}
        variant="creation"
      />

      <div>Purchase Order Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Purchase Order Submission
// ============================================================================

export function PurchaseOrderSubmissionExample() {
  return (
    <div className="space-y-4">
      <WorkflowRequirementBanner entityType="purchase_order" />

      <div>PO Submission Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Payment Voucher
// ============================================================================

export function PaymentVoucherExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: true,
    workflowEntityType: "payment_voucher",
  });

  return (
    <div className="space-y-4">
      {!configStatus.allConfigured && (
        <ConfigurationChecklistBanner
          requirements={configStatus.requirements}
          variant="submission"
        />
      )}

      <div>Payment Voucher Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: GRN (Goods Received Note)
// ============================================================================

export function GRNExample() {
  return (
    <div className="space-y-4">
      <WorkflowRequirementBanner entityType="grn" />

      <div>GRN Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 9: Custom Requirements
// ============================================================================

export function CustomRequirementsExample() {
  // You can also create custom requirements for specific use cases
  const customRequirements = [
    {
      id: "vendors",
      label: "Vendors",
      description: "At least one active vendor must be configured",
      isConfigured: false, // Replace with actual check
      count: 0,
      navigateTo: "/admin/vendors",
    },
    {
      id: "payment-terms",
      label: "Payment Terms",
      description: "Default payment terms must be configured",
      isConfigured: true,
      count: 3,
      navigateTo: "/admin/settings/payment-terms",
    },
  ];

  return (
    <div className="space-y-4">
      <ConfigurationChecklistBanner
        requirements={customRequirements}
        variant="creation"
        title="Vendor Management Setup"
        description="Complete vendor-related configurations:"
      />

      <div>Vendor Form...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 10: Conditional Display
// ============================================================================

export function ConditionalDisplayExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: false,
  });

  // Only show banner if there are missing requirements
  if (configStatus.allConfigured) {
    return <div>All configurations complete! Form ready to use.</div>;
  }

  return (
    <div className="space-y-4">
      <ConfigurationChecklistBanner
        requirements={configStatus.requirements}
        variant="creation"
      />

      {/* Optionally disable form fields */}
      <div className="opacity-50 pointer-events-none">
        Form disabled until configurations are complete...
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 11: With Custom Styling
// ============================================================================

export function CustomStyledExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: false,
  });

  return (
    <div className="space-y-4">
      <ConfigurationChecklistBanner
        requirements={configStatus.requirements}
        variant="creation"
        className="shadow-lg border-2"
      />

      <div>Form Content...</div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 12: Integration with Form Validation
// ============================================================================

export function FormValidationExample() {
  const configStatus = useConfigurationStatus({
    includeWorkflow: false,
  });

  const handleSubmit = () => {
    if (!configStatus.allConfigured) {
      alert("Please complete all required configurations first");
      return;
    }

    // Proceed with form submission
  };

  return (
    <div className="space-y-4">
      {!configStatus.allConfigured && (
        <ConfigurationChecklistBanner
          requirements={configStatus.requirements}
          variant="creation"
        />
      )}

      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button
          type="submit"
          disabled={!configStatus.allConfigured}
          className="btn-primary"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
