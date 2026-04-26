# localStorage Strategy - Cache Layer Only

## Overview

**localStorage** is now purely a **cache and fallback layer**. It is NO LONGER the primary data store.

### Architecture Layers (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│                    React Query Cache                         │
│  (5-min stale time, 10-min garbage collection, in-memory)   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   localStorage Cache                         │
│    (Persists across page reloads, offline fallback)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              IndexedDB Operation Queue                       │
│    (Offline operation persistence, retry on reconnect)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            API (Server Actions → Real API)                   │
│              (Single Source of Truth)                        │
└─────────────────────────────────────────────────────────────┘
```

## What localStorage IS Used For

✅ **Caching API responses** - Store fetched requisitions, POs, PVs for offline access
✅ **User preferences** - Theme, layout settings (non-critical)
✅ **Fallback data** - When network fails, serve cached version
✅ **Development/Testing** - Mock seed data initialization

## What localStorage IS NOT Used For

❌ **Primary storage** - API is the source of truth
❌ **Mutations** - Create/Update/Delete go to API, not localStorage
❌ **Sync source** - Data syncs FROM API TO localStorage, never the other way
❌ **Operation queue** - Use IndexedDB for offline operations instead

## Implementation Details

### 1. Reading Data - Prefer API, Fallback to Cache

```typescript
// In server actions (e.g., requisitions.ts)
export const getRequisitions = cache(async () => {
  try {
    // Get from documentStore (which will be API when migrated)
    const workflowDocs = Array.from(documentStore.values());

    // Cache in localStorage for offline access
    try {
      localStorage.setItem('tether_requisitions_cache', JSON.stringify(workflowDocs));
    } catch (error) {
      console.warn('Failed to cache requisitions:', error);
    }

    return workflowDocs;
  } catch (error) {
    // Fallback to localStorage if API fails
    try {
      const cached = localStorage.getItem('tether_requisitions_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
});
```

### 2. Handling Mutations - Always Go to API

```typescript
// Create operation
const createRequisition = async (data) => {
  // Execute mutation against API (not localStorage)
  const result = await apiClient.requisitions.create(data);

  // Update cache after successful mutation
  if (result.success) {
    // React Query will invalidate and refetch automatically
    // Which will update localStorage in the process
    queryClient.invalidateQueries({ queryKey: queryKeys.requisitions.all() });
  }

  return result;
};
```

### 3. Cache Key Structure

All localStorage keys follow this pattern:
```typescript
// Simple keys for main data
tether_requisitions_cache
tether_purchase_orders_cache
tether_payment_vouchers_cache

// Specific item keys
tether_requisition_{id}_cache
tether_purchase_order_{id}_cache
```

### 4. Cache Expiration Strategy

localStorage persists indefinitely, but we use React Query's stale time to refresh:

```typescript
// 5-minute fresh time - data is fresh for 5 minutes
staleTime: 5 * 60 * 1000

// 10-minute garbage collection - keep in memory for 10 minutes
gcTime: 10 * 60 * 1000
```

When data becomes stale:
1. User sees cached data from localStorage (if available)
2. React Query automatically fetches fresh data in background
3. localStorage updates with fresh data
4. UI updates if data changed

### 5. Error Handling

```typescript
// Clear localStorage if corrupted
try {
  const cached = JSON.parse(localStorage.getItem('key'));
} catch (error) {
  // If parsing fails, clear corrupted data
  localStorage.removeItem('key');
  // Fetch fresh from API
}
```

## Migration Checklist

### ✅ Current State (Phases 1-5)
- React Query configured with smart caching
- localStorage acts as fallback layer
- IndexedDB queue for offline operations
- Query key factory pattern in place
- API client template created

### 🔄 When Backend API is Ready

1. **Replace documentStore with HTTP Client**
   ```typescript
   // Change this
   const workflowDocs = Array.from(documentStore.values());

   // To this
   const response = await fetch(`${API_URL}/requisitions`);
   const workflowDocs = await response.json();
   ```

2. **Update Offline Queue Processor**
   ```typescript
   // In useOfflineQueueProcessor.ts
   // Replace the TODO with actual API calls
   const result = await apiClient.requisitions.create(operation.data);
   ```

3. **Test Offline Scenario**
   - Go offline in DevTools
   - Create/update requisitions
   - Verify operations queue in IndexedDB
   - Come back online
   - Verify queue processes and data syncs

4. **Remove Mock Data**
   ```typescript
   // Delete mockRequisitions, mockPurchaseOrders, etc.
   // Delete documentStore initialization
   ```

5. **Verify localStorage Still Works**
   - Should auto-populate when API calls return
   - Should serve as fallback when offline
   - Should not block operations

## Performance Considerations

### Cache Hit Rate
- **React Query**: ~80% (5-minute window covers most operations)
- **localStorage**: ~95% (persists across sessions)
- **API**: Called when data is stale or cache miss

### Storage Limits
- localStorage: 5-10MB (browser dependent)
- Current data: ~100KB (requires ~50 requisitions + POs + PVs)
- Safe threshold: Use 2MB max, rest reserved for logs/sessions

### Garbage Collection
```typescript
// Clean up old cache entries monthly
function cleanupStaleCache() {
  const now = Date.now();
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  for (let key in localStorage) {
    const metadata = JSON.parse(localStorage.getItem(`${key}_meta`) || '{}');
    if (now - metadata.timestamp > oneMonth) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_meta`);
    }
  }
}
```

## Debugging Tips

### Check Cache State
```javascript
// In browser console
// React Query cache
window.__REACT_QUERY_DEVTOOLS__

// localStorage
Object.keys(localStorage).filter(k => k.startsWith('tether_'))

// IndexedDB queue
const db = await indexedDB.databases()[0];
const ops = await db.getAll('operations');
```

### Monitor Cache Updates
```typescript
// Enable debugging in query hooks
const { data } = useQuery({
  queryKey: queryKeys.requisitions.all(),
  queryFn: getRequisitions,
  meta: { debug: true } // Visible in React Query DevTools
});
```

### Clear All Caches (Development Only)
```typescript
// Clear everything
localStorage.clear();
sessionStorage.clear();
queryClient.clear();
// IndexedDB - needs to be cleared via dev tools
```

## Best Practices

### ✅ DO
- Let React Query manage cache updates
- Let localStorage fill automatically from API responses
- Use queryClient.invalidateQueries for consistency
- Test offline mode regularly
- Monitor cache size

### ❌ DON'T
- Directly write to localStorage on mutations
- Clear entire localStorage in production
- Rely on localStorage for critical data consistency
- Skip error handling in cache operations
- Use localStorage for sensitive data

## Related Files

- **API Client**: `src/lib/api/client.ts`
- **Offline Queue**: `src/lib/offline-queue.ts`
- **Query Keys**: `src/lib/query-keys.ts`
- **Query Configuration**: `src/app/providers.tsx`
- **Storage Utils**: `src/lib/storage/` (initialization only)

## References

- [React Query Caching](https://tanstack.com/query/latest/docs/react/caching)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web Storage Limits](https://www.w3.org/TR/webstorage/#storage-0)
