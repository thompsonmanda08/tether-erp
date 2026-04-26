"use client";

import { useState, useMemo } from "react";
import { useGetUsers } from "@/hooks/use-users-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { SearchSelectField } from "@/components/ui/search-select-field";
import { capitalize } from "@/lib/utils";

// Define WorkflowTask interface locally
interface WorkflowTask {
  id: string;
  status: string;
  claimedBy?: string;
  assignedRole?: string;
  assignedUserId?: string;
  stageName?: string;
  claimExpiry?: string;
  entityType?: string;
  entityId?: string;
  documentType?: string;
  documentId?: string;
}

export interface ReassignmentModalProps {
  task: WorkflowTask;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReassign: (userId: string, reason: string) => Promise<void>;
}

export function ReassignmentModal({
  task,
  isOpen,
  onOpenChange,
  onReassign,
}: ReassignmentModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: usersData } = useGetUsers();

  // Filter users - exclude current approver and get available users
  const availableUsers = useMemo(() => {
    if (!usersData) return [];
    return usersData.filter(
      (u: any) => u.id !== task.assignedUserId && u.id !== task.claimedBy
    );
  }, [usersData, task.assignedUserId, task.claimedBy]);

  // Transform users for SearchSelectField
  const userOptions = useMemo(() => {
    return availableUsers.map((user: any) => ({
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    }));
  }, [availableUsers]);

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);

  const handleReassign = async () => {
    if (!selectedUserId) {
      setError("Please select a user to reassign to");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for reassignment");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onReassign(selectedUserId, reason);
      // Reset form
      setSelectedUserId("");
      setReason("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Approval Task</DialogTitle>
          <DialogDescription>
            Transfer this task to another user. The current assignee will be
            notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Task Info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground font-medium">
                  Entity:
                </span>
                <p className="font-mono">
                  {capitalize(
                    task?.entityType || task?.documentType || "Document"
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">
                  Stage:
                </span>
                <p>{capitalize(task.stageName || "Unknown")}</p>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* User Selection with SearchSelectField */}
          <div className="space-y-2">
            <SearchSelectField
              label="Select New Approver"
              placeholder="Search by name or email..."
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              options={userOptions}
              isDisabled={isLoading}
              onModal={true}
              classNames={{
                wrapper: "w-full max-w-full",
              }}
            />
          </div>

          {/* Selected User Details */}
          {selectedUser && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback>
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{selectedUser.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              {selectedUser.role && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{selectedUser.role}</Badge>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <Textarea
            id="reason"
            label="Reason for Reassignment"
            placeholder="Explain why you're reassigning this task..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            className="min-h-24 resize-none"
            maxLength={500}
            showLimit
          />

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              The new approver will be notified immediately. The reason will be
              visible in the approval history.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={isLoading || !selectedUserId || !reason.trim()}
            isLoading={isLoading}
            loadingText="Reassigning..."
          >
            Confirm Reassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
