"use server";

/**
 * Notification Actions - Server Actions for Notification Management
 * Follows the established pattern using authenticatedApiClient
 */

import { APIResponse } from "@/types";
import { handleError, successResponse, badRequestResponse } from "./api-config";
import authenticatedApiClient from "./api-config";

// ============================================================================
// TYPES
// ============================================================================

export interface Notification {
  id: string;
  type: string;
  subject: string;
  body: string;
  documentId: string;
  documentType: string;
  entityId: string;
  entityType: string;
  entityNumber?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

export interface NotificationStats {
  pending: number;
  read: number;
  total: number;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  organizationId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  notifyTaskAssigned: boolean;
  notifyTaskReassigned: boolean;
  notifyTaskApproved: boolean;
  notifyTaskRejected: boolean;
  notifyWorkflowComplete: boolean;
  notifyApprovalOverdue: boolean;
  notifyCommentsAdded: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationStatsResponse {
  success: boolean;
  data: NotificationStats;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  data: {
    preferences: NotificationPreferences;
  };
}

// ============================================================================
// NOTIFICATION FETCHING
// ============================================================================

/**
 * Get notifications with pagination and filtering
 * Calls: GET /api/v1/notifications?page=...&limit=...&type=...&unread_only=...
 */
export async function getNotifications(
  params: {
    page?: number;
    limit?: number;
    type?: string;
    unreadOnly?: boolean;
  } = {},
): Promise<APIResponse<Notification[]>> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.type) searchParams.set("type", params.type);
  if (params.unreadOnly) searchParams.set("unread_only", "true");

  const url = `/api/v1/notifications?${searchParams.toString()}`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Notifications retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get recent notifications for header display
 * Calls: GET /api/v1/notifications/recent
 */
export async function getRecentNotifications(): Promise<
  APIResponse<Notification[]>
> {
  const url = `/api/v1/notifications/recent`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || [],
      "Recent notifications retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Get notification statistics
 * Calls: GET /api/v1/notifications/stats
 */
export async function getNotificationStats(): Promise<
  APIResponse<NotificationStats>
> {
  const url = `/api/v1/notifications/stats`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data || { pending: 0, read: 0, total: 0 },
      "Notification statistics retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

// ============================================================================
// NOTIFICATION ACTIONS
// ============================================================================

/**
 * Mark notifications as read
 * Calls: POST /api/v1/notifications/mark-as-read
 */
export async function markNotificationsAsRead(
  notificationIds: string[],
): Promise<APIResponse<{ markedCount: number }>> {
  if (!notificationIds?.length) {
    return badRequestResponse("Notification IDs are required");
  }

  const url = `/api/v1/notifications/mark-as-read`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
      data: { notificationIds },
    });

    return successResponse(
      response.data?.data || { markedCount: 0 },
      "Notifications marked as read successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Mark all notifications as read
 * Calls: POST /api/v1/notifications/mark-all-as-read
 */
export async function markAllNotificationsAsRead(): Promise<
  APIResponse<{ markedCount: number }>
> {
  const url = `/api/v1/notifications/mark-all-as-read`;

  try {
    const response = await authenticatedApiClient({
      method: "POST",
      url,
    });

    return successResponse(
      response.data?.data || { markedCount: 0 },
      "All notifications marked as read successfully",
    );
  } catch (error: any) {
    return handleError(error, "POST", url);
  }
}

/**
 * Delete a notification
 * Calls: DELETE /api/v1/notifications/{id}
 */
export async function deleteNotification(
  notificationId: string,
): Promise<APIResponse<{ deletedId: string }>> {
  if (!notificationId) {
    return badRequestResponse("Notification ID is required");
  }

  const url = `/api/v1/notifications/${notificationId}`;

  try {
    const response = await authenticatedApiClient({
      method: "DELETE",
      url,
    });

    return successResponse(
      response.data?.data || { deletedId: notificationId },
      "Notification deleted successfully",
    );
  } catch (error: any) {
    return handleError(error, "DELETE", url);
  }
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get notification preferences for a user
 * Calls: GET /api/v1/notifications/preferences
 */
export async function getNotificationPreferences(): Promise<
  APIResponse<NotificationPreferences>
> {
  const url = `/api/v1/notifications/preferences`;

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url,
    });

    return successResponse(
      response.data?.data,
      "Notification preferences retrieved successfully",
    );
  } catch (error: any) {
    return handleError(error, "GET", url);
  }
}

/**
 * Update notification preferences for a user
 * Calls: PUT /api/v1/notifications/preferences
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<APIResponse<NotificationPreferences>> {
  const url = `/api/v1/notifications/preferences`;

  try {
    const response = await authenticatedApiClient({
      method: "PUT",
      url,
      data: preferences,
    });

    return successResponse(
      response.data?.data,
      "Notification preferences updated successfully",
    );
  } catch (error: any) {
    return handleError(error, "PUT", url);
  }
}
