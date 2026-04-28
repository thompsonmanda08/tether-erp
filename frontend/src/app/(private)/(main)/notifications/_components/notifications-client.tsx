"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  ExternalLink,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/base/page-header";
import {
  useNotifications,
  useNotificationStats,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  getNotificationIcon,
  getNotificationColor,
  formatNotificationTime,
  getDocumentUrl,
  type Notification,
} from "@/hooks/use-notifications";
import { toast } from "sonner";

export function NotificationsClient() {
  const router = useRouter();
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [filterImportance, setFilterImportance] = useState<string>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Queries and mutations
  const { data: statsResponse } = useNotificationStats();
  const {
    data: notificationsResponse,
    isLoading,
    error,
  } = useNotifications({
    page: currentPage,
    limit: 20,
    type: filterType !== "all" ? filterType : undefined,
    unreadOnly: showUnreadOnly,
  });

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const stats = statsResponse?.data;
  const notifications = notificationsResponse?.data || [];
  // TODO: Backend should return PaginatedResponse<Notification[]> with pagination info
  const pagination = {
    page: 1,
    limit: 20,
    total: notifications.length,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  // Filter notifications by search query and importance
  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      searchQuery === "" ||
      notification.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.entityNumber
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesImportance =
      filterImportance === "all" ||
      notification.importance === filterImportance;

    return matchesSearch && matchesImportance;
  });

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map((n) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  const handleSelectNotification = (
    notificationId: string,
    checked: boolean
  ) => {
    if (checked) {
      setSelectedNotifications((prev) => [...prev, notificationId]);
    } else {
      setSelectedNotifications((prev) =>
        prev.filter((id) => id !== notificationId)
      );
    }
  };

  const handleMarkSelectedAsRead = () => {
    if (selectedNotifications.length === 0) {
      toast.error("No notifications selected");
      return;
    }

    markAsReadMutation.mutate(selectedNotifications, {
      onSuccess: () => {
        setSelectedNotifications([]);
      },
    });
  };

  const handleDeleteSelected = () => {
    if (selectedNotifications.length === 0) {
      toast.error("No notifications selected");
      return;
    }

    // Delete notifications one by one (could be optimized with bulk delete API)
    selectedNotifications.forEach((id) => {
      deleteNotificationMutation.mutate(id);
    });

    setSelectedNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id]);
    }

    // Navigate to document
    const url = getDocumentUrl(
      notification.documentType,
      notification.documentId
    );
    router.push(url);
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case "approval_required":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "document_approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "document_rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "assignment":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "status_change":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            Error Loading Notifications
          </h3>
          <p className="text-gray-600 mb-6">
            Failed to load notifications. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Notifications"
        subtitle={`${stats?.total || 0} total notifications • ${stats?.pending || 0} unread`}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unread</p>
              <p className="text-2xl font-bold">{stats?.pending || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Read</p>
              <p className="text-2xl font-bold">{stats?.read || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="approval_required">
                  Approval Required
                </SelectItem>
                <SelectItem value="document_approved">Approved</SelectItem>
                <SelectItem value="document_rejected">Rejected</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterImportance}
              onValueChange={setFilterImportance}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Importance</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="unread-only"
                checked={showUnreadOnly}
                onCheckedChange={(state) => setShowUnreadOnly(state as any)}
              />
              <label htmlFor="unread-only" className="text-sm font-medium">
                Unread only
              </label>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedNotifications.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkSelectedAsRead}
              disabled={markAsReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleteNotificationMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}

        {/* Global Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={
              markAllAsReadMutation.isPending || (stats?.pending || 0) === 0
            }
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        </div>
      </Card>

      {/* Notifications List */}
      <Card className="divide-y">
        {/* Select All Header */}
        {filteredNotifications.length > 0 && (
          <div className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={
                  selectedNotifications.length === filteredNotifications.length
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                Select all ({filteredNotifications.length})
              </span>
            </div>
          </div>
        )}

        {/* Notifications */}
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold text-lg mb-2">
              No notifications found
            </h3>
            <p className="text-muted-foreground">
              {searchQuery ||
              filterType !== "all" ||
              filterImportance !== "all" ||
              showUnreadOnly
                ? "Try adjusting your filters"
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              isSelected={selectedNotifications.includes(notification.id)}
              onSelect={(checked) =>
                handleSelectNotification(notification.id, checked)
              }
              onClick={() => handleNotificationClick(notification)}
              onMarkAsRead={() => markAsReadMutation.mutate([notification.id])}
              onDelete={() =>
                deleteNotificationMutation.mutate(notification.id)
              }
            />
          ))
        )}
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} notifications
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(pagination.totalPages, prev + 1)
                )
              }
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationRowProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

function NotificationRow({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkAsRead,
  onDelete,
}: NotificationRowProps) {
  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case "approval_required":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "document_approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "document_rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "assignment":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "status_change":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div
      className={`p-4 hover:bg-muted/50 transition-colors ${
        !notification.isRead ? "bg-blue-50/50 border-l-4 border-l-blue-500" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mt-1"
        />

        {/* Icon */}
        <div className="flex-shrink-0 mt-1">
          {getNotificationTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
              <div className="flex items-center gap-2 mb-1">
                <h4
                  className={`text-sm font-medium ${!notification.isRead ? "font-semibold" : ""}`}
                >
                  {notification.subject}
                </h4>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {notification.body}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {notification.entityNumber && (
                  <Badge variant="outline" className="text-xs">
                    {notification.entityNumber}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs ${getNotificationColor(notification.importance)}`}
                >
                  {notification.importance}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatNotificationTime(notification.createdAt)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e?.stopPropagation();
                    onMarkAsRead();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e?.stopPropagation();
                  onClick();
                }}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e?.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
