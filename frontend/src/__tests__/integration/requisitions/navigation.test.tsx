/**
 * Integration tests for Requisition navigation
 * Tests routing from requisition list to detail page and back button functionality
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

vi.mock("@/app/_actions/requisitions", () => ({
  getRequisitions: vi.fn(),
  getRequisitionById: vi.fn(),
  createRequisition: vi.fn(),
  updateRequisition: vi.fn(),
  submitRequisitionForApproval: vi.fn(),
  deleteRequisition: vi.fn(),
  getRequisitionStats: vi.fn(),
  getRequisitionChain: vi.fn(),
  getRequisitionAuditTrail: vi.fn(),
}));

vi.mock("@/app/_actions/purchase-orders", () => ({
  createPurchaseOrderFromRequisition: vi.fn(),
  getPurchaseOrderById: vi.fn(),
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
  DataTable: ({ data, renderRowActions }: any) => (
    <div>
      {data.map((item: any) => (
        <div key={item.id} data-testid={`row-${item.id}`}>
          <span>{item.documentNumber}</span>
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
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) =>
    asChild ? children : <div>{children}</div>,
}));

vi.mock("@/components/modals/confirmation-modal", () => ({
  ConfirmationModal: () => <div>Confirmation Modal</div>,
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

vi.mock(
  "@/app/(private)/(main)/requisitions/_components/requisition-items-list",
  () => ({
    RequisitionItemsList: () => <div>Items List</div>,
  }),
);

vi.mock(
  "@/app/(private)/(main)/requisitions/_components/requisition-submit-dialog",
  () => ({
    RequisitionSubmitDialog: () => <div>Submit Dialog</div>,
  }),
);

vi.mock(
  "@/app/(private)/(main)/requisitions/_components/create-requisition-dialog",
  () => ({
    CreateRequisitionDialog: () => <div>Create Requisition Dialog</div>,
  }),
);

vi.mock(
  "@/app/(private)/(main)/purchase-orders/_components/create-po-from-requisition-dialog",
  () => ({
    CreatePOFromRequisitionDialog: () => <div>Create PO Dialog</div>,
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
  default: (fn: any) => {
    const Component = () => null;
    return Component;
  },
}));

// Mock the hooks
vi.mock("@/hooks/use-requisition-queries", () => ({
  useRequisitions: vi.fn(() => ({
    data: [
      {
        id: "req-123",
        documentNumber: "REQ-2024-001",
        title: "Office Supplies",
        department: "Finance",
        priority: "Medium",
        status: "DRAFT",
        totalAmount: 5000,
        currency: "ZMW",
        requesterId: "user-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        items: [],
      },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useRequisitionById: vi.fn(),
  useSubmitRequisitionForApproval: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useRequisitionChain: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/hooks/use-requisition-mutations", () => ({
  useWithdrawRequisition: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/hooks/use-approval-history", () => ({
  useApprovalWorkflowStatus: vi.fn(() => ({ data: undefined })),
  useApprovalPanelData: vi.fn(() => ({
    approvalHistory: [],
    workflowStatus: undefined,
    availableApprovers: [],
    isLoading: false,
    hasError: false,
    refetchAll: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-requisition-detail", () => ({
  useRequisitionDetail: vi.fn(() => ({
    document: {
      id: "req-123",
      documentNumber: "REQ-2024-001",
      title: "Office Supplies",
      department: "Finance",
      priority: "Medium",
      status: "DRAFT",
      totalAmount: 5000,
      currency: "ZMW",
      requesterId: "user-1",
      items: [],
      attachments: [],
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

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(() => ({
    hasPermission: vi.fn(() => false),
    isAdmin: vi.fn(() => false),
    isFinance: vi.fn(() => false),
  })),
}));

// Import components after mocks
import { RequisitionsTable } from "@/app/(private)/(main)/requisitions/_components/requisitions-table";
import { RequisitionDetailClient } from "@/app/(private)/(main)/requisitions/_components/requisition-detail-client";

describe("Requisition Navigation", () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  describe("Requisition List to Detail Page Navigation", () => {
    it("should navigate to detail page when View Details is clicked", async () => {
      const user = userEvent.setup();

      render(
        <RequisitionsTable
          userId="user-1"
          userRole="requester"
          refreshTrigger={0}
          onEditRequisition={vi.fn()}
          onCreateRequisition={vi.fn()}
        />,
      );

      const viewButton = await screen.findByRole("button", {
        name: /view details/i,
      });
      await user.click(viewButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/requisitions/req-123");
      });
    });

    it("should navigate to correct detail URL format", async () => {
      const user = userEvent.setup();

      render(
        <RequisitionsTable
          userId="user-1"
          userRole="requester"
          refreshTrigger={0}
          onEditRequisition={vi.fn()}
          onCreateRequisition={vi.fn()}
        />,
      );

      const viewButton = await screen.findByRole("button", {
        name: /view details/i,
      });
      await user.click(viewButton);

      await waitFor(() => {
        const callArg = mockPush.mock.calls[0][0];
        expect(callArg).toMatch(/^\/requisitions\/[a-zA-Z0-9-]+$/);
      });
    });
  });

  describe("Back Button Navigation", () => {
    it("should have a back button on the detail page", () => {
      render(
        <RequisitionDetailClient
          requisitionId="req-123"
          userId="user-1"
          userRole="requester"
          initialRequisition={{
            id: "req-123",
            documentNumber: "REQ-2024-001",
            title: "Office Supplies",
            status: "DRAFT",
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            items: [],
          } as any}
        />,
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeDefined();
    });

    it("should call router.back() when back button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <RequisitionDetailClient
          requisitionId="req-123"
          userId="user-1"
          userRole="requester"
          initialRequisition={{
            id: "req-123",
            documentNumber: "REQ-2024-001",
            title: "Office Supplies",
            status: "DRAFT",
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            items: [],
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
        <RequisitionsTable
          userId="user-1"
          userRole="requester"
          refreshTrigger={0}
          onEditRequisition={vi.fn()}
          onCreateRequisition={vi.fn()}
        />,
      );

      // Step 2: Click view to navigate to detail
      const viewButton = await screen.findByRole("button", {
        name: /view details/i,
      });
      await user.click(viewButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/requisitions/req-123");
      });

      // Step 3: Simulate navigation to detail page
      unmount();
      render(
        <RequisitionDetailClient
          requisitionId="req-123"
          userId="user-1"
          userRole="requester"
          initialRequisition={{
            id: "req-123",
            documentNumber: "REQ-2024-001",
            title: "Office Supplies",
            status: "DRAFT",
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            items: [],
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
