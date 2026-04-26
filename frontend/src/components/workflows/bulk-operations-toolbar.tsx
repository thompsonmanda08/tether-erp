"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BulkOperationsToolbarProps {
  selectedCount: number;
  onApprove: (remarks: string) => Promise<void>;
  onReject: (remarks: string) => Promise<void>;
  onReassign: (userId: string, remarks: string) => Promise<void>;
  isLoading?: boolean;
}

export function BulkOperationsToolbar({
  selectedCount,
  onApprove,
  onReject,
  onReassign,
  isLoading = false,
}: BulkOperationsToolbarProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove(remarks);
      setRemarks("");
      setShowApproveDialog(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(remarks);
      setRemarks("");
      setShowRejectDialog(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassign = async () => {
    setIsProcessing(true);
    try {
      await onReassign(selectedUserId, remarks);
      setRemarks("");
      setSelectedUserId("");
      setShowReassignDialog(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-blue-700 bg-blue-600 dark:border-blue-200 dark:bg-blue-50">
        <CardContent className="pt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-white dark:text-blue-600" />
            <span className="font-medium text-white dark:text-blue-900">
              {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowApproveDialog(true)}
              disabled={isLoading || isProcessing}
              className="bg-green-50 hover:bg-green-100 text-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve All
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading || isProcessing}
              className="bg-red-50 hover:bg-red-100 text-red-700"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject All
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReassignDialog(true)}
              disabled={isLoading || isProcessing}
              className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Reassign All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve</DialogTitle>
            <DialogDescription>
              Approve all {selectedCount} selected item
              {selectedCount !== 1 ? "s" : ""}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Approval Comments (Optional)
              </label>
              <Textarea
                placeholder="Add any comments about this bulk approval..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="bg-blue-600 border border-blue-700 rounded-lg p-3 flex gap-2 dark:bg-blue-50 dark:border-blue-200">
              <AlertCircle className="h-5 w-5 text-white flex-shrink-0 mt-0.5 dark:text-blue-600" />
              <p className="text-sm text-blue-100 dark:text-blue-800">
                All selected items will be approved and moved to the next stage
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
              isLoading={isProcessing}
              loadingText="Approving..."
            >
              Approve All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject</DialogTitle>
            <DialogDescription>
              Reject all {selectedCount} selected item
              {selectedCount !== 1 ? "s" : ""}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-red-700">
                Rejection Reason *
              </label>
              <Textarea
                placeholder="Please provide a reason for rejecting these items..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-2 border-red-200 focus:border-red-500"
                rows={3}
              />
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">
                All selected items will be rejected and returned to the
                requester
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing || !remarks}
              className="bg-red-600 hover:bg-red-700"
              isLoading={isProcessing}
              loadingText="Rejecting..."
            >
              Reject All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reassign</DialogTitle>
            <DialogDescription>
              Reassign all {selectedCount} selected item
              {selectedCount !== 1 ? "s" : ""} to a different approver
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reassign To *</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select approver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user-001">
                    John Smith - Department Manager
                  </SelectItem>
                  <SelectItem value="user-002">
                    Sarah Johnson - Finance Officer
                  </SelectItem>
                  <SelectItem value="user-003">
                    Michael Davis - Director
                  </SelectItem>
                  <SelectItem value="user-004">David Wilson - CFO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">
                Reason for Reassignment (Optional)
              </label>
              <Textarea
                placeholder="Add a reason for this reassignment..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                All selected items will be reassigned to the new approver
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReassignDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={isProcessing || !selectedUserId}
              className="bg-yellow-600 hover:bg-yellow-700"
              isLoading={isProcessing}
              loadingText="Reassigning..."
            >
              Reassign All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
