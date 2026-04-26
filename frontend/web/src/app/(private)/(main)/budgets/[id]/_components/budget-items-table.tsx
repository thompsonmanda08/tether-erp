'use client'

import { Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { BudgetItem } from '@/types/budget'

interface BudgetItemsTableProps {
  items: BudgetItem[]
  currency: string
  status?: string
  onEditItem?: (item: BudgetItem) => void
  onDeleteItem?: (itemId: string) => void
}

export function BudgetItemsTable({ items, currency, status, onEditItem, onDeleteItem }: BudgetItemsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const totalAllocated = items.reduce((sum, item) => sum + item.allocatedAmount, 0)
  const totalSpent = items.reduce((sum, item) => sum + item.spentAmount, 0)
  const totalRemaining = items.reduce((sum, item) => sum + item.remainingAmount, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">% Used</TableHead>
              {status === 'DRAFT' && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const percentageUsed = (item.spentAmount / item.allocatedAmount) * 100
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.allocatedAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.spentAmount > 0 ? 'text-orange-600 font-medium' : ''}>
                      {formatCurrency(item.spentAmount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.remainingAmount > 0 ? 'text-green-600 font-medium' : ''}>
                      {formatCurrency(item.remainingAmount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm">{percentageUsed.toFixed(1)}%</span>
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  {status === 'DRAFT' && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditItem?.(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteItem?.(item.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Totals Row */}
      <div className="rounded-md border bg-muted/50 p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Allocated</p>
            <p className="text-lg font-bold">{formatCurrency(totalAllocated)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totalSpent)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Remaining</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalRemaining)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overall Usage</p>
            <p className="text-lg font-bold">
              {((totalSpent / totalAllocated) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
