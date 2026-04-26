"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CheckCircle,
  XCircle,
  FileSignature,
  MessageSquare,
  RotateCcw,
  Ban,
  Loader2,
  Undo2,
} from "lucide-react";
import { DigitalSignaturePad } from "@/components/ui/digital-signature-pad";

interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    comments: string;
    signature: string;
    rejectionType?: "reject" | "return_to_draft" | "return_to_previous_stage";
  }) => void;
  isLoading: boolean;
  action: "approve" | "reject";
  taskDetails: {
    entityType: string;
    entityId: string;
    stageName: string;
    claimedBy: string;
    claimExpiry: string;
    stageNumber?: number;
  };
}

export function ApprovalActionModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  action,
  taskDetails,
}: ApprovalActionModalProps) {
  const [comments, setComments] = useState("");
  const [signature, setSignature] = useState("");
  const [errors, setErrors] = useState<{
    comments?: string;
    signature?: string;
  }>({});
  const [rejectionType, setRejectionType] = useState<
    "reject" | "return_to_draft" | "return_to_previous_stage"
  >("return_to_draft");

  const isApprove = action === "approve";
  const actionText = isApprove ? "Approve" : "Reject";
  const actionColor = isApprove ? "green" : "red";
  const ActionIcon = isApprove ? CheckCircle : XCircle;

  const validateForm = () => {
    const newErrors: { comments?: string; signature?: string } = {};

    if (!comments.trim()) {
      newErrors.comments = `Comments are required when ${action === "approve" ? "approving" : "rejecting"} a task`;
    } else if (comments.trim().length < 10) {
      newErrors.comments = "Comments must be at least 10 characters long";
    }

    // Signature is only required for approvals, not rejections
    if (isApprove && !signature.trim()) {
      newErrors.signature = "Digital signature is required for approval";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onConfirm({
        comments: comments.trim(),
        signature: signature.trim(),
        ...(isApprove ? {} : { rejectionType }),
      });
    }
  };

  const handleClose = () => {
    setComments("");
    setSignature("");
    setErrors({});
    setRejectionType("return_to_draft");
    onClose();
  };

  const remainingTime = taskDetails.claimExpiry
    ? new Date(taskDetails.claimExpiry).getTime() - new Date().getTime()
    : 0;
  const minutesRemaining = Math.max(0, Math.floor(remainingTime / (1000 * 60)));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90svh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 mb-2">
            <ActionIcon className={`h-5 w-5 text-${actionColor}-600`} />
            {actionText} Task
          </DialogTitle>
          <DialogDescription asChild className="text-left space-y-3">
            <div>
              <div
                className={`bg-${actionColor}-50 p-3 rounded-lg border border-${actionColor}-200 dark:bg-${actionColor}-950/30 dark:border-${actionColor}-800 `}
              >
                <p
                  className={`font-semibold uppercase text-${actionColor}-900 dark:text-${actionColor}-200`}
                >
                  {taskDetails.entityType} #{taskDetails.entityId}
                </p>
                <p
                  className={`text-sm text-${actionColor}-700 dark:text-${actionColor}-300`}
                >
                  Stage:{" "}
                  <span className="font-medium">{taskDetails.stageName}</span>
                </p>
                <p
                  className={`text-xs text-${actionColor}-700 dark:text-${actionColor}-400`}
                >
                  Claimed by: {taskDetails.claimedBy} ({minutesRemaining} min
                  remaining)
                </p>
              </div>

              {isApprove ? (
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Approving this task will:</strong>
                  </p>
                  <ul className="text-sm text-green-700 dark:text-green-300 mt-1 space-y-1">
                    <li>• Move the document to the next approval stage</li>
                    <li>• Send notifications to relevant stakeholders</li>
                    <li>• Create a permanent audit record of your approval</li>
                    <li>• Progress the workflow according to defined rules</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Choose a rejection action below.</strong>
                  </p>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4">
          {/* Rejection Type Picker - Only for Rejections */}
          {!isApprove && (
            <div className="space-y-3">
              <Label className="flex text-sxs md:text-sm items-center gap-2">
                Rejection Action *
              </Label>
              <RadioGroup
                value={rejectionType}
                onValueChange={(v) =>
                  setRejectionType(
                    v as "reject" | "return_to_draft" | "return_to_previous_stage"
                  )
                }
                className="space-y-2"
              >
                {/* Return to Previous Stage — only when at stage 2+ */}
                {(taskDetails.stageNumber ?? 1) > 1 && (
                  <label
                    htmlFor="return_to_previous_stage"
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      rejectionType === "return_to_previous_stage"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem
                      value="return_to_previous_stage"
                      id="return_to_previous_stage"
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Undo2 className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">
                          Return to Previous Stage
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send back to the previous approval stage for revision.
                        The workflow stays active.
                      </p>
                    </div>
                  </label>
                )}

                <label
                  htmlFor="return_to_draft"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    rejectionType === "return_to_draft"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value="return_to_draft"
                    id="return_to_draft"
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-sm">
                        Return to Draft
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send the document back to the requester. They can edit and
                      resubmit it.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="reject"
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    rejectionType === "reject"
                      ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem
                    value="reject"
                    id="reject"
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-sm">
                        Reject (End Workflow)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permanently reject the document and terminate the process.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-2">
            <Label
              htmlFor="comments"
              className="flex text-sxs md:text-sm items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {isApprove
                ? "Approval Comments"
                : rejectionType === "reject"
                  ? "Rejection Reason"
                  : "Reason for Returning"}{" "}
              *
            </Label>
            <Textarea
              id="comments"
              placeholder={
                isApprove
                  ? "Explain why you're approving this request..."
                  : rejectionType === "reject"
                    ? "Explain why this is being rejected..."
                    : "Explain what needs to be changed or revised..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className={`${errors.comments ? "border-red-500" : ""}`}
              disabled={isLoading}
              descriptionText="Comments are required. (Minimum 10 characters)"
              maxLength={300}
              isInvalid={!!errors.comments}
              errorText={errors.comments}
              showLimit
            />
          </div>

          {/* Digital Signature Section - Only for Approvals */}
          {isApprove && (
            <div className="space-y-2">
              <Label className="flex items-center text-sxs md:text-sm gap-2">
                <FileSignature className="h-4 w-4" />
                Digital Signature *
              </Label>
              <DigitalSignaturePad
                onSignatureChange={setSignature}
                disabled={isLoading}
                className={errors.signature ? "border-red-500" : ""}
              />
              {errors.signature && (
                <p className="text-sm text-destructive">{errors.signature}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse w-full sm:flex-row sticky bottom-0 bg-background/70 border-t border-border backdrop-blur-2xl gap-2 p-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading || !comments.trim() || (isApprove && !signature.trim())
            }
            className={`w-full sm:w-auto ${
              isApprove
                ? "bg-green-600 hover:bg-green-700"
                : rejectionType === "return_to_previous_stage"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : rejectionType === "return_to_draft"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-red-600 hover:bg-red-700"
            }`}
            isLoading={isLoading}
            loadingText={"Please wait..."}
          >
            <>
              {!isApprove && rejectionType === "return_to_previous_stage" ? (
                <>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Return to Previous Stage
                </>
              ) : !isApprove && rejectionType === "return_to_draft" ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Return to Draft
                </>
              ) : (
                <>
                  <ActionIcon className="h-4 w-4 mr-2" />
                  {actionText} Task
                </>
              )}
            </>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
