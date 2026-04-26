"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";
import { PaymentVoucher } from "@/types/payment-voucher";
import { useMarkPaymentVoucherAsPaid } from "@/hooks/use-payment-voucher-mutations";
import { formatCurrency } from "@/lib/utils";

interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentVoucher: PaymentVoucher;
  userId: string;
  userRole: string;
  onSuccess: () => void;
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  paymentVoucher,
  userId,
  userRole,
  onSuccess,
}: MarkPaidDialogProps) {
  const [paidAmount, setPaidAmount] = useState(
    String(paymentVoucher.totalAmount || paymentVoucher.amount || ""),
  );
  const [paymentMethod, setPaymentMethod] = useState(
    paymentVoucher.paymentMethod || "",
  );
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [comments, setComments] = useState("");

  const mutation = useMarkPaymentVoucherAsPaid(() => {
    toast.success("Payment voucher marked as paid");
    onSuccess();
    onOpenChange(false);
  });

  const handleSubmit = () => {
    const amount = parseFloat(paidAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid paid amount");
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error("Payment reference number is required");
      return;
    }
    if (!paidDate) {
      toast.error("Payment date is required");
      return;
    }

    mutation.mutate({
      paymentVoucherId: paymentVoucher.id,
      pvId: paymentVoucher.id,
      paidBy: userId,
      markedBy: userId,
      markedByRole: userRole,
      paidAt: new Date(paidDate),
      paidDate: new Date(paidDate),
      paidAmount: amount,
      paymentReference: referenceNumber,
      referenceNumber,
      comments,
    });
  };

  const approvedAmount = paymentVoucher.totalAmount || paymentVoucher.amount;
  const enteredAmount = parseFloat(paidAmount) || 0;
  const hasMismatch = enteredAmount > 0 && enteredAmount !== approvedAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {paymentVoucher.documentNumber}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Approved amount reference */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Approved Amount: </span>
            <span className="font-semibold">
              {formatCurrency(approvedAmount, paymentVoucher.currency)}
            </span>
          </div>

          {/* Paid Amount — locked to approved amount, backend enforces exact match */}
          <div className="space-y-2">
            <Label htmlFor="paidAmount">
              Paid Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              min="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Must match the approved amount exactly.
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <Input
            label="Payment Reference / Transaction ID"
            required
            id="referenceNumber"
            placeholder="e.g. TXN-2026-001234"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paidDate">
              Payment Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="paidDate"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Textarea
              id="comments"
              label="Comments (optional)"
              placeholder="Any additional notes about this payment..."
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            isLoading={mutation.isPending}
            loadingText="Recording..."
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
