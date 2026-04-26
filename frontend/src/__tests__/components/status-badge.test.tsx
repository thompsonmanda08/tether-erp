/**
 * Unit Tests for StatusBadge Component
 *
 * Tests cover correct label rendering for all known status values across
 * every badge type, and fallback behaviour for unknown statuses.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/status-badge";

// ============================================================================
// TESTS — Document Status Type
// ============================================================================

describe('StatusBadge - type="document"', () => {
  const cases: [string, string][] = [
    ["DRAFT", "Draft"],
    ["SUBMITTED", "Submitted"],
    ["IN_REVIEW", "In Review"],
    ["PENDING", "In Review"],     // PENDING maps to same label as IN_REVIEW
    ["APPROVED", "Approved"],
    ["REJECTED", "Rejected"],
    ["COMPLETED", "Completed"],
    ["CANCELLED", "Cancelled"],
    ["PAID", "Paid"],
    ["FULFILLED", "Fulfilled"],
    ["REVISION", "Revision"],
    ["REVERSED", "Reversed"],
    ["SUCCESS", "Success"],
  ];

  for (const [status, expectedLabel] of cases) {
    it(`renders "${expectedLabel}" for status "${status}"`, () => {
      render(<StatusBadge status={status} type="document" />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  }

  it("falls back to the raw status for an unknown document status", () => {
    render(<StatusBadge status="UNKNOWN_STATUS" type="document" />);
    expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Action Type
// ============================================================================

describe('StatusBadge - type="action"', () => {
  const cases: [string, string][] = [
    ["created", "Created"],
    ["approved", "Approved"],
    ["rejected", "Rejected"],
    ["submitted", "Submitted"],
    ["edited", "Edited"],
    ["viewed", "Viewed"],
    ["deleted", "Deleted"],
  ];

  for (const [status, expectedLabel] of cases) {
    it(`renders "${expectedLabel}" for action "${status}"`, () => {
      render(<StatusBadge status={status} type="action" />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  }

  it("falls back to the raw status for an unknown action", () => {
    render(<StatusBadge status="merged" type="action" />);
    expect(screen.getByText("merged")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Execution Status Type
// ============================================================================

describe('StatusBadge - type="execution"', () => {
  it("renders badge for SUCCESS", () => {
    render(<StatusBadge status="SUCCESS" type="execution" />);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders badge for PENDING", () => {
    render(<StatusBadge status="PENDING" type="execution" />);
    // PENDING in execution context has its own label
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders badge for IN_PROGRESS", () => {
    render(<StatusBadge status="IN_PROGRESS" type="execution" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("falls back to raw status for unknown execution status", () => {
    render(<StatusBadge status="QUEUED" type="execution" />);
    expect(screen.getByText("QUEUED")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Approval Status Type
// ============================================================================

describe('StatusBadge - type="approval"', () => {
  it("renders badge for APPROVED", () => {
    render(<StatusBadge status="APPROVED" type="approval" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("renders badge for REJECTED", () => {
    render(<StatusBadge status="REJECTED" type="approval" />);
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("renders badge for PENDING", () => {
    render(<StatusBadge status="PENDING" type="approval" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders badge for IN_PROGRESS", () => {
    render(<StatusBadge status="IN_PROGRESS" type="approval" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("falls back to raw status for unknown approval status", () => {
    render(<StatusBadge status="SKIPPED" type="approval" />);
    expect(screen.getByText("SKIPPED")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Compliance Status Type
// ============================================================================

describe('StatusBadge - type="compliance"', () => {
  it("renders compliant badge", () => {
    render(<StatusBadge status="compliant" type="compliance" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders non-compliant badge", () => {
    render(<StatusBadge status="non-compliant" type="compliance" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders pending badge", () => {
    render(<StatusBadge status="pending" type="compliance" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("falls back for unknown compliance status", () => {
    render(<StatusBadge status="waived" type="compliance" />);
    expect(screen.getByText("waived")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Role Type
// ============================================================================

describe('StatusBadge - type="role"', () => {
  it("renders admin role badge", () => {
    render(<StatusBadge status="admin" type="role" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders approver role badge", () => {
    render(<StatusBadge status="approver" type="role" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders finance role badge", () => {
    render(<StatusBadge status="finance" type="role" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders requester role badge", () => {
    render(<StatusBadge status="requester" type="role" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("falls back for unknown role", () => {
    render(<StatusBadge status="viewer" type="role" />);
    expect(screen.getByText("viewer")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — Health Status Type
// ============================================================================

describe('StatusBadge - type="health"', () => {
  it("renders healthy badge", () => {
    render(<StatusBadge status="healthy" type="health" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders issues badge", () => {
    render(<StatusBadge status="issues" type="health" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("renders down badge", () => {
    render(<StatusBadge status="down" type="health" />);
    expect(document.querySelector('[data-slot="badge"]')).not.toBeNull();
  });

  it("falls back for unknown health status", () => {
    render(<StatusBadge status="degraded" type="health" />);
    expect(screen.getByText("degraded")).toBeInTheDocument();
  });
});

// ============================================================================
// TESTS — General Behaviour
// ============================================================================

describe("StatusBadge - General Behaviour", () => {
  it("renders a badge element for every call", () => {
    render(<StatusBadge status="DRAFT" type="document" />);
    // Badge is a span/div with role implicit
    const badge = screen.getByText("Draft");
    expect(badge).toBeInTheDocument();
  });

  it("accepts an optional className prop without breaking", () => {
    render(
      <StatusBadge status="DRAFT" type="document" className="extra-class" />,
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("is case-insensitive for document statuses (uppercase normalisation)", () => {
    // The component uppercases the status before lookup
    render(<StatusBadge status="draft" type="document" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});
