import type { RecordStatus } from "@/types";

// Dropdown options. To add a new option later, just add it to the array.

export const LICENSES = ["Valid", "Invalid"] as const;

/** Add future offers here, e.g. "ABC". */
export const PRODUCTS = ["Tally", "Busy", "Dollar"] as const;

/** Value-added services / product offers */
export const PRODUCT_OFFERS = [
  "Antivirus",
  "Management Software",
  "Cloud Backup",
  "Training",
  "AMC",
] as const;

export const CUSTOMER_TYPES = ["New", "Follow up"] as const;

export interface StatusMeta {
  value: RecordStatus;
  label: string;
  /** Tailwind classes for the badge (use the semantic colour tokens). */
  badge: string;
  /** Hex used by charts. */
  chart: string;
}

export const STATUSES: readonly StatusMeta[] = [
  { value: "open", label: "Open", badge: "bg-info-soft text-info", chart: "#3b82f6" },
  {
    value: "in_progress",
    label: "In Progress",
    badge: "bg-warning-soft text-warning",
    chart: "#f59e0b",
  },
  {
    value: "resolved",
    label: "Resolved",
    badge: "bg-success-soft text-success",
    chart: "#22c55e",
  },
  {
    value: "self_resolved",
    label: "Self Resolved",
    badge: "bg-surface-sunken text-fg-muted",
    chart: "#94a3b8",
  },
  { value: "not_resolved", label: "Not Resolved", badge: "bg-danger-soft text-danger", chart: "#ef4444" },
  { value: "positive", label: "Positive", badge: "bg-success-soft text-success", chart: "#22c55e" },
  { value: "negative", label: "Negative", badge: "bg-danger-soft text-danger", chart: "#ef4444" },
  { value: "win", label: "Win", badge: "bg-success-soft text-success", chart: "#22c55e" },
  { value: "lost", label: "Lost", badge: "bg-danger-soft text-danger", chart: "#ef4444" },
  { value: "not_interested", label: "Not Interested", badge: "bg-surface-sunken text-fg-muted", chart: "#64748b" },
  {
    value: "transferred",
    label: "Transferred",
    badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-1 ring-purple-600/20",
    chart: "#a855f7",
  },
];

export const STATUS_BY_VALUE: Record<RecordStatus, StatusMeta> = {
  open: STATUSES[0],
  in_progress: STATUSES[1],
  resolved: STATUSES[2],
  self_resolved: STATUSES[3],
  not_resolved: STATUSES[4],
  positive: STATUSES[5],
  negative: STATUSES[6],
  win: STATUSES[7],
  lost: STATUSES[8],
  not_interested: STATUSES[9],
  transferred: STATUSES[10],
};

export const DEFAULT_STATUS: RecordStatus = "open";

// --- Tokens -------------------------------------------------------------------
import type { TokenProgress } from "@/types";

export const TOKEN_PROGRESS: readonly {
  value: TokenProgress;
  label: string;
  badge: string;
}[] = [
  { value: "pending", label: "Pending", badge: "bg-warning-soft text-warning" },
  { value: "ongoing", label: "On Going", badge: "bg-info-soft text-info" },
  { value: "completed", label: "Complete", badge: "bg-success-soft text-success" },
];

export const TOKEN_PROGRESS_LABEL: Record<TokenProgress, string> = {
  pending: "Pending",
  ongoing: "On Going",
  completed: "Complete",
};
