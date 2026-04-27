export const AUTH_SESSION = "__com.tether-erp.com__";
export const USER_SESSION = "__com.tether-erp-user__";
export const PERMISSIONS_SESSION = "__com.tether-erp-pem__";
export const SCREEN_LOCK_SESSION = "__com.tether-erp-screen-lock__"; // Persists screen lock state across reloads

export const placeHolderImage = "/images/placeholder-image.webp";
export const DefaultCover = "/images/profile-cover.jpg";
export const backgroundAuthImage = "/images/background-auth.jpg";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // MB
export const DEFAULT_DATE_RANGE_DAYS = 30; // 30 DAYS
export const DEFAULT_PAGINATION = { page: 1, limit: 20 };

export const DEFAULT_DATE_RANGE = {
  start_date: new Date(
    new Date().getTime() - DEFAULT_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0],
  end_date: new Date().toISOString().split("T")[0],
  range: "",
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const rowsPerPageOptions = [
  {
    ID: 5,
    label: "5",
  },
  {
    ID: 8,
    label: "8",
  },
  {
    ID: 10,
    label: "10",
  },
  {
    ID: 15,
    label: "15",
  },
  {
    ID: 20,
    label: "20",
  },
];

// WORKFLOW TRIGGER TYPES
export const WORKFLOW_TRIGGER_TYPES = [
  "BUDGET_CREATION",
  "UNIVERSE_CREATION",
  "AUDIT_PLAN",
  "FINDINGS",
  "RISK_ACCEPTANCE",
] as const;

// QUERY KEYS - Single source of truth for all React Query keys
export const QUERY_KEYS = {
  // User & Auth
  USERS: "users",
  USER_PROFILE: "user-profile",
  USER_SESSIONS: "user-sessions",

  // Configuration
  CONFIGS: "configs",
  USER_ROLES: "user-roles",
  DEPARTMENTS: "departments",
  BRANCHES: "branches",
  MODULES: "modules",
  DEPARTMENT_MODULES: "department-modules",
  ROLES: "roles",
  ROLE_PERMISSIONS: "role-permissions",
  CURRENCIES: "currencies",
  SELLERS: "sellers",

  // Dashboard
  DASHBOARD: {
    METRICS: "dashboard-metrics",
    ACTIVITIES: "dashboard-activities",
    OVERVIEW: "dashboard-overview",
  },

  // Budgets
  BUDGETS: {
    ALL: "budgets-all",
    BY_ID: "budget-by-id",
    BY_USER: "budgets-by-user",
    STATS: "budgets-stats",
    OVERVIEW: "budget-overview",
  },

  // Tasks
  TASKS: {
    ALL: "tasks-all",
    BY_USER: "tasks-by-user",
    BY_STATUS: "tasks-by-status",
    STATS: "tasks-stats",
  },

  // Requisitions
  REQUISITIONS: {
    ALL: "requisitions-all",
    BY_ID: "requisition-by-id",
    BY_USER: "requisitions-by-user",
    STATS: "requisitions-stats",
    DASHBOARD: "requisitions-dashboard",
  },

  // Purchase Orders
  PURCHASE_ORDERS: {
    ALL: "purchase-orders-all",
    BY_ID: "purchase-order-by-id",
    BY_USER: "purchase-orders-by-user",
    STATS: "purchase-orders-stats",
  },

  // Categories
  CATEGORIES: {
    ALL: "categories-all",
    BY_ID: "category-by-id",
    ACTIVE: "categories-active",
  },

  // Payment Vouchers
  PAYMENT_VOUCHERS: {
    ALL: "payment-vouchers-all",
    BY_ID: "payment-voucher-by-id",
    BY_USER: "payment-vouchers-by-user",
    STATS: "payment-vouchers-stats",
  },

  // GRN
  GRN: {
    ALL: "grn-all",
    BY_ID: "grn-by-id",
    BY_USER: "grn-by-user",
    STATS: "grn-stats",
  },

  // Vendors
  VENDORS: {
    ALL: "vendors-all",
    BY_ID: "vendor-by-id",
  },

  // Approval Tasks (Backend-powered)
  APPROVALS: {
    ALL: "approvals-all",
    BY_ID: "approvals-by-id",
    PENDING: "approvals-pending",
    PENDING_COUNT: "approvals-pending-count",
    HISTORY: "approval-history",
  },

  // Approvals & Workflows
  WORKFLOWS: {
    ALL: "workflows-all",
    DETAIL: "workflow-detail",
    DEFAULT: "workflow-default",
    USAGE: "workflow-usage",
  },
  WORKFLOW_INSTANCES: "workflow-instances",
  WORKFLOW_APPROVALS: "workflow-approvals",
  WORKFLOW_HISTORY: "workflow-history",
  APPROVALS_PENDING: "approvals-pending",

  // Notifications
  NOTIFICATIONS: {
    ALL: "notifications-all",
    UNREAD: "notifications-unread",
    UNREAD_COUNT: "notifications-unread-count",
    PREFERENCES: "notification-preferences",
  },

  // Search
  SEARCH: "search",
  SEARCH_RESULTS: "search-results",

  // Reports & Analytics
  REPORTS: {
    SYSTEM_STATS: "reports-system-stats",
    APPROVAL_METRICS: "reports-approval-metrics",
    USER_ACTIVITY: "reports-user-activity",
    ANALYTICS: "reports-analytics",
  },
  ANALYTICS: "analytics",

  // Compliance
  COMPLIANCE: {
    ALL: "compliance-all",
    BY_ID: "compliance-by-id",
    TRACKING: "compliance-tracking",
    REPORTS: "compliance-reports",
  },

  CONFIG: {
    ME: "config-me",
    SETTINGS: "settings",
    UPDATE: "config-update",
  },

  // Activity Logs
  LOGS: {
    ALL: "activity-logs-all",
    BY_USER: "activity-logs-by-user",
    BY_ACTION: "activity-logs-by-action",
  },
};

// ANIMATION_VARIANTS
export const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      // staggerChildren: 0.25,
    },
  },
  exit: { opacity: 0 },
};

