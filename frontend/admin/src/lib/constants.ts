export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const ADMIN_SESSION = "__com.tether-erp-admin.com__";
export const ADMIN_USER_SESSION = "__com.tether-erp-admin-user__";
export const ADMIN_PERMISSIONS_SESSION = "__com.tether-erp-admin-pem__";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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

// Admin role — only super_admin is permitted to access the admin console
export const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];
