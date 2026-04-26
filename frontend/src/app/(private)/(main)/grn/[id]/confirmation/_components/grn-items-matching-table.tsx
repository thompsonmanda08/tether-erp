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

export interface GRNItem {
  id: string
  poLineId: string
  itemCode: string
  description: string
  orderedQty: number
  receivedQty: number
  unitPrice: number
  matched: boolean
}

interface GRNItemsMatchingTableProps {
  items: GRNItem[]
  onToggleMatch?: (itemId: string, matched: boolean) => void
}

export function GRNItemsMatchingTable({
  items,
  onToggleMatch
}: GRNItemsMatchingTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Ordered Qty</TableHead>
            <TableHead className="text-right">Received Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={item.matched}
                  onCheckedChange={(checked) =>
                    onToggleMatch?.(item.id, checked as boolean)
                  }
                />
              </TableCell>
              <TableCell className="font-medium">{item.itemCode}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-right">{item.orderedQty}</TableCell>
              <TableCell className="text-right">{item.receivedQty}</TableCell>
              <TableCell className="text-right">
                ${item.unitPrice.toFixed(2)}
              </TableCell>
              <TableCell>
                {item.receivedQty === item.orderedQty ? (
                  <span className="text-green-600">Matched</span>
                ) : (
                  <span className="text-yellow-600">Variance</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
