import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PurchaseOrderItemsList } from "@/app/(private)/(main)/purchase-orders/_components/purchase-order-items-list";
import { POItem } from "@/types/purchase-order";

describe("PurchaseOrderItemsList", () => {
  const mockItems: POItem[] = [
    {
      id: "1",
      description: "Laptop Computer",
      quantity: 2,
      unitPrice: 1500.0,
      amount: 3000.0,
      totalPrice: 3000.0,
      unit: "pcs",
      category: "Electronics",
      notes: "High performance",
    },
    {
      id: "2",
      description: "Office Chair",
      quantity: 5,
      unitPrice: 250.0,
      amount: 1250.0,
      totalPrice: 1250.0,
      unit: "pcs",
      category: "Furniture",
    },
  ];

  it("should render items with correct data", () => {
    render(<PurchaseOrderItemsList items={mockItems} currency="ZMW" />);

    // Check if item descriptions are rendered
    expect(screen.getByText("Laptop Computer")).toBeInTheDocument();
    expect(screen.getByText("Office Chair")).toBeInTheDocument();

    // Check if categories are rendered
    expect(screen.getByText(/Electronics/)).toBeInTheDocument();
    expect(screen.getByText(/Furniture/)).toBeInTheDocument();
  });

  it("should calculate and display total amount correctly", () => {
    render(<PurchaseOrderItemsList items={mockItems} currency="ZMW" />);

    // Total should be 3000 + 1250 = 4250
    // Use getAllByText since the total appears in both mobile and desktop views
    const totalElements = screen.getAllByText(/4,250\.00/);
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it("should display correct item count", () => {
    render(<PurchaseOrderItemsList items={mockItems} currency="ZMW" />);

    // Use getAllByText since the text appears in both mobile and desktop views
    const itemCountElements = screen.getAllByText(/2 items/);
    expect(itemCountElements.length).toBeGreaterThan(0);
  });

  it("should display currency correctly", () => {
    render(<PurchaseOrderItemsList items={mockItems} currency="USD" />);

    // Check if USD is displayed (multiple times for each item)
    const currencyElements = screen.getAllByText(/USD/);
    expect(currencyElements.length).toBeGreaterThan(0);
  });

  it("should handle items without optional fields", () => {
    const minimalItems: POItem[] = [
      {
        description: "Basic Item",
        quantity: 1,
        unitPrice: 100.0,
        amount: 100.0,
      },
    ];

    render(<PurchaseOrderItemsList items={minimalItems} currency="ZMW" />);

    expect(screen.getByText("Basic Item")).toBeInTheDocument();
    // Use getAllByText since the amount appears multiple times
    const amountElements = screen.getAllByText(/100\.00/);
    expect(amountElements.length).toBeGreaterThan(0);
  });

  it("should display item numbers correctly", () => {
    render(<PurchaseOrderItemsList items={mockItems} currency="ZMW" />);

    // Check for item numbers (01, 02)
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("should handle single item correctly", () => {
    const singleItem: POItem[] = [mockItems[0]];

    render(<PurchaseOrderItemsList items={singleItem} currency="ZMW" />);

    // Use getAllByText since the text appears in both mobile and desktop views
    const itemCountElements = screen.getAllByText(/1 item/);
    expect(itemCountElements.length).toBeGreaterThan(0);
  });

  it("should format numbers with two decimal places", () => {
    const itemsWithDecimals: POItem[] = [
      {
        description: "Test Item",
        quantity: 1,
        unitPrice: 99.99,
        amount: 99.99,
        totalPrice: 99.99,
      },
    ];

    render(<PurchaseOrderItemsList items={itemsWithDecimals} currency="ZMW" />);

    // Use getAllByText since the amount appears multiple times
    const amountElements = screen.getAllByText(/99\.99/);
    expect(amountElements.length).toBeGreaterThan(0);
  });
});
