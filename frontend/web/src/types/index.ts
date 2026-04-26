/**
 * Centralized Type Exports
 * Re-exports all types from individual modules for easy importing
 */

// ============================================================================
// CORE TYPES (Single source of truth)
// ============================================================================

export * from "./core";

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export * from "./requisition";
export * from "./purchase-order";
export * from "./budget";
export * from "./payment-voucher";
export * from "./goods-received-note";

// ============================================================================
// WORKFLOW TYPES (excluding duplicates now in core)
// ============================================================================

export type {
  WorkflowDocumentType,
  WorkflowPermission,
  WorkflowDocument,
  DocumentApprovalConfig,
  ApprovalStageConfig,
  ApprovalState,
  WorkflowStep,
  Approver,
  ApprovalAction,
  ApprovalLogEntry,
  Attachment,
  RequisitionForm,
} from "./workflow";

// ============================================================================
// ACTIVITY TYPES (renamed to avoid conflicts with notifications)
// ============================================================================

export type {
  ActivityLog,
  ActivityLogsData,
  ActivityLogsFilters,
  AuditLog,
  ActivityAction,
  ExecutionStatus,
  ActivityNotificationType,
  ActivityNotification,
  GetNotificationsRequest as ActivityGetNotificationsRequest,
  MarkNotificationReadRequest as ActivityMarkNotificationReadRequest,
  DeleteNotificationRequest as ActivityDeleteNotificationRequest,
  GetUnreadCountRequest as ActivityGetUnreadCountRequest,
  NotificationPreferences as ActivityNotificationPreferences,
  GetNotificationsResponse as ActivityGetNotificationsResponse,
  CreateNotificationRequest as ActivityCreateNotificationRequest,
  MarkAllNotificationsReadRequest as ActivityMarkAllNotificationsReadRequest,
  GetNotificationPreferencesRequest as ActivityGetNotificationPreferencesRequest,
  UpdateNotificationPreferencesRequest as ActivityUpdateNotificationPreferencesRequest,
} from "./activity";

// ============================================================================
// NOTIFICATION TYPES (avoiding conflicts with activity)
// ============================================================================

export type {
  NotificationType as NotificationTypeEnum,
  QuickActionType,
  NotificationImportance,
  QuickAction,
  Notification as NotificationInterface,
  NotificationPreferences as NotificationPrefs,
  GetNotificationsRequest as GetNotificationsReq,
  GetNotificationsResponse as GetNotificationsRes,
  CreateNotificationRequest as CreateNotificationReq,
  CreateNotificationResponse,
  MarkNotificationReadRequest as MarkNotificationReadReq,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadRequest as MarkAllNotificationsReadReq,
  MarkAllNotificationsReadResponse,
  DeleteNotificationRequest as DeleteNotificationReq,
  DeleteNotificationResponse,
  GetUnreadCountRequest as GetUnreadCountReq,
  GetUnreadCountResponse,
  GetNotificationPreferencesRequest as GetNotificationPreferencesReq,
  GetNotificationPreferencesResponse,
  UpdateNotificationPreferencesRequest as UpdateNotificationPreferencesReq,
  UpdateNotificationPreferencesResponse,
  TaskAssignedEvent,
  TaskReassignedEvent,
  TaskApprovedEvent,
  TaskRejectedEvent,
  WorkflowCompleteEvent,
} from "./notifications";

// ============================================================================
// TASK TYPES (avoiding conflicts with core)
// ============================================================================

export type {
  TaskType,
  TaskPriority,
  TaskStatus,
  Task,
  TaskFilters,
  TaskStats,
  TaskWithDocument,
  ApprovalTask as TaskApprovalTask,
  ApprovalTaskDetail as TaskApprovalTaskDetail,
} from "./tasks";

// ============================================================================
// AUTH TYPES (excluding duplicates now in core)
// ============================================================================

export type {
  AuthSession,
  SessionResponse,
  RegistrationResponse,
} from "./auth";

