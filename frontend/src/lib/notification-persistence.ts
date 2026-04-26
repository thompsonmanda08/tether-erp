/**
 * Notification Persistence Layer
 *
 * Handles storage, retrieval, and querying of notifications.
 * Uses in-memory Maps for MVP (ready for database migration to PostgreSQL/MongoDB).
 */

import { ActivityNotification as Notification } from '@/types/activity';

// Define missing types for backward compatibility
interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

type NotificationType = 'approval_required' | 'approved' | 'rejected' | 'assigned';
import { v4 as uuid } from 'uuid';

/**
 * In-memory storage for notifications
 * Key: notificationId, Value: Notification
 */
const notificationStore = new Map<string, Notification>();

/**
 * In-memory storage for user notification preferences
 * Key: userId, Value: NotificationPreferences
 */
const preferencesStore = new Map<string, NotificationPreferences>();

/**
 * Default notification preferences for new users
 */
function getDefaultPreferences(userId: string): any {
  return {
    userId,
    emailNotifications: false,
    pushNotifications: true,
    inAppNotifications: true,
    notifyOn: {
      taskAssigned: true,
      taskReassigned: true,
      taskApproved: true,
      taskRejected: true,
      workflowComplete: true,
      approvalOverdue: true,
      commentsAdded: false,
    },
    groupNotifications: false,
    quietHours: {
      enabled: false,
      startHour: 22,
      endHour: 8,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create a new notification
 * @param notification Partial notification object (id will be generated)
 * @returns Created notification
 */
export async function createNotification(
  notification: Omit<Notification, 'id'>
): Promise<Notification> {
  const id = uuid();
  const fullNotification: Notification = {
    id,
    ...notification,
  };

  notificationStore.set(id, fullNotification);
  return fullNotification;
}

/**
 * Get all notifications for a user
 * @param userId User ID
 * @param page Page number (1-based)
 * @param pageSize Items per page
 * @param filters Optional filters
 * @returns Array of notifications and metadata
 */
export async function getUserNotifications(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    type?: NotificationType;
    isRead?: boolean;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}> {
  // Filter notifications for this user
  let userNotifications = Array.from(notificationStore.values()).filter(
    (n) => n.recipientId === userId || (n as any).userId === userId
  );

  // Apply optional filters
  if (filters) {
    if (filters.type) {
      userNotifications = userNotifications.filter((n) => n.type === filters.type);
    }
    if (filters.isRead !== undefined) {
      userNotifications = userNotifications.filter((n) => (n as any).isRead === filters.isRead);
    }
    if (filters.startDate) {
      userNotifications = userNotifications.filter((n) => n.createdAt >= filters.startDate!);
    }
    if (filters.endDate) {
      userNotifications = userNotifications.filter((n) => n.createdAt <= filters.endDate!);
    }
  }

  // Sort by creation date (newest first)
  userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Paginate
  const total = userNotifications.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

  return {
    notifications: paginatedNotifications,
    total,
    page,
    pageSize,
    hasMore: endIndex < total,
  };
}

/**
 * Get notification preferences for a user
 * @param userId User ID
 * @returns Preferences (defaults if not set)
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  return preferencesStore.get(userId) || getDefaultPreferences(userId);
}

/**
 * Save notification preferences for a user
 * @param userId User ID
 * @param preferences Preferences to save
 * @returns Saved preferences
 */
export async function saveNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const existing = preferencesStore.get(userId) || getDefaultPreferences(userId);

  const updated: NotificationPreferences = {
    ...existing,
    ...preferences,
    userId, // Ensure userId is correct
    updatedAt: new Date(),
  };

  preferencesStore.set(userId, updated);
  return updated;
}

/**
 * Get recent notifications for a user (last N)
 * @param userId User ID
 * @param limit Number of notifications to return
 * @returns Array of recent notifications
 */
export async function getRecentNotifications(
  userId: string,
  limit: number = 10
): Promise<Notification[]> {
  const userNotifications = Array.from(notificationStore.values())
    .filter((n) => n.recipientId === userId || (n as any).userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  return userNotifications;
}

