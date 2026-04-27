/**
 * Unit Tests for WorkflowActionButtons Component
 *
 * Tests cover all five variants (table, compact, inline, dropdown, detail),
 * button visibility based on task state, and modal rendering across variants.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowActionButtons } from "@/components/workflows/workflow-action-buttons";

// ============================================================================
// MOCKS
// ============================================================================

// Mock useSession — controls which user is "logged in"
const mockUser = {
  id: "user-123",
  name: "Alice Approver",
  email: "alice@example.com",
  role: "approver",
};

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ user: mockUser }),
}));

// Mock workflow utils
vi.mock("@/lib/workflow-utils", () => ({
  canUserActOnWorkflowTask: (_user: any, _task: any) => true,
  formatRoleForDisplay: (role: string) => role || "Approver",
}));

// Mock modals so they don't need their own dependencies
vi.mock("@/components/workflows/reassignment-modal", () => ({
  ReassignmentModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="reassignment-modal" /> : null,
}));

vi.mock("@/components/workflows/claim-task-modal", () => ({
  ClaimTaskModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="claim-modal" /> : null,
}));

vi.mock("@/components/workflows/approval-action-modal", () => ({
  ApprovalActionModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="approval-modal" /> : null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "29 minutes",
}));

// ============================================================================
// TASK FACTORIES
// ============================================================================

function makeTask(overrides?: Record<string, unknown>) {
  return {
    id: "task-001",
    status: "PENDING",
    claimedBy: undefined,
    assignedRole: "approver",
    assignedRoleName: "Approver",
    stageName: "Review",
    stageNumber: 1,
    entityType: "requisition",
    entityId: "req-001",
    ...overrides,
  };
}

/** Task that is claimed by the current user (user-123) */
function makeClaimedByMeTask() {
  return makeTask({ status: "CLAIMED", claimedBy: "user-123" });
}

/** Task claimed by someone else */
function makeClaimedByOtherTask() {
  return makeTask({ status: "CLAIMED", claimedBy: "user-other" });
}

// ============================================================================
// TESTS — TABLE VARIANT (default)
// ============================================================================

