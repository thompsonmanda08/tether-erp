"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Users, AlertTriangle } from "lucide-react";
import { addMinutes } from "date-fns";

interface ClaimTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  taskDetails: {
    entityType: string;
    entityId: string;
    stageName: string;
    assignedRole: string;
  };
}

export function ClaimTaskModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  taskDetails,
}: ClaimTaskModalProps) {
  const claimDuration = 30; // 30 minutes
  const expiryTime = addMinutes(new Date(), claimDuration);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Claim Task for Review
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left space-y-3 text-muted-foreground text-sm">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {taskDetails.entityType} #{taskDetails.entityId}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Stage: {taskDetails.stageName}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Required Role: {taskDetails.assignedRole}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      Time Commitment
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You will have <strong>{claimDuration} minutes</strong> to
                      review and take action on this task.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires at: {expiryTime.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      Important Notes
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                      <li>
                        • Only you will be able to approve or reject this task
                        once claimed
                      </li>
                      <li>
                        • Other users will see that you are reviewing this task
                      </li>
                      <li>
                        • If you don't take action within {claimDuration}{" "}
                        minutes, the claim will expire
                      </li>
                      <li>
                        • You can unclaim the task if you need to step away
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  <strong>Next Steps:</strong> After claiming, you'll see
                  Approve and Reject buttons. Each action will require comments
                  and your digital signature.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            isLoading={isLoading}
            loadingText="Claiming Task..."
          >
            <>
              <Users className="h-4 w-4 mr-2" />
              Claim Task ({claimDuration} min)
            </>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
