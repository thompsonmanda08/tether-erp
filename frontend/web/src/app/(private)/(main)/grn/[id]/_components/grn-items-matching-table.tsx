"use client";

import type { GRNItem } from "@/types/goods-received-note";

interface GRNItemsMatchingTableProps {
  items: GRNItem[];
}

const CONDITION_BADGE: Record<string, string> = {
  good: "bg-green-100 text-green-800",
  damaged: "bg-red-100 text-red-800",
  missing: "bg-yellow-100 text-yellow-800",
};

export function GRNItemsMatchingTable({ items }: GRNItemsMatchingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="text-left font-semibold py-3 px-4">#</th>
            <th className="text-left font-semibold py-3 px-4">Description</th>
            <th className="text-center font-semibold py-3 px-4">Ordered</th>
            <th className="text-center font-semibold py-3 px-4">Received</th>
            <th className="text-center font-semibold py-3 px-4">Variance</th>
            <th className="text-center font-semibold py-3 px-4">Condition</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index} className="border-b hover:bg-muted/30">
              <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium">{item.description}</p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.notes}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-center font-semibold">
                {item.quantityOrdered}
              </td>
              <td className="py-3 px-4 text-center font-semibold">
                {item.quantityReceived}
              </td>
              <td
                className={`py-3 px-4 text-center font-semibold ${
                  item.variance !== 0
                    ? item.variance > 0
                      ? "text-green-600"
                      : "text-red-600"
                    : ""
                }`}
              >
                {item.variance > 0 ? "+" : ""}
                {item.variance}
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${CONDITION_BADGE[item.condition] || "bg-gray-100 text-gray-800"}`}
                >
                  {item.condition}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
