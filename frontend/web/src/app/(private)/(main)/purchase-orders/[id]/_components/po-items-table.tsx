'use client'

interface POItem {
  id: string
  itemNumber: number
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  unit: string
  expectedDelivery?: string
}

interface POItemsTableProps {
  items: POItem[]
}

export function POItemsTable({ items }: POItemsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="text-left font-semibold py-3 px-4">#</th>
            <th className="text-left font-semibold py-3 px-4">Description</th>
            <th className="text-right font-semibold py-3 px-4">Quantity</th>
            <th className="text-right font-semibold py-3 px-4">Unit Price</th>
            <th className="text-right font-semibold py-3 px-4">Total</th>
            <th className="text-left font-semibold py-3 px-4">Delivery</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-muted/30">
              <td className="py-3 px-4 text-muted-foreground">{item.itemNumber}</td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-right">{item.quantity}</td>
              <td className="py-3 px-4 text-right">
                K{item.unitPrice.toLocaleString('en-ZM')}
              </td>
              <td className="py-3 px-4 text-right font-semibold">
                K{item.totalPrice.toLocaleString('en-ZM')}
              </td>
              <td className="py-3 px-4">
                {item.expectedDelivery
                  ? new Date(item.expectedDelivery).toLocaleDateString()
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
