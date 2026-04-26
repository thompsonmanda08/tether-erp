/**
 * Integration tests for Purchase Order navigation
 * Tests routing from PO list to detail page and back button functionality
 *
 * **Validates: Requirements 6.1**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/app/_actions/purchase-orders", () => ({
  getPurchaseOrderById: vi.fn(),
}));

// Mock components that use server-side code
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
  DataTable: ({ data, actions }: any) => (
    <div>
      {data.map((item: any) => (
        <div key={item.id}>
          {actions(item).map((action: any, idx: number) => (
            <button
              key={idx}
              onClick={action.onClick}
              aria-label={action.label}
            >
              {action.label}
            </button>
          ))}
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
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock all the complex components in the detail client
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
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

vi.mock("@/app/(private)/(main)/purchase-orders/_components/purchase-order-items-list", () => ({
  PurchaseOrderItemsList: () => <div>Items List</div>,
}));

vi.mock("@/app/(private)/(main)/purchase-orders/_components/purchase-order-submit-dialog", () => ({
  PurchaseOrderSubmitDialog: () => <div>Submit Dialog</div>,
}));

vi.mock("@/components/modals/confirmation-modal", () => ({
  ConfirmationModal: () => <div>Confirmation Modal</div>,
}));

vi.mock(
  "@/app/(private)/(main)/requisitions/_components/approval-history-panel",
  () => ({
    ActivityLogContent: () => <div>Activity Log</div>,
    ApprovalChainContent: () => <div>Approval Chain</div>,
    ApprovalActionContent: () => <div>Approval Action</div>,
    WorkflowStatusSummary: () => <div>Workflow Status</div>,
  }),
);

// Mock the hooks
vi.mock("@/hooks/use-purchase-order-queries", () => ({
  usePurchaseOrders: vi.fn(() => ({
    data: [
      {
        id: "po-123",
        documentNumber: "PO-2024-001",
        vendorName: "Test Vendor",
        status: "DRAFT",
        totalAmount: 1000,
        currency: "ZMW",
        approvalStage: 1,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        items: [],
        createdBy: "user-1",
      },
    ],
    refetch: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-purchase-order-detail", () => ({
  usePurchaseOrderDetail: vi.fn(() => ({
    document: {
      id: "po-123",
      documentNumber: "PO-2024-001",
      vendorName: "Test Vendor",
      status: "DRAFT",
      totalAmount: 1000,
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
    isEditDialogOpen: false,
    setIsEditDialogOpen: vi.fn(),
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

// Import components after mocks
import { PurchaseOrdersTable } from "@/app/(private)/(main)/purchase-orders/_components/purchase-orders-table";
import { PurchaseOrderDetailClient } from "@/app/(private)/(main)/purchase-orders/_components/purchase-order-detail-client";

describe("Purchase Order Navigation", () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  describe("PO List to Detail Page Navigation", () => {
    it("should navigate to detail page when View button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PurchaseOrdersTable
          userId="user-1"
          userRole="procurement_officer"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      // Find and click the View button
      const viewButton = await screen.findByRole("button", {
        name: /view/i,
      });
      await user.click(viewButton);

      // Verify navigation to detail page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/purchase-orders/po-123");
      });
    });

    it("should navigate to correct detail page URL format", async () => {
      const user = userEvent.setup();

      render(
        <PurchaseOrdersTable
          userId="user-1"
          userRole="procurement_officer"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      const viewButton = await screen.findByRole("button", {
        name: /view/i,
      });
      await user.click(viewButton);

      await waitFor(() => {
        const callArg = mockPush.mock.calls[0][0];
        // Verify URL format: /purchase-orders/[id]
        expect(callArg).toMatch(/^\/purchase-orders\/[a-zA-Z0-9-]+$/);
      });
    });
  });

  describe("Back Button Navigation", () => {
    it("should have a back button on the detail page", () => {
      render(
        <PurchaseOrderDetailClient
          purchaseOrderId="po-123"
          userId="user-1"
          userRole="procurement_officer"
          initialPurchaseOrder={{
            id: "po-123",
            documentNumber: "PO-2024-001",
            vendorName: "Test Vendor",
            status: "DRAFT",
            totalAmount: 1000,
            currency: "ZMW",
            items: [],
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          }}
        />,
      );

      // The PageHeader component should render with showBackButton={true}
      // We can verify this by checking if the back button exists
      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeDefined();
    });

    it("should call router.back() when back button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PurchaseOrderDetailClient
          purchaseOrderId="po-123"
          userId="user-1"
          userRole="procurement_officer"
          initialPurchaseOrder={{
            id: "po-123",
            documentNumber: "PO-2024-001",
            vendorName: "Test Vendor",
            status: "DRAFT",
            totalAmount: 1000,
            currency: "ZMW",
            items: [],
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          }}
        />,
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      // Verify router.back() was called
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
        <PurchaseOrdersTable
          userId="user-1"
          userRole="procurement_officer"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      // Step 2: Click view button to navigate to detail
      const viewButton = await screen.findByRole("button", {
        name: /view/i,
      });
      await user.click(viewButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/purchase-orders/po-123");
      });

      // Step 3: Simulate navigation to detail page
      unmount();
      render(
        <PurchaseOrderDetailClient
          purchaseOrderId="po-123"
          userId="user-1"
          userRole="procurement_officer"
          initialPurchaseOrder={{
            id: "po-123",
            documentNumber: "PO-2024-001",
            vendorName: "Test Vendor",
            status: "DRAFT",
            totalAmount: 1000,
            currency: "ZMW",
            items: [],
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
          }}
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
