"use client";

import { NotificationInterface as Notification, NotificationTypeEnum as NotificationType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Repeat2,
  Zap,
} from "lucide-react";

const notificationTypeLabels: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Task Assigned",
  TASK_REASSIGNED: "Task Reassigned",
  TASK_APPROVED: "Task Approved",
  TASK_REJECTED: "Task Rejected",
  WORKFLOW_COMPLETE: "Workflow Complete",
  APPROVAL_OVERDUE: "Approval Overdue",
  COMMENT_ADDED: "Comment Added",
};

const notificationTypeColors: Record<NotificationType, string> = {
  TASK_ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  TASK_REASSIGNED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  TASK_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  TASK_REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  WORKFLOW_COMPLETE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  APPROVAL_OVERDUE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  COMMENT_ADDED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

const notificationTypeIcons: Record<NotificationType, React.ReactNode> = {
  TASK_ASSIGNED: <Zap className="h-4 w-4" />,
  TASK_REASSIGNED: <Repeat2 className="h-4 w-4" />,
  TASK_APPROVED: <CheckCircle2 className="h-4 w-4" />,
  TASK_REJECTED: <AlertCircle className="h-4 w-4" />,
  WORKFLOW_COMPLETE: <Clock className="h-4 w-4" />,
  APPROVAL_OVERDUE: <AlertCircle className="h-4 w-4" />,
  COMMENT_ADDED: <MessageSquare className="h-4 w-4" />,
};

export interface NotificationItemProps {
  notification: Notification;
  variant?: "compact" | "full";
  onDelete?: (notificationId: string) => void;
  onMarkAsRead?: (notificationId: string) => void;
  isDeleting?: boolean;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export function NotificationItem({
  notification,
  variant = "full",
  onDelete,
  onMarkAsRead,
  isDeleting = false,
  showCheckbox = false,
  isSelected = false,
  onSelectionChange,
}: NotificationItemProps) {
  const isCompact = variant === "compact";

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(notification.id);
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.isRead) {
      onMarkAsRead?.(notification.id);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectionChange?.(e.target.checked);
  };

  if (isCompact) {
    return (
      <div
        onClick={handleMarkAsRead}
        className={`group flex cursor-pointer gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted ${
          !notification.isRead ? "border-primary/50 bg-primary/5" : ""
        }`}
      >
        <div className="mt-1 flex-shrink-0 text-muted-foreground">
          {notificationTypeIcons[notification.type]}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium leading-tight">
            {notification.title}
          </h4>
          <p className="truncate text-xs text-muted-foreground">
            {notification.message}
          </p>
          {notification.entityNumber && (
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                {notification.entityType} #{notification.entityNumber}
              </Badge>
            </div>
          )}
        </div>
        {!notification.isRead && (
          <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex gap-4 rounded-lg border px-4 py-3 ${
        !notification.isRead ? "border-primary/50 bg-primary/5" : ""
      }`}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="mt-1"
        />
      )}

      <div className="flex-shrink-0 text-muted-foreground mt-1">
        {notificationTypeIcons[notification.type]}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">{notification.title}</h3>
            <p className="text-sm text-muted-foreground">
              {notification.message}
            </p>
          </div>
          {!notification.isRead && (
            <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground mb-2">
          <Badge
            variant="outline"
            className={notificationTypeColors[notification.type]}
          >
            {notificationTypeLabels[notification.type]}
          </Badge>
          {notification.entityNumber && (
            <Badge variant="secondary">
              {notification.entityType} #{notification.entityNumber}
            </Badge>
          )}
          <span>
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {notification.rejectionReason && (
          <div className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <strong>Reason:</strong> {notification.rejectionReason}
          </div>
        )}

        {notification.reassignmentReason && (
          <div className="mb-2 rounded bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <strong>Reassignment:</strong> {notification.reassignmentReason}
          </div>
        )}
      </div>

      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-shrink-0"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
