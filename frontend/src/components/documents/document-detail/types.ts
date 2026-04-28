import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export type DocumentTypeKey =
  | "requisition"
  | "purchase_order"
  | "payment_voucher"
  | "grn";

/**
 * Single metadata row rendered in the sidebar.
 * `value` may be any renderable; resolver runs against the doc.
 */
export interface MetadataField<TDoc> {
  label: string;
  icon?: LucideIcon;
  /** Resolve raw value (string | number | ReactNode). Return null/undefined to hide row. */
  value: (doc: TDoc) => ReactNode;
  /** Optional copy-to-clipboard string. */
  copyValue?: (doc: TDoc) => string | undefined;
  /** Hide row when condition fails. */
  show?: (doc: TDoc) => boolean;
}

/**
 * Column for the generic items table on the right pane.
 */
export interface ItemColumn<TItem> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  /** Cell renderer; returns ReactNode. */
  render: (item: TItem, index: number) => ReactNode;
}

/**
 * One body section (right pane). Sections render in order.
 * Use `condition` to hide based on doc state (e.g. only show "Quotations" on requisitions).
 */
export interface BodySection<TDoc> {
  id: string;
  title: string;
  icon?: LucideIcon;
  description?: string;
  /** Optional gating; defaults to always show. */
  condition?: (doc: TDoc) => boolean;
  /** Section body content. */
  render: (doc: TDoc) => ReactNode;
}

/**
 * Action button shown in the sidebar action panel.
 * Buttons render in order; primary intent goes to the top.
 */
export interface ActionButton<TDoc> {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "primary" | "outline" | "danger" | "warning";
  /** Hide unless condition holds. */
  condition?: (doc: TDoc, ctx: ActionContext) => boolean;
  /** Disable while another mutation is in flight. */
  isLoading?: boolean;
  onClick: (doc: TDoc, ctx: ActionContext) => void | Promise<void>;
}

export interface ActionContext {
  userId: string;
  userRole: string;
  permissions: {
    isCreator: boolean;
    canEdit: boolean;
    canSubmit: boolean;
    canWithdraw: boolean;
  };
}
