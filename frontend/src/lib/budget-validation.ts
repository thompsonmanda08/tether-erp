import { Budget ,BudgetItem} from '@/types/budget'


/**
 * Calculate total allocated amount across all budget items
 */
export function calculateTotalAllocated(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + item.allocatedAmount, 0)
}

/**
 * Calculate remaining budget after allocations
 */
export function calculateRemainingBudget(totalAmount: number, items: BudgetItem[]): number {
  const totalAllocated = calculateTotalAllocated(items)
  return totalAmount - totalAllocated
}

/**
 * Validate a budget item before adding/updating
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateBudgetItem(
  item: {
    allocatedAmount: number
    spentAmount?: number
  },
  currentItems: BudgetItem[],
  totalBudget: number,
  excludeItemId?: string
): ValidationResult {
  // Validate allocated amount is positive
  if (item.allocatedAmount <= 0) {
    return {
      valid: false,
      error: 'Allocated amount must be greater than 0',
    }
  }

  // Validate spent amount if provided
  if (item.spentAmount !== undefined) {
    if (item.spentAmount < 0) {
      return {
        valid: false,
        error: 'Spent amount cannot be negative',
      }
    }

    if (item.spentAmount > item.allocatedAmount) {
      return {
        valid: false,
        error: 'Spent amount cannot exceed allocated amount',
      }
    }
  }

  // Calculate total allocated including this item (excluding if editing)
  const otherItemsTotal = currentItems
    .filter((existing) => existing.id !== excludeItemId)
    .reduce((sum, existing) => sum + existing.allocatedAmount, 0)

  const newTotalAllocated = otherItemsTotal + item.allocatedAmount

  // Validate doesn't exceed total budget
  if (newTotalAllocated > totalBudget) {
    const excess = newTotalAllocated - totalBudget
    return {
      valid: false,
      error: `This would exceed your budget by ${excess.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })}`,
    }
  }

  return { valid: true }
}

/**
 * Check if budget is fully allocated
 */
export function isBudgetFullyAllocated(budget: Budget): boolean {
  return Math.abs(budget.allocatedAmount - budget.totalBudget) < 0.01 // Allow for floating point errors
}

/**
 * Check if budget is over-allocated
 */
export function isBudgetOverAllocated(budget: Budget): boolean {
  return budget.allocatedAmount > budget.totalBudget
}

/**
 * Check if budget is under-allocated
 */
export function isBudgetUnderAllocated(budget: Budget): boolean {
  return budget.allocatedAmount < budget.totalBudget
}

/**
 * Get allocation status for UI display
 */
export type AllocationStatus = 'under' | 'full' | 'over'

export function getAllocationStatus(budget: Budget): AllocationStatus {
  if (isBudgetOverAllocated(budget)) return 'over'
  if (isBudgetFullyAllocated(budget)) return 'full'
  return 'under'
}
