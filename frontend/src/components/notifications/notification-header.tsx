"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import {
  useRecentNotifications,
  useNotificationStats,
  useMarkAsRead,
  useMarkAllAsRead,
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
  getDocumentUrl,
  type Notification,
} from "@/hooks/use-notifications";

export function NotificationHeader() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { data: statsResponse } = useNotificationStats();
  const { data: notificationsResponse, isLoading } = useRecentNotifications();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const stats = statsResponse?.data;
  const notifications = notificationsResponse?.data || [];
  const unreadCount = stats?.pending || 0;

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate([notificationId]);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id]);
    }

    // Navigate to document
    const url = getDocumentUrl(
      notification.documentType,
      notification.documentId,
    );
    router.push(url);
    setIsOpen(false);
  };

  const handleViewAllNotifications = () => {
    router.push("/notifications");
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="h-8 px-2 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAllNotifications}
              className="h-8 px-2 text-xs"
            >
              View all
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={handleViewAllNotifications}
              >
                View all notifications
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) {
  const handleMarkAsRead = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onMarkAsRead(notification.id);
  };

  return (
    <div
      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
        !notification.isRead ? "bg-blue-600/10 dark:bg-blue-50/50" : ""
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <span className="text-lg">
            {getNotificationIcon(notification.type)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">
                {notification.subject}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {notification.body}
              </p>

              {/* Document info */}
              {notification.entityNumber && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {notification.entityNumber}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getNotificationColor(notification.importance)}`}
                  >
                    {notification.importance}
                  </Badge>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatNotificationTime(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-6 w-6 p-0 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-100 dark:hover:text-blue-800"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Unread indicator */}
          {!notification.isRead && (
            <div className="w-2 h-2 bg-blue-500 rounded-full absolute left-1 top-4" />
          )}
        </div>
      </div>
    </div>
  );
}
