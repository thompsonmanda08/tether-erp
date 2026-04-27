# Storage System

Centralized storage management for the Tether-ERP application. This folder contains all localStorage operations and serves as the single source of truth for all in-app data until backend APIs are integrated.

## Architecture

```
storage/
├── storage.ts          # Core storage operations (CRUD)
├── init.ts            # Initialization and reset functions
├── hooks.ts           # High-level hooks for components
├── seed-data.ts       # Seed data generators
├── index.ts           # Barrel export for easy imports
└── README.md          # This file
```

## Quick Start

### Initialize Storage

The storage is automatically initialized on app startup via the `useInitializeStorage()` hook in `app/providers.tsx`.

### Use Storage in Components

```typescript
// Option 1: Direct imports from hooks
import { getPurchaseOrders, savePurchaseOrder } from '@/lib/storage';

const orders = getPurchaseOrders();
const saved = savePurchaseOrder(order);

// Option 2: Barrel import
import { getPurchaseOrders, savePurchaseOrder } from '@/lib/storage';
```

## API Reference

### Core Storage (`storage.ts`)

#### `getDocuments<T>(storageKey: string): T[]`
Get all documents of a specific type.

```typescript
const orders = getDocuments<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS);
```

#### `getDocumentById<T>(storageKey: string, id: string): T | null`
Get a single document by ID.

```typescript
const order = getDocumentById<PurchaseOrder>(STORAGE_KEYS.PURCHASE_ORDERS, 'po-123');
```

#### `saveDocument<T>(storageKey: string, document: T): T`
Save or update a document.

```typescript
const updated = saveDocument(STORAGE_KEYS.PURCHASE_ORDERS, order);
```

#### `deleteDocument(storageKey: string, id: string): void`
Delete a document.

```typescript
deleteDocument(STORAGE_KEYS.PURCHASE_ORDERS, 'po-123');
```

#### `clearDocuments(storageKey: string): void`
Clear all documents of a specific type.

```typescript
clearDocuments(STORAGE_KEYS.PURCHASE_ORDERS);
```

#### `clearAllData(): void`
Clear all application data.

```typescript
clearAllData();
```

### Storage Keys (`storage.ts`)

```typescript
STORAGE_KEYS = {
  PURCHASE_ORDERS: 'tether_purchase_orders',
  REQUISITIONS: 'tether_requisitions',
  PAYMENT_VOUCHERS: 'tether_payment_vouchers',
}
```

### Purchase Order Hooks (`hooks.ts`)

```typescript
getPurchaseOrders(): PurchaseOrder[]
getPurchaseOrderById(id: string): PurchaseOrder | null
savePurchaseOrder(po: PurchaseOrder): PurchaseOrder
deletePurchaseOrder(id: string): void
filterPurchaseOrders(predicate: (po: PurchaseOrder) => boolean): PurchaseOrder[]
getPurchaseOrdersByStatus(status: string): PurchaseOrder[]
getPurchaseOrdersByCreator(creatorId: string): PurchaseOrder[]
```

### Requisition Hooks (`hooks.ts`)

```typescript
getRequisitions(): RequisitionForm[]
getRequisitionById(id: string): RequisitionForm | null
saveRequisition(req: RequisitionForm): RequisitionForm
deleteRequisition(id: string): void
filterRequisitions(predicate: (req: RequisitionForm) => boolean): RequisitionForm[]
getRequisitionsByStatus(status: string): RequisitionForm[]
getRequisitionsByCreator(creatorId: string): RequisitionForm[]
getRequisitionsByDepartment(department: string): RequisitionForm[]
```

### Payment Voucher Hooks (`hooks.ts`)

```typescript
getPaymentVouchers(): PaymentVoucher[]
getPaymentVoucherById(id: string): PaymentVoucher | null
savePaymentVoucher(pv: PaymentVoucher): PaymentVoucher
deletePaymentVoucher(id: string): void
filterPaymentVouchers(predicate: (pv: PaymentVoucher) => boolean): PaymentVoucher[]
getPaymentVouchersByStatus(status: string): PaymentVoucher[]
getPaymentVouchersByCreator(creatorId: string): PaymentVoucher[]
getPaymentVouchersByAmount(minAmount: number, maxAmount: number): PaymentVoucher[]
```

### Bulk Operations (`hooks.ts`)

```typescript
getAllDocuments(): {
  purchaseOrders: PurchaseOrder[]
  requisitions: RequisitionForm[]
  paymentVouchers: PaymentVoucher[]
}

getDocumentsByStatus(status: string): {
  purchaseOrders: PurchaseOrder[]
  requisitions: RequisitionForm[]
  paymentVouchers: PaymentVoucher[]
}

getDocumentsByCreator(creatorId: string): {
  purchaseOrders: PurchaseOrder[]
  requisitions: RequisitionForm[]
  paymentVouchers: PaymentVoucher[]
}
```

