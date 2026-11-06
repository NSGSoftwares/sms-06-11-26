import { cn } from "@/lib/cn";

interface NoticeProps {
  type: "success" | "error" | "warning";
  message: string;
  onClose?: () => void;
  className?: string;
}

const STYLES = {
  success: {
    container: "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200",
    iconWrapper: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  error: {
    container: "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200",
    iconWrapper: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  warning: {
    container: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200",
    iconWrapper: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
} as const;

const NoticeIcon = ({ type }: { type: "success" | "error" | "warning" }) => {
  switch (type) {
    case "success":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "warning":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "error":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
};

const Notice = ({ type, message, onClose, className }: NoticeProps) => (
  <div
    role={type === "error" ? "alert" : "status"}
    className={cn(
      "mb-5 flex items-start justify-between gap-3 rounded-xl border p-3.5 text-sm transition-all",
      STYLES[type].container,
      className,
    )}
  >
    <div className="flex items-start gap-2.5 min-w-0">
      <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", STYLES[type].iconWrapper)}>
        <NoticeIcon type={type} />
      </div>
      <span className="leading-relaxed font-medium">{message}</span>
    </div>

    {onClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    )}
  </div>
);

export default Notice;
