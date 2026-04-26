'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { POItem } from '@/types/purchase-order'

interface POItemsTableProps {
  items: POItem[]
  onSelectItem?: (itemId: string, selected: boolean) => void
  selectedItems?: string[]
}

export function POItemsTable({
  items,
  onSelectItem,
  selectedItems = []
}: POItemsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id || item.description}>
              <TableCell>
                <Checkbox
                  checked={selectedItems?.includes(item.id || '') || false}
                  onCheckedChange={(checked) =>
                    onSelectItem?.(item.id || '', checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium">{item.itemCode || item.itemNumber || 'N/A'}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                ${item.unitPrice.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                ${(item.totalPrice || item.amount || 0).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