export const staggerContainerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      // staggerChildren: 0.25,
    },
  },
  exit: { opacity: 0 },
};

export const staggerContainerItemVariants = {
  hidden: { opacity: 0, y: -60 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 60 },
};

export const slideDownInView = {
  hidden: {
    opacity: 0,
    y: -100,
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};
// const NRC_PASSPORT = /^(ZN[0-9]{6}|[0-9]{6}/[0-9]{2}/[1]{1})$/

// REGEX
export const MTN_NO = /^(?:\+?26|26)?0(96|76)\d{7}$/;
export const AIRTEL_NO = /^(?:\+?26|26)?0(97|77)\d{7}$/;
export const ZAMTEL_NO = /^(?:\+?26|26)?0(95|75)\d{7}$/;

export const PASSWORD_PATTERN =
  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export const TRANSACTION_STATUS_COLOR_MAP = {
  submitted: "from-primary/10 to-primary-700/10 text-primary-700",
  processing: "from-primary to-primary-700 text-white",
  partial_payment: "from-primary/10 to-primary-700/10 text-primary-700",

  pending: "from-secondary/10 to-orange-600/10 text-orange-700",
  review: "from-secondary/10 to-orange-600/10 text-orange-700",
  ready: "from-secondary to-orange-600 text-white",

  failed: "from-red-500/10 to-red-600/10 text-red-700",
  canceled: "from-red-500/10 to-red-600/10 text-red-700",
  rejected: "from-red-500/10 to-red-600/10 text-red-700",

  // LIGHT GREEN WITH OPACITY
  succeeded: "from-[#58FF5F]/10 to-green-500/10 text-green-700",
  successful: "from-[#58FF5F]/10 to-green-500/10 text-green-700",
  approved: "from-[#58FF5F]/10 to-green-500/10 text-green-700",

  // SOLID GREEN
  processed: "from-[#23C760] to-[#23C760] text-white",
  paid: "from-[#23C760] to-[#23C760] text-white",
  prefunded: "from-[#23C760] to-[#23C760] text-white",
};

export const SERVICE_PROVIDER_COLOR_MAP = {
  airtel: "bg-red-500 text-white  ",
  mtn: "bg-yellow-400 text-black",
  zamtel: "bg-green-600 text-white",
  bank: "bg-primary text-white",
};