describe("WorkflowActionButtons - table variant", () => {
  it("renders a View button when showViewButton is true", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="table"
        showViewButton={true}
      />,
    );

    expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
  });

  it("does not render View button when showViewButton is false", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="table"
        showViewButton={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /^view$/i })).not.toBeInTheDocument();
  });

  it("renders Claim button for unclaimed pending task", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="table"
        onClaim={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /claim/i }),
    ).toBeInTheDocument();
  });

  it("renders Approve and Reject buttons when task is claimed by current user", () => {
    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="table"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("opens approval modal when Approve button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="table"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });

  it("opens approval modal when Reject button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="table"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });

  it("opens claim modal when Claim button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="table"
        onClaim={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /claim/i }));

    await waitFor(() => {
      expect(screen.getByTestId("claim-modal")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TESTS — COMPACT VARIANT
// ============================================================================

describe("WorkflowActionButtons - compact variant", () => {
  it("renders Claim button for unclaimed pending task", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="compact"
        onClaim={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /claim/i })).toBeInTheDocument();
  });

  it("renders Approve and Reject buttons when claimed by current user", () => {
    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="compact"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByTitle("Approve")).toBeInTheDocument();
    expect(screen.getByTitle("Reject")).toBeInTheDocument();
  });

  it("opens approval modal when Approve is clicked in compact variant", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="compact"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle("Approve"));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });

  it("opens approval modal when Reject is clicked in compact variant", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="compact"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle("Reject"));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TESTS — INLINE VARIANT
// ============================================================================

describe("WorkflowActionButtons - inline variant", () => {
  it("renders workflow status area", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="inline"
      />,
    );

    expect(screen.getByText(/workflow status/i)).toBeInTheDocument();
  });

  it("renders Claim for Review button for unclaimed task", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="inline"
        onClaim={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /claim for review/i }),
    ).toBeInTheDocument();
  });

  it("renders Approve and Reject buttons when claimed by current user", () => {
    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="inline"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("opens approval modal when Approve clicked in inline variant", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="inline"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });

  it("shows message when task is claimed by another user", () => {
    render(
      <WorkflowActionButtons
        task={makeClaimedByOtherTask()}
        variant="inline"
      />,
    );

    expect(
      screen.getByText(/currently being reviewed by another user/i),
    ).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — DROPDOWN VARIANT
// ============================================================================

describe("WorkflowActionButtons - dropdown variant", () => {
  it("renders a dropdown trigger button", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="dropdown"
      />,
    );

    // MoreHorizontal button should be present
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens dropdown and shows workflow status section", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="dropdown"
      />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText(/workflow status/i)).toBeInTheDocument();
    });
  });

  it("shows Approve and Reject in dropdown when task claimed by current user", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="dropdown"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
      expect(screen.getByText("Reject")).toBeInTheDocument();
    });
  });

  it("opens approval modal when Approve selected from dropdown", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="dropdown"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button"));
    await waitFor(() => screen.getByText("Approve"));
    await user.click(screen.getByText("Approve"));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TESTS — DETAIL VARIANT
// ============================================================================

describe("WorkflowActionButtons - detail variant", () => {
  it("renders Claim Task button for unclaimed pending task", () => {
    render(
      <WorkflowActionButtons
        task={makeTask()}
        variant="detail"
        onClaim={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /claim task/i }),
    ).toBeInTheDocument();
  });

  it("renders Approve and Reject when task claimed by current user", () => {
    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="detail"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("opens approval modal when Approve clicked in detail variant", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="detail"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });

  it("opens approval modal when Reject clicked in detail variant", async () => {
    const user = userEvent.setup();

    render(
      <WorkflowActionButtons
        task={makeClaimedByMeTask()}
        variant="detail"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => {
      expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
    });
  });

  it("shows 'task claimed by another user' message in detail variant", () => {
    render(
      <WorkflowActionButtons
        task={makeClaimedByOtherTask()}
        variant="detail"
      />,
    );

    expect(
      screen.getByText(/task claimed by another user/i),
    ).toBeInTheDocument();
  });

  it("shows Approved status button when task is approved and showStatus is true", () => {
    render(
      <WorkflowActionButtons
        task={makeTask({ status: "APPROVED" })}
        variant="detail"
        showStatus={true}
      />,
    );

    expect(screen.getByRole("button", { name: /approved/i })).toBeInTheDocument();
  });

  it("shows Rejected status button when task is rejected and showStatus is true", () => {
    render(
      <WorkflowActionButtons
        task={makeTask({ status: "REJECTED" })}
        variant="detail"
        showStatus={true}
      />,
    );

    expect(screen.getByRole("button", { name: /rejected/i })).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Shared: modal always included regardless of variant
// ============================================================================

describe("WorkflowActionButtons - modal available in every variant", () => {
  const variants = ["table", "compact", "inline", "dropdown", "detail"] as const;

  for (const variant of variants) {
    it(`approval modal renders in ${variant} variant when triggered`, async () => {
      const user = userEvent.setup();

      const { container } = render(
        <WorkflowActionButtons
          task={makeClaimedByMeTask()}
          variant={variant}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />,
      );

      // Find ANY approve button or title to click
      const approveBtn =
        screen.queryByRole("button", { name: /approve/i }) ||
        screen.queryByTitle("Approve");

      if (approveBtn) {
        await user.click(approveBtn);
        await waitFor(() => {
          expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
        });
      } else if (variant === "dropdown") {
        // For dropdown, we need to open the menu first
        const trigger = container.querySelector("button");
        if (trigger) {
          await user.click(trigger);
          await waitFor(() => screen.queryByText("Approve"));
          const approveItem = screen.queryByText("Approve");
          if (approveItem) {
            await user.click(approveItem);
            await waitFor(() => {
              expect(screen.getByTestId("approval-modal")).toBeInTheDocument();
            });
          }
        }
      }
    });
  }
});
