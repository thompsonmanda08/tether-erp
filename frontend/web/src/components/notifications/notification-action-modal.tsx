"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export interface NotificationActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionLabel: string;
  onAction: (comment?: string) => void;
  requiresComment?: boolean;
  isLoading?: boolean;
}

export function NotificationActionModal({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  onAction,
  requiresComment = false,
  isLoading = false,
}: NotificationActionModalProps) {
  const [comment, setComment] = useState("");

  const handleAction = () => {
    onAction(requiresComment ? comment : undefined);
    setComment("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {requiresComment && (
          <Textarea
            label="Comment"
            id="comment"
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            disabled={isLoading || (requiresComment && !comment.trim())}
            isLoading={isLoading}
            loadingText="Processing..."
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
