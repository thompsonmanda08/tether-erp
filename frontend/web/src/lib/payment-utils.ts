/**
 * Payment-related utility functions
 * Separated from server actions to avoid "use server" constraints
 */

export function generatePaymentReference(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PV-${year}${month}-${random}`;
}
