/**
 * Query Key Factory Pattern
 * Type-safe, hierarchical query key structure for React Query
 * Enables consistent cache invalidation and easy refactoring
 *
 * Usage:
 * const { data } = useQuery({
 *   queryKey: queryKeys.requisitions.all(),
 *   queryFn: getRequisitions,
 * });
 *
 * Invalidation:
 * queryClient.invalidateQueries({ queryKey: queryKeys.requisitions.all() })  // Invalidates all requisitions
 * queryClient.invalidateQueries({ queryKey: queryKeys.requisitions.detail(id) })  // Invalidates specific requisition
 */

export const queryKeys = {
  /**
   * Requisitions - Purchase request documents
   */
  requisitions: {
    all: () => ['requisitions'] as const,
    lists: () => [...queryKeys.requisitions.all(), 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.requisitions.lists(), { filters }] as const,
    details: () => [...queryKeys.requisitions.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.requisitions.details(), id] as const,
    stats: () => [...queryKeys.requisitions.all(), 'stats'] as const,
    byUser: (userId: string) =>
      [...queryKeys.requisitions.all(), 'by-user', userId] as const,
  },

  /**
   * Purchase Orders - PO documents created from approved requisitions
   */
  purchaseOrders: {
    all: () => ['purchase-orders'] as const,
    lists: () => [...queryKeys.purchaseOrders.all(), 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.purchaseOrders.lists(), { filters }] as const,
    details: () => [...queryKeys.purchaseOrders.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.details(), id] as const,
    stats: () => [...queryKeys.purchaseOrders.all(), 'stats'] as const,
    byUser: (userId: string) =>
      [...queryKeys.purchaseOrders.all(), 'by-user', userId] as const,
  },

  /**
   * Payment Vouchers - Payment records created from approved POs
   */
  paymentVouchers: {
    all: () => ['payment-vouchers'] as const,
    lists: () => [...queryKeys.paymentVouchers.all(), 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.paymentVouchers.lists(), { filters }] as const,
    details: () => [...queryKeys.paymentVouchers.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.paymentVouchers.details(), id] as const,
    stats: () => [...queryKeys.paymentVouchers.all(), 'stats'] as const,
    byUser: (userId: string) =>
      [...queryKeys.paymentVouchers.all(), 'by-user', userId] as const,
  },

  /**
   * GRN (Goods Received Notes) - Receipt records
   */
  grn: {
    all: () => ['grn'] as const,
    lists: () => [...queryKeys.grn.all(), 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.grn.lists(), { filters }] as const,
    details: () => [...queryKeys.grn.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.grn.details(), id] as const,
    byUser: (userId: string) => [...queryKeys.grn.all(), 'by-user', userId] as const,
  },

  /**
   * Dashboard - Metrics and activities
   */
  dashboard: {
    all: () => ['dashboard'] as const,
    metrics: () => [...queryKeys.dashboard.all(), 'metrics'] as const,
    activities: () => [...queryKeys.dashboard.all(), 'activities'] as const,
    overview: () => [...queryKeys.dashboard.all(), 'overview'] as const,
  },

  /**
   * Approvals & Workflows
   */
  approvals: {
    all: () => ['approvals'] as const,
    pending: () => [...queryKeys.approvals.all(), 'pending'] as const,
    history: () => [...queryKeys.approvals.all(), 'history'] as const,
  },

  workflows: {
    all: () => ['workflows'] as const,
    instances: () => [...queryKeys.workflows.all(), 'instances'] as const,
  },

  /**
   * Users & Auth
   */
  users: {
    all: () => ['users'] as const,
    profile: () => [...queryKeys.users.all(), 'profile'] as const,
    roles: () => [...queryKeys.users.all(), 'roles'] as const,
    sessions: () => [...queryKeys.users.all(), 'sessions'] as const,
  },

  /**
   * Configuration
   */
  config: {
    all: () => ['config'] as const,
    departments: () => [...queryKeys.config.all(), 'departments'] as const,
    currencies: () => [...queryKeys.config.all(), 'currencies'] as const,
    roles: () => [...queryKeys.config.all(), 'roles'] as const,
    branches: () => [...queryKeys.config.all(), 'branches'] as const,
    activeBranches: () => [...queryKeys.config.all(), 'branches', 'active'] as const,
    provinces: () => [...queryKeys.config.all(), 'provinces'] as const,
    towns: (provinceId?: string) =>
      provinceId
        ? ([...queryKeys.config.all(), 'towns', provinceId] as const)
        : ([...queryKeys.config.all(), 'towns'] as const),
  },

  /**
   * Notifications
   */
  notifications: {
    all: () => ['notifications'] as const,
    unread: () => [...queryKeys.notifications.all(), 'unread'] as const,
    unreadCount: () => [...queryKeys.notifications.all(), 'unread-count'] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.notifications.all(), 'list', { params }] as const,
    recent: () => [...queryKeys.notifications.all(), 'recent'] as const,
    stats: () => [...queryKeys.notifications.all(), 'stats'] as const,
    preferences: () => ['notification-preferences'] as const,
  },

  /**
   * Search & Analytics
   */
  search: {
    all: () => ['search'] as const,
    results: (query: string) => [...queryKeys.search.all(), 'results', query] as const,
  },

  analytics: {
    all: () => ['analytics'] as const,
    reports: () => [...queryKeys.analytics.all(), 'reports'] as const,
  },
};

/**
 * Helper function to invalidate all queries in a module
 * Example: invalidateModule(queryClient, 'requisitions')
 */
export function invalidateModule(
  queryClient: any,
  module: keyof typeof queryKeys
) {
  queryClient.invalidateQueries({ queryKey: queryKeys[module].all() });
}

/**
 * Helper function to invalidate cascading operations
 * Example: When REQ is approved → invalidate PO, PV, and Dashboard
 */
export function invalidateCascading(
  queryClient: any,
  modules: (keyof typeof queryKeys)[]
) {
  modules.forEach((module) => {
    queryClient.invalidateQueries({ queryKey: queryKeys[module].all() });
  });
}