// ============================================================================
// USER TYPES (excluding duplicates now in core)
// ============================================================================

export type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  VerifyTokenResponse,
  TokenResponse,
  PasswordResetRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  VerifyTokenRequest,
} from "./user";

// ============================================================================
// COMMON TYPES (excluding duplicates now in core)
// ============================================================================

export type {
  Pagination,
  PaginationLegacy,
  OfflineOperationType,
  OfflineEntityType,
  OfflineMutationResult,
  DashboardMetrics,
} from "./common";

// ============================================================================
// API TYPES (excluding duplicates now in core)
// ============================================================================

export type { ApprovalTaskDetail } from "./api";

// ============================================================================
// VENDOR TYPES
// ============================================================================

export type {
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorFilters,
} from "./vendor";

// ============================================================================
// OTHER SPECIALIZED TYPES (selective exports to avoid conflicts)
// ============================================================================

// Department types
export type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "./department";

// Settings types (avoiding conflicts)
export type {
  Currency as SettingsCurrency,
  SignupSettings,
  SettingsData,
} from "./settings";

// Forms types
export * from "./forms";

// Dashboard types
export * from "./dashboard";

// Compliance types
export * from "./compliance";

// Currency types
export * from "./currencies";

// Event hosts types

// PDF types
export * from "./pdf";

// Premium config types
export type { PremiumConfig } from "./premium-config";

// Premium types
export * from "./premium";

// Session types
export * from "./session";

// User management types
export * from "./user-management";

// WhatsApp types
export * from "./whatsapp";

// Workflow config types (avoiding conflicts with core)
export type {
  WorkflowStage as ConfigWorkflowStage,
  WorkflowFormData,
  Workflow,
  WorkflowListFilter,
  WorkflowAssignment as ConfigWorkflowAssignment,
  StageExecution as ConfigStageExecution,
  StageAssignment as ConfigStageAssignment,
  ApproveStageRequest as ConfigApproveStageRequest,
  RejectStageRequest as ConfigRejectStageRequest,
  ReassignStageRequest as ConfigReassignStageRequest,
  WorkflowValidationError as ConfigWorkflowValidationError,
  WorkflowValidationResult,
} from "./workflow-config";

// Custom workflow types (avoiding conflicts)
export type {
  CustomWorkflow,
  WorkflowEntityType,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  AssignWorkflowRequest,
  WorkflowDefault,
  WorkflowStats,
  ReverseStageRequest,
} from "./custom-workflow";

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// Import document types for legacy aliases
import type { Requisition } from "./requisition";
import type { PurchaseOrder } from "./purchase-order";
import type { PaymentVoucher } from "./payment-voucher";
import type { Budget } from "./budget";
import type { GoodsReceivedNote } from "./goods-received-note";
import type { ChangePasswordRequest } from "./user";
import type { WorkflowStep } from "./workflow";
import type { ActionHistoryEntry, ApprovalRecord } from "./core";

// Keep these for any existing code that might reference them
export type RequisitionType = Requisition;
export type PurchaseOrderType = PurchaseOrder;
export type PaymentVoucherType = PaymentVoucher;
export type BudgetType = Budget;
export type GRNType = GoodsReceivedNote;

// Add missing type aliases
export type ApprovalHistory = ApprovalRecord[]; // Use proper ApprovalRecord type
export type ChangePassword = ChangePasswordRequest; // Legacy alias
export type ErrorState = {
  message: string;
  field?: string;
  status?: boolean;
  onConfirmPassword?: boolean;
}; // Common error type
export type WorkflowStage = WorkflowStep; // Legacy alias
export type PVActionHistoryEntry = ActionHistoryEntry; // Legacy type alias
export type POActionHistoryEntry = ActionHistoryEntry; // Legacy type alias
export type PVApprovalRecord = ApprovalRecord; // Legacy type alias
export type POApprovalRecord = ApprovalRecord; // Legacy type alias
