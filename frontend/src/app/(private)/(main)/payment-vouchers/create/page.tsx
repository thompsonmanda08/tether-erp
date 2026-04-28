import { redirect } from "next/navigation";

/**
 * Legacy PV creation route. Replaced by modal flow on /payment-vouchers
 * (the list page shows approved POs and opens CreatePVFromPODialog).
 * Permanent redirect to keep old links + bookmarks working.
 */
export default function CreatePaymentVoucherRedirect() {
  redirect("/payment-vouchers");
}
