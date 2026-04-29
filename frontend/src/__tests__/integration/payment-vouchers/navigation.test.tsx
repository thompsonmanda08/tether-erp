/**
 * Integration tests for Payment Voucher navigation
 * Tests routing from PV list to detail page and back button functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders as render } from "@/__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock server-side modules
vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/app/_actions/payment-vouchers", () => ({
  getPaymentVouchers: vi.fn(),
  getPaymentVoucherById: vi.fn(),
  getPaymentVoucherChain: vi.fn(),
  createPaymentVoucher: vi.fn(),
  updatePaymentVoucher: vi.fn(),
  deletePaymentVoucher: vi.fn(),
  getPaymentVoucherStats: vi.fn(),
}));

// Mock UI components
vi.mock("@/components/base/page-header", () => ({
  PageHeader: ({ title, onBackClick, showBackButton }: any) => (
    <div>
      <h1>{title}</h1>
      {showBackButton && (
        <button onClick={onBackClick} aria-label="back">
          Back
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data, actions, renderRowActions }: any) => (
    <div>
      {data.map((item: any) => (
        <div key={item.id} data-testid={`row-${item.id}`}>
          <span>{item.documentNumber}</span>
          {actions &&
            actions(item).map((action: any, idx: number) => (
              <button key={idx} onClick={action.onClick} aria-label={action.label}>
                {action.label}
              </button>
            ))}
          {renderRowActions && renderRowActions(item)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/status-badge", () => ({
  StatusBadge: ({ status }: any) => <span>{status}</span>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children, asChild }: any) =>
    asChild ? children : <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/empty", () => ({
  Empty: ({ children }: any) => <div>{children}</div>,
  EmptyContent: ({ children }: any) => <div>{children}</div>,
  EmptyDescription: ({ children }: any) => <div>{children}</div>,
  EmptyMedia: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/action-buttons", () => ({
  ActionButtons: ({ actions }: any) => (
    <div>
      {actions?.map((a: any, i: number) => (
        <button key={i} onClick={a.onClick} aria-label={a.label}>
          {a.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/document-links", () => ({
  DocumentLinks: () => <div>Document Links</div>,
}));

vi.mock("@/components/base/document-loading-page", () => ({
  DocumentLoadingPage: () => <div>Loading...</div>,
}));

vi.mock("@/components/base/error-display", () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

vi.mock("@/components", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/modals/confirmation-modal", () => ({
  ConfirmationModal: () => <div>Confirmation Modal</div>,
}));

vi.mock(
  "@/app/(private)/(main)/payment-vouchers/_components/payment-voucher-items-list",
  () => ({
    PaymentVoucherItemsList: () => <div>PV Items List</div>,
  }),
);

vi.mock(
  "@/app/(private)/(main)/payment-vouchers/_components/payment-voucher-submit-dialog",
  () => ({
    PaymentVoucherSubmitDialog: () => <div>Submit Dialog</div>,
  }),
);

vi.mock(
  "@/app/(private)/(main)/payment-vouchers/_components/procurement-flow-indicator",
  () => ({
    ProcurementFlowIndicator: () => <div>Procurement Flow</div>,
  }),
);

vi.mock(
  "@/app/(private)/(main)/requisitions/_components/approval-history-panel",
  () => ({
    ActivityLogContent: () => <div>Activity Log</div>,
    ApprovalChainContent: () => <div>Approval Chain</div>,
    ApprovalActionContent: () => <div>Approval Action</div>,
    WorkflowStatusSummary: () => <div>Workflow Status</div>,
  }),
);

// Mock dynamic imports
vi.mock("next/dynamic", () => ({
  default: (_fn: any) => {
    const Component = () => null;
    return Component;
  },
}));

// Mock the hooks
vi.mock("@/hooks/use-payment-voucher-queries", () => ({
  usePaymentVouchers: vi.fn(() => ({
    data: [
      {
        id: "pv-123",
        documentNumber: "PV-2024-001",
        vendorName: "Test Vendor",
        status: "DRAFT",
        amount: 10000,
        currency: "ZMW",
        approvalStage: 1,
        invoiceNumber: "INV-001",
        paymentMethod: "bank_transfer",
        glCode: "GL-001",
        createdBy: "user-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ],
    refetch: vi.fn(),
  })),
  usePaymentVoucherById: vi.fn(),
  usePaymentVoucherChain: vi.fn(() => ({ data: undefined })),
  useSubmitPaymentVoucherForApproval: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useWithdrawPaymentVoucher: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useMarkPaymentVoucherAsPaid: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/hooks/use-payment-voucher-detail", () => ({
  usePaymentVoucherDetail: vi.fn(() => ({
    document: {
      id: "pv-123",
      documentNumber: "PV-2024-001",
      vendorName: "Test Vendor",
      status: "DRAFT",
      amount: 10000,
      currency: "ZMW",
      items: [],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    isLoading: false,
    chain: undefined,
    approvalData: undefined,
    isExporting: false,
    previewOpen: false,
    setPreviewOpen: vi.fn(),
    previewBlob: null,
    showSubmitDialog: false,
    setShowSubmitDialog: vi.fn(),
    showWithdrawModal: false,
    setShowWithdrawModal: vi.fn(),
    attachmentPreviewOpen: false,
    setAttachmentPreviewOpen: vi.fn(),
    selectedAttachment: null,
    handlePreviewPDF: vi.fn(),
    handleExportPDF: vi.fn(),
    handleSubmitForApproval: vi.fn(),
    handleEdit: vi.fn(),
    handleDocumentUpdated: vi.fn(),
    handleWithdraw: vi.fn(),
    handleApprovalComplete: vi.fn(),
    handleAttachmentPreview: vi.fn(),
    permissions: {
      isCreator: true,
      canEdit: true,
      canSubmit: true,
      canWithdraw: false,
    },
    submitMutation: { isPending: false },
    withdrawMutation: { isPending: false },
  })),
}));

vi.mock("@/hooks/use-approval-history", () => ({
  useApprovalPanelData: vi.fn(() => ({
    approvalHistory: [],
    workflowStatus: undefined,
    availableApprovers: [],
    isLoading: false,
    hasError: false,
    refetchAll: vi.fn(),
  })),
}));

// Import components after mocks
import { PaymentVouchersTable } from "@/app/(private)/(main)/payment-vouchers/_components/payment-vouchers-table";
import { PaymentVoucherDetailV2 as PVDetailClient } from "@/components/documents/document-detail/wrappers/payment-voucher";

describe("Payment Voucher Navigation", () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  describe("PV List to Detail Page Navigation", () => {
    it("should navigate to detail page when View button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PaymentVouchersTable
          userId="user-1"
          userRole="finance"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      const viewButton = await screen.findByRole("button", { name: /view/i });
      await user.click(viewButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/payment-vouchers/pv-123");
      });
    });

    it("should navigate to correct detail URL format", async () => {
      const user = userEvent.setup();

      render(
        <PaymentVouchersTable
          userId="user-1"
          userRole="finance"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      const viewButton = await screen.findByRole("button", { name: /view/i });
      await user.click(viewButton);

      await waitFor(() => {
        const callArg = mockPush.mock.calls[0][0];
        expect(callArg).toMatch(/^\/payment-vouchers\/[a-zA-Z0-9-]+$/);
      });
    });

    it("should show Edit button for finance role users", async () => {
      render(
        <PaymentVouchersTable
          userId="user-1"
          userRole="finance"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      const editButton = await screen.findByRole("button", { name: /edit/i });
      expect(editButton).toBeDefined();
    });

    it("should navigate to edit page when Edit button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PaymentVouchersTable
          userId="user-1"
          userRole="finance"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      const editButton = await screen.findByRole("button", { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/payment-vouchers/pv-123/edit");
      });
    });
  });

  describe("Back Button Navigation", () => {
    it("should have a back button on the detail page", () => {
      render(
        <PVDetailClient
          pvId="pv-123"
          userId="user-1"
          userRole="finance"
          initialPaymentVoucher={{
            id: "pv-123",
            documentNumber: "PV-2024-001",
            vendorName: "Test Vendor",
            status: "DRAFT",
            amount: 10000,
            currency: "ZMW",
            items: [],
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          } as any}
        />,
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeDefined();
    });

    it("should call router.back() when back button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PVDetailClient
          pvId="pv-123"
          userId="user-1"
          userRole="finance"
          initialPaymentVoucher={{
            id: "pv-123",
            documentNumber: "PV-2024-001",
            vendorName: "Test Vendor",
            status: "DRAFT",
            amount: 10000,
            currency: "ZMW",
            items: [],
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          } as any}
        />,
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });
  });

  describe("Routing Integration", () => {
    it("should support navigation from list to detail and back", async () => {
      const user = userEvent.setup();

      // Step 1: Render list page
      const { unmount } = render(
        <PaymentVouchersTable
          userId="user-1"
          userRole="finance"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      // Step 2: Click View to navigate to detail
      const viewButton = await screen.findByRole("button", { name: /^view$/i });
      await user.click(viewButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/payment-vouchers/pv-123");
      });

      // Step 3: Simulate navigation to detail page
      unmount();
      render(
        <PVDetailClient
          pvId="pv-123"
          userId="user-1"
          userRole="finance"
          initialPaymentVoucher={{
            id: "pv-123",
            documentNumber: "PV-2024-001",
            vendorName: "Test Vendor",
            status: "DRAFT",
            amount: 10000,
            currency: "ZMW",
            items: [],
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          } as any}
        />,
      );

      // Step 4: Click back button
      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      // Step 5: Verify back navigation
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });
  });
});
