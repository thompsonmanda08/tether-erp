// API Response type
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  status?: number;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  status: "active" | "suspended" | "pending";
  user_count: number;
  trial_status: "trial" | "subscribed" | "expired";
  trial_start_date?: string;
  trial_end_date?: string;
  days_remaining?: number;
  settings?: {
    max_users?: number;
    custom_branding?: boolean;
  };
}

// User types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin";
  permissions: string[];
  created_at: string;
  last_login?: string;
}

// Dashboard types
export interface DashboardMetrics {
  total_organizations: number;
  active_organizations: number;
  trial_organizations: number;
  expiring_trials: number;
  total_users: number;
  active_users: number;
  recent_organizations: Array<{
    id: string;
    name: string;
    created_at: string;
    status: string;
  }>;
}

// Trial management types (kept for backward compatibility but not actively used)
export interface TrialStatus {
  organization_id: string;
  trial_start_date: string;
  trial_end_date: string;
  days_remaining: number;
  status: "active" | "expired" | "extended";
}
