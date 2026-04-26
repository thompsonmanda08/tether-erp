// Subscription components removed - internal app only

// Core (Starter tier)
export const FEATURES = {
  DOCUMENT_MANAGEMENT: "document_management",
  BASIC_WORKFLOWS: "basic_workflows",
  IN_APP_NOTIFICATIONS: "in_app_notifications",
  STANDARD_REPORTS: "standard_reports",
  USER_MANAGEMENT: "user_management",
  DEPARTMENT_MANAGEMENT: "department_management",
  VENDOR_MANAGEMENT: "vendor_management",
  BUDGET_TRACKING: "budget_tracking",
  MOBILE_WEB_ACCESS: "mobile_web_access",
  EMAIL_SUPPORT: "email_support",

  // Pro tier
  ADVANCED_WORKFLOWS: "advanced_workflows",
  EMAIL_NOTIFICATIONS: "email_notifications",
  DATA_EXPORT: "data_export",
  AUDIT_LOGS_90_DAYS: "audit_logs_90_days",
  MULTI_CURRENCY: "multi_currency",
  ADVANCED_REPORTING: "advanced_reporting",
  WORKFLOW_TEMPLATES: "workflow_templates",
  WEBHOOKS: "webhooks",
  CUSTOM_FIELDS: "custom_fields",
  BULK_OPERATIONS: "bulk_operations",
  CUSTOM_ROLES: "custom_roles",
  ADVANCED_ANALYTICS: "advanced_analytics",
  DEDICATED_SUPPORT_MANAGER: "dedicated_support_manager",

  // Custom/Enterprise tier
  AUDIT_LOGS_UNLIMITED: "audit_logs_unlimited",
  CUSTOM_DEVELOPMENT: "custom_development",
  PROFESSIONAL_SERVICES: "professional_services",
  DEDICATED_SUPPORT: "dedicated_support",
  CUSTOM_TRAINING: "custom_training",
  WHITE_LABELING: "white_labeling",
  ON_PREMISE_DEPLOYMENT: "on_premise_deployment",
  ADVANCED_COMPLIANCE: "advanced_compliance",
  ADVANCED_SECURITY: "advanced_security",
} as const;

export type FeatureName = (typeof FEATURES)[keyof typeof FEATURES];