### Initialization (`init.ts`)

```typescript
initializeStorage(): void
  // Initialize localStorage with seed data if empty
  // Safe to call multiple times

resetStorage(): void
  // Clear all data and reinitialize with seed data
  // Use for development/testing
```

### Utilities (`storage.ts`)

```typescript
isStorageInitialized(): boolean
  // Check if storage has been initialized

getStorageStats(): {
  purchaseOrders: number
  requisitions: number
  paymentVouchers: number
  total: number
}

exportStorageAsJSON(): Record<string, any>
  // Export all storage data as JSON (for debugging)
```

## Examples

### Get Purchase Orders by User

```typescript
import { getPurchaseOrdersByCreator } from '@/lib/storage';

function MyOrders() {
  const userId = useSession().user.id;
  const orders = getPurchaseOrdersByCreator(userId);

  return <OrderList orders={orders} />;
}
```

### Create and Save a New Requisition

```typescript
import { saveRequisition } from '@/lib/storage';

function CreateRequisition() {
  const handleSave = (newReq: RequisitionForm) => {
    const saved = saveRequisition(newReq);
    console.log('Saved:', saved);
  };

  return <RequisitionForm onSave={handleSave} />;
}
```

### Get Statistics

```typescript
import { getStorageStats } from '@/lib/storage';

function Dashboard() {
  const stats = getStorageStats();

  return (
    <div>
      <p>Purchase Orders: {stats.purchaseOrders}</p>
      <p>Requisitions: {stats.requisitions}</p>
      <p>Payment Vouchers: {stats.paymentVouchers}</p>
      <p>Total: {stats.total}</p>
    </div>
  );
}
```

### Reset Data (Development Only)

```typescript
import { resetStorage } from '@/lib/storage';

function AdminPanel() {
  const handleReset = () => {
    resetStorage();
    console.log('Storage reset');
  };

  return <button onClick={handleReset}>Reset Data</button>;
}
```

## Migration Guide: From localStorage to Backend APIs

When backend APIs are ready, follow these steps:

### 1. Update Server Actions

Replace direct localStorage calls with API calls:

```typescript
// Before
import { getPurchaseOrders } from '@/lib/storage';

export async function fetchPurchaseOrders() {
  const orders = getPurchaseOrders();
  return orders;
}

// After
export async function fetchPurchaseOrders() {
  const response = await fetch('/api/purchase-orders');
  return response.json();
}
```

### 2. Update Hooks (Optional)

Update hooks to call server actions or API endpoints:

```typescript
// Before
import { getPurchaseOrders } from '@/lib/storage';

// After
import { useQuery } from '@tanstack/react-query';

export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: async () => {
      const response = await fetch('/api/purchase-orders');
      return response.json();
    },
  });
};
```

### 3. Remove Storage Folder

Once all components are using the new API hooks/actions:

1. Delete `/src/lib/storage` folder
2. Delete `/src/lib/init-storage.ts`
3. Remove `useInitializeStorage()` from `app/providers.tsx`
4. Remove `use-initialize-storage.ts` hook

## Testing & Development

### Reset Data to Defaults

```typescript
import { resetStorage } from '@/lib/storage';

// Reset all data to initial seed state
resetStorage();
```

### Export Data for Inspection

```typescript
import { exportStorageAsJSON } from '@/lib/storage';

const data = exportStorageAsJSON();
console.log(JSON.stringify(data, null, 2));
```

### Clear Specific Document Type

```typescript
import { clearDocuments, STORAGE_KEYS } from '@/lib/storage';

// Clear only purchase orders
clearDocuments(STORAGE_KEYS.PURCHASE_ORDERS);
```

## Storage Keys

All data is stored in localStorage with these keys:

- `tether_purchase_orders` - Purchase Order documents
- `tether_requisitions` - Requisition Form documents
- `tether_payment_vouchers` - Payment Voucher documents

## Performance Considerations

- All operations are synchronous and fast (reading/writing to localStorage)
- No caching is implemented - each call reads from localStorage
- For large datasets, consider adding a React Context or custom hook to cache data
- Migration to backend APIs will improve performance significantly

## Notes

- Storage is automatically initialized on app startup
- Initialization only happens once (subsequent calls check if already initialized)
- All seed data uses UTC dates
- IDs are generated using UUID v4
- All operations are safe for SSR (check for `typeof window`)

