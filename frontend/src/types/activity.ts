/**
 * Activity and Audit Types
 * Types for logging, activity tracking, and audit trails
 */

// ================== USER ACTIVITY LOG TYPES (new system) ==================

export interface UserActivityLog {
  id: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  source?: "activity" | "admin_audit";
}

export interface PaginationMetadata {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UserActivityResponse {
  activities: UserActivityLog[];
  pagination: PaginationMetadata;
}

export interface ActivityStatistics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByDay: Record<string, number>;
  mostCommonAction: string;
  lastActivityTime?: string;
  averagePerDay: number;
}

export interface AdminActivityResponse {
  activities: UserActivityLog[];
  statistics?: ActivityStatistics;
  pagination: PaginationMetadata;
}

export interface UserActivityFilters {
  page?: number;
  limit?: number;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ================== ACTIVITY LOG TYPES (legacy) ==================

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  status: string;
  ipAddress?: string;
}

export interface ActivityLogsData {
  logs: ActivityLog[];
  totalCount: number;
}

export interface ActivityLogsFilters {
  searchTerm?: string;
  action?: string;
  entity?: string;
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ================== AUDIT LOG TYPES ==================

export interface AuditLog {
  id: string;
  documentId: string;
  documentType: string;
  userId: string;
  action: string; // create, update, approve, reject
  changes: Record<string, any>;
  createdAt: Date;
}

// ================== ACTIVITY ACTION TYPES ==================

export type ActivityAction =
  | "created"
  | "approved"
  | "rejected"
  | "updated"
  | "deleted"
  | "submitted"
  | "reassigned";

export type ExecutionStatus = "success" | "failed" | "pending";

// ================== ACTIVITY NOTIFICATION TYPES ==================

export type ActivityNotificationType = 
  | 'approval_required' 
  | 'approved' 
  | 'rejected' 
  | 'assigned'
  | 'reassigned'
  | 'workflow_complete'
  | 'approval_overdue'
  | 'comment_added';

export interface ActivityNotification {
  id: string;
  organizationId: string;
  recipientId: string;
  type: string; // approval_required, approved, rejected, assigned
  documentId: string;
  documentType: string;
  subject: string;
  body: string;
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Extended fields for UI compatibility (should be added to backend)
  userId?: string;           // Maps to recipientId for backward compatibility
  entityId?: string;         // Maps to documentId for backward compatibility
  entityType?: string;       // Maps to documentType for backward compatibility
  entityNumber?: string;     // Document reference number
  relatedUserId?: string;    // User who triggered the notification
  relatedUserName?: string;  // Name of the user who triggered the notification
  isRead?: boolean;          // Read status
  readAt?: Date;            // When notification was read
  actionTaken?: boolean;     // Whether action was taken
  actionTakenAt?: Date;     // When action was taken
  importance?: string;       // Notification importance (HIGH, MEDIUM, LOW)
  quickAction?: {           // Quick action configuration
    type: string;
    label: string;
    params?: Record<string, any>;
  };
  reassignmentReason?: string; // Reason for reassignment (if applicable)
  
  // Add missing properties for compatibility with notifications.ts
  title?: string;            // Maps to subject
  message?: string;          // Maps to body
}

// ================== NOTIFICATION REQUEST TYPES ==================

export interface GetNotificationsRequest {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: ActivityNotificationType;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
}

export interface DeleteNotificationRequest {
  notificationId: string;
}

export interface GetUnreadCountRequest {
  userId?: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  types: ActivityNotificationType[];
}

export interface GetNotificationsResponse {
  notifications: ActivityNotification[];
  totalCount: number;
  unreadCount: number;
  hasMore?: boolean;           // Whether there are more notifications to load
}

export interface CreateNotificationRequest {
  recipientId: string;
  type: ActivityNotificationType;
  documentId: string;
  documentType: string;
  subject: string;
  body: string;
}

export interface MarkAllNotificationsReadRequest {
  userId: string;
}

export interface GetNotificationPreferencesRequest {
  userId: string;
}

export interface UpdateNotificationPreferencesRequest {
  userId: string;
  preferences: NotificationPreferences;
}