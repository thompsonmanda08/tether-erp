/**
 * Notification System Type Definitions
 *
 * This file defines all types related to the notification system for workflow tasks.
 * Notifications are triggered by workflow events (task assignment, approval, rejection, etc.)
 * and displayed to users in the top app bar with quick action capabilities.
 */

import { WorkflowEntityType } from './custom-workflow';

/**
 * Notification type categories - aligned with activity.ts
 */
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED'
  | 'WORKFLOW_COMPLETE'
  | 'APPROVAL_OVERDUE'
  | 'COMMENT_ADDED';

// Alias for backward compatibility with activity.ts
export type NotificationTypeEnum = NotificationType;

/**
 * Quick action types for notifications
 */
export type QuickActionType =
  | 'REVIEW_AND_APPROVE'
  | 'VIEW_ONLY'
  | 'REVISE_AND_RESUBMIT'
  | 'NONE';

/**
 * Notification importance levels affecting display priority
 */
export type NotificationImportance = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Quick action configuration attached to notifications
 * Determines what happens when user clicks the action button
 */
export interface QuickAction {
  type: QuickActionType;
  label: string;                              // Button text: "Review Now", "View", "Revise & Resubmit"
  route?: string;                             // Navigation path
  params?: Record<string, string | number>;   // URL params (entityId, etc.)
}

/**
 * Main Notification interface - aligned with activity.ts ActivityNotification
 */
export interface Notification {
  // Identity
  id: string;                                 // UUID
  userId: string;                             // Who receives this notification

  // Content
  type: NotificationType;
  title: string;                              // Short title: "New approval task"
  message: string;                            // Full message text
  icon?: string;                              // Icon name for UI

  // Context (links notification to entity)
  entityId?: string;                          // req-001, budget-002, etc.
  entityType?: WorkflowEntityType;            // REQUISITION, BUDGET, PO, etc.
  entityNumber?: string;                      // REQ-2024-001 (display number)
  relatedUserId?: string;                     // Who caused the notification (approver, reassigner, etc.)
  relatedUserName?: string;                   // Display name of related user

  // State
  isRead: boolean;                            // User has viewed this notification
  readAt?: Date;                              // When user marked as read
  actionTaken?: boolean;                      // Did user act on this notification?
  actionTakenAt?: Date;                       // When user took action

  // Quick Action
  quickAction: QuickAction;                   // What happens on action button click
  quickActionData?: Record<string, unknown>;  // Context data for action modal

  // Metadata
  createdAt: Date;
  expiresAt?: Date;                           // Auto-delete old notifications (e.g., 30 days)
  importance: NotificationImportance;         // Affects display priority and sorting

  // Additional context
  rejectionReason?: string;                   // For TASK_REJECTED notifications
  reassignmentReason?: string;                // For TASK_REASSIGNED notifications
}

// Alias for backward compatibility with activity.ts
export type NotificationInterface = Notification;

/**
 * User notification preferences
 * Controls how and when user receives notifications
 */
export interface NotificationPreferences {
  userId: string;

  // Delivery channels
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;

  // Notification types to receive
  notifyOn: {
    taskAssigned: boolean;
    taskReassigned: boolean;
    taskApproved: boolean;
    taskRejected: boolean;
    workflowComplete: boolean;
    approvalOverdue: boolean;
    commentsAdded: boolean;
  };

  // Additional preferences
  groupNotifications: boolean;                // Group multiple notifications?
  quietHours?: {                              // Don't send during these hours
    enabled: boolean;
    startHour: number;                        // 0-23
    endHour: number;                          // 0-23
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Backward compatibility with activity.ts
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  types?: NotificationType[];
}

// Alias for backward compatibility
export type NotificationPrefs = NotificationPreferences;

/**
 * Request/Response DTOs for notification operations
 */

export interface GetNotificationsRequest {
  userId: string;
  page?: number;
  limit?: number;
  filters?: {
    type?: NotificationType;
    isRead?: boolean;
    startDate?: Date;
    endDate?: Date;
  };
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string;
  entityType?: WorkflowEntityType;
  entityNumber?: string;
  relatedUserId?: string;
  relatedUserName?: string;
  quickAction: QuickAction;
  quickActionData?: Record<string, unknown>;
  importance?: NotificationImportance;
  rejectionReason?: string;
  reassignmentReason?: string;
  expiresAt?: Date;
}

export interface CreateNotificationResponse {
  notification: Notification;
  success: boolean;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
}

export interface MarkNotificationReadResponse {
  notification: Notification;
  success: boolean;
}

export interface MarkAllNotificationsReadRequest {
  userId: string;
}

export interface MarkAllNotificationsReadResponse {
  count: number;
  success: boolean;
}

export interface DeleteNotificationRequest {
  notificationId: string;
}

export interface DeleteNotificationResponse {
  success: boolean;
}

export interface GetUnreadCountRequest {
  userId: string;
}

export interface GetUnreadCountResponse {
  count: number;
  userId: string;
}

export interface GetNotificationPreferencesRequest {
  userId: string;
}

export interface GetNotificationPreferencesResponse {
  preferences: NotificationPreferences;
}

export interface UpdateNotificationPreferencesRequest {
  userId: string;
  preferences: Partial<NotificationPreferences>;
}

export interface UpdateNotificationPreferencesResponse {
  preferences: NotificationPreferences;
  success: boolean;
}

/**
 * Notification event helper types
 * Used internally to trigger notification creation
 */

export interface TaskAssignedEvent {
  entityId: string;
  entityType: WorkflowEntityType;
  entityNumber: string;
  approverId: string;
  approverName: string;
  currentStageName: string;
}

export interface TaskReassignedEvent {
  entityId: string;
  entityType: WorkflowEntityType;
  entityNumber: string;
  previousApproverId: string;
  newApproverId: string;
  reassignedBy: string;
  reassignedByName: string;
  reassignmentReason?: string;
}

export interface TaskApprovedEvent {
  entityId: string;
  entityType: WorkflowEntityType;
  entityNumber: string;
  createdById: string;
  approvedBy: string;
  approvedByName: string;
}

export interface TaskRejectedEvent {
  entityId: string;
  entityType: WorkflowEntityType;
  entityNumber: string;
  createdById: string;
  rejectedBy: string;
  rejectedByName: string;
  rejectionReason: string;
}

export interface WorkflowCompleteEvent {
  entityId: string;
  entityType: WorkflowEntityType;
  entityNumber: string;
  createdById: string;
  finalApprovedBy: string;
  finalApprovedByName: string;
}
