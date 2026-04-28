"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import {
  approveApprovalTask,
  rejectApprovalTask,
  reassignApprovalTask,
} from "@/app/_actions/workflow-approval-actions";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants";
import type { SignatureCanvasHandle } from "@/components/ui/signature-canvas";

const SignatureCanvas = dynamic(
  () =>
    import("@/components/ui/signature-canvas").then((m) => m.SignatureCanvas),
  { ssr: false },
);

export type QuickAction = "approve" | "reject" | "reassign";

interface QuickActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: QuickAction;
  taskId: string;
  documentNumber?: string;
  /** Optional list of approvers for reassign target. */
  availableApprovers?: { id: string; name: string; role?: string }[];
  /** Whether digital signature is required for this org. */
  requireSignature?: boolean;
  onCompleted?: () => void;
}

const config: Record<QuickAction, {
  title: string;
  intent: "success" | "danger" | "neutral";
  icon: typeof CheckCircle2;
  cta: string;
  commentLabel: string;
  commentPlaceholder: string;
  commentRequired: boolean;
  minComment: number;
}> = {
  approve: {
    title: "Approve Task",
    intent: "success",
    icon: CheckCircle2,
    cta: "Approve",
    commentLabel: "Comments (optional)",
    commentPlaceholder: "Add optional comments…",
    commentRequired: false,
    minComment: 0,
  },
  reject: {
    title: "Reject Task",
    intent: "danger",
    icon: XCircle,
    cta: "Reject",
    commentLabel: "Reason for rejection",
    commentPlaceholder: "Why is this task being rejected?",
    commentRequired: true,
    minComment: 10,
  },
  reassign: {
    title: "Reassign Task",
    intent: "neutral",
    icon: ArrowRight,
    cta: "Reassign",
    commentLabel: "Reason for reassignment",
    commentPlaceholder: "Why is this task being reassigned?",
    commentRequired: true,
    minComment: 5,
  },
};

/**
 * Single modal that handles approve / reject / reassign actions.
 * Replaces 3 doc-type-specific approval modals.
 */
export function QuickActionModal({
  open,
  onOpenChange,
  action,
  taskId,
  documentNumber,
  availableApprovers,
  requireSignature = false,
  onCompleted,
}: QuickActionModalProps) {
  const queryClient = useQueryClient();
  const cfg = config[action];
  const [comment, setComment] = useState("");
  const [signature, setSignature] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sigRef = useRef<SignatureCanvasHandle>(null);

  const reset = () => {
    setComment("");
    setSignature("");
    setReassignTo("");
    setSubmitting(false);
    sigRef.current?.clearSignature();
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (cfg.commentRequired && comment.trim().length < cfg.minComment) {
      return `Please provide ${cfg.minComment}+ characters of context.`;
    }
    if (requireSignature && !signature) {
      return "Digital signature is required.";
    }
    if (action === "reassign" && !reassignTo) {
      return "Please select a new approver.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    try {
      let res;
      if (action === "approve") {
        res = await approveApprovalTask(taskId, {
          comments: comment || undefined,
          signature: signature || "",
        });
      } else if (action === "reject") {
        res = await rejectApprovalTask(taskId, {
          remarks: comment,
          signature: signature || undefined,
        });
      } else {
        res = await reassignApprovalTask(taskId, {
          newApproverId: reassignTo,
          reason: comment,
        });
      }
      if (!res.success) {
        toast.error(res.message || `Failed to ${action} task`);
        return;
      }
      toast.success(
        action === "approve"
          ? "Task approved"
          : action === "reject"
            ? "Task rejected"
            : "Task reassigned",
      );
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPROVALS.ALL] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TASKS.ALL] });
      onCompleted?.();
      close();
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = cfg.icon;

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} size="lg" placement="center">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Icon
            className={
              cfg.intent === "success"
                ? "h-5 w-5 text-success-600"
                : cfg.intent === "danger"
                  ? "h-5 w-5 text-danger-600"
                  : "h-5 w-5 text-secondary-600"
            }
          />
          <div>
            <p className="text-base font-semibold">{cfg.title}</p>
            {documentNumber && (
              <p className="text-xs text-muted-foreground">
                {documentNumber}
              </p>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {action === "reassign" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Reassign to <span className="text-danger-500">*</span>
              </label>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="h-10 w-full rounded-md border border-divider bg-content1 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Select approver…</option>
                {availableApprovers?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.role ? ` — ${a.role}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {cfg.commentLabel}
              {cfg.commentRequired && (
                <span className="text-danger-500"> *</span>
              )}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={cfg.commentPlaceholder}
              minRows={3}
            />
          </div>

          {requireSignature && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Digital signature <span className="text-danger-500">*</span>
              </label>
              <SignatureCanvas
                ref={sigRef}
                onSignatureChange={setSignature}
                height={140}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            color={
              cfg.intent === "success"
                ? "success"
                : cfg.intent === "danger"
                  ? "danger"
                  : "primary"
            }
            isLoading={submitting}
            onClick={handleSubmit}
          >
            {cfg.cta}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
