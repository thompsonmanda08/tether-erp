/**
 * Integration tests for GRN (Goods Received Note) navigation
 * Tests routing from GRN list to detail page and back button functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock server-side modules
vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/app/_actions/grn-actions", () => ({
  getGRNAction: vi.fn(),
  getGRNsAction: vi.fn(),
  createGRNAction: vi.fn(),
  updateGRNAction: vi.fn(),
  deleteGRNAction: vi.fn(),
  confirmGRNAction: vi.fn(),
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
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
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
  "@/app/(private)/(main)/grn/[id]/_components/grn-items-matching-table",
  () => ({
    GRNItemsMatchingTable: () => <div>Items Table</div>,
  }),
);

vi.mock(
  "@/app/(private)/(main)/grn/[id]/_components/quality-issue-dialog",
  () => ({
    QualityIssueReportDialog: () => <div>Quality Issue Dialog</div>,
  }),
);

vi.mock("@/hooks/use-quality-issue-mutations", () => ({
  useAddQualityIssueMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock the hooks
vi.mock("@/hooks/use-grn-queries", () => ({
  useGRNs: vi.fn(() => ({
    data: [
      {
        id: "grn-123",
        documentNumber: "GRN-2024-001",
        poNumber: "PO-2024-001",
        status: "DRAFT",
        approvalStage: 1,
        currentStage: 1,
        receivedBy: "user-1",
        receivedDate: new Date("2024-01-01"),
        createdBy: "user-1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        metadata: {
          poId: "po-123",
          vendorName: "Test Vendor",
          amount: 8000,
        },
      },
    ],
    refetch: vi.fn(),
  })),
  useGRNById: vi.fn(),
}));

vi.mock("@/hooks/use-grn-detail", () => ({
  useGRNDetail: vi.fn(() => ({
    document: {
      id: "grn-123",
      documentNumber: "GRN-2024-001",
      poNumber: "PO-2024-001",
      status: "DRAFT",
      stageName: "Initial Receipt",
      currentStage: 1,
      warehouseLocation: "Warehouse A",
      receivedDate: new Date("2024-01-01"),
      receivedBy: "user-1",
      approvedBy: null,
      notes: null,
      items: [],
      qualityIssues: [],
    },
    isLoading: false,
    permissions: {
      isCreator: true,
      canEdit: true,
      canSubmit: false,
      canWithdraw: false,
    },
  })),
}));

// Import components after mocks
import { GrnTable } from "@/app/(private)/(main)/grn/_components/grn-table";
import { GRNDetailClient } from "@/app/(private)/(main)/grn/[id]/_components/grn-detail-client";

describe("GRN Navigation", () => {
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
  });

  describe("GRN List to Detail Page Navigation", () => {
    it("should navigate to detail page when View button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <GrnTable
          userId="user-1"
          userRole="finance"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      const viewButton = await screen.findByRole("button", { name: /view/i });
      await user.click(viewButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/grn/grn-123");
      });
    });

    it("should navigate to correct detail URL format", async () => {
      const user = userEvent.setup();

      render(
        <GrnTable
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
        expect(callArg).toMatch(/^\/grn\/[a-zA-Z0-9-]+$/);
      });
    });

    it("should show Edit button when user can modify the GRN", async () => {
      render(
        <GrnTable
          userId="user-1"
          userRole="requester"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      // GRN status is DRAFT and createdBy === userId, so Edit should appear
      const editButton = await screen.findByRole("button", { name: /edit/i });
      expect(editButton).toBeDefined();
    });

    it("should navigate to edit page when Edit button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <GrnTable
          userId="user-1"
          userRole="requester"
          refreshTrigger={0}
          onRefresh={vi.fn()}
        />,
      );

      const editButton = await screen.findByRole("button", { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/grn/grn-123/edit");
      });
    });
  });

  describe("Back Button Navigation", () => {
    it("should have a back button on the GRN detail page", () => {
      render(
        <GRNDetailClient grnId="grn-123" userId="user-1" userRole="finance" />,
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeDefined();
    });

    it("should call router.back() when back button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <GRNDetailClient grnId="grn-123" userId="user-1" userRole="finance" />,
      );

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });

    it("should also call router.back() via Cancel button", async () => {
      const user = userEvent.setup();

      render(
        <GRNDetailClient grnId="grn-123" userId="user-1" userRole="finance" />,
      );

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

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
        <GrnTable
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
        expect(mockPush).toHaveBeenCalledWith("/grn/grn-123");
      });

      // Step 3: Simulate navigation to detail page
      unmount();
      render(
        <GRNDetailClient grnId="grn-123" userId="user-1" userRole="finance" />,
      );

      // Step 4: Click back button
      const backButton = screen.getByRole("button", { name: /^back$/i });
      await user.click(backButton);

      // Step 5: Verify back navigation
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
      });
    });
  });
});
