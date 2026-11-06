import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type ToastKind = "success" | "warning" | "error" | "info";

export interface ToastOptions {
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
  title?: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  isDismissing?: boolean;
};

export interface ToastApi {
  success: (message: string, options?: ToastOptions | string) => string;
  warning: (message: string, options?: ToastOptions | string) => string;
  error: (message: string, options?: ToastOptions | string) => string;
  info: (message: string, options?: ToastOptions | string) => string;
  show: (
    kind: ToastKind,
    message: string,
    options?: ToastOptions | string,
  ) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATIONS: Record<ToastKind, number> = {
  success: 4000,
  warning: 5500,
  error: 6500,
  info: 4500,
};

const STYLES: Record<
  ToastKind,
  {
    card: string;
    iconWrapper: string;
    icon: string;
    bar: string;
    defaultTitle: string;
  }
> = {
  success: {
    card: "border-emerald-500/30 dark:border-emerald-500/40 shadow-[0_10px_30px_rgba(16,185,129,0.18)] dark:shadow-[0_12px_32px_rgba(16,185,129,0.25)]",
    iconWrapper:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500 dark:bg-emerald-400",
    defaultTitle: "Success",
  },
  warning: {
    card: "border-amber-500/35 dark:border-amber-500/45 shadow-[0_10px_30px_rgba(245,158,11,0.18)] dark:shadow-[0_12px_32px_rgba(245,158,11,0.25)]",
    iconWrapper:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
    icon: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500 dark:bg-amber-400",
    defaultTitle: "Warning",
  },
  error: {
    card: "border-rose-500/35 dark:border-rose-500/45 shadow-[0_10px_30px_rgba(244,63,94,0.18)] dark:shadow-[0_12px_32px_rgba(244,63,94,0.25)]",
    iconWrapper:
      "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30",
    icon: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500 dark:bg-rose-400",
    defaultTitle: "Error",
  },
  info: {
    card: "border-sky-500/30 dark:border-sky-500/40 shadow-[0_10px_30px_rgba(14,165,233,0.18)] dark:shadow-[0_12px_32px_rgba(14,165,233,0.25)]",
    iconWrapper:
      "bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30",
    icon: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500 dark:bg-sky-400",
    defaultTitle: "Information",
  },
};

const normalizeOptions = (options?: ToastOptions | string): ToastOptions => {
  if (!options) return {};
  if (typeof options === "string") return { title: options };
  return options;
};

/* -------------------------------------------------------------------------- */
/* Standalone Event Emitter for Imperative Usage Outside React Hooks          */
/* -------------------------------------------------------------------------- */
type ToastAction =
  | { type: "SHOW"; toast: ToastItem }
  | { type: "DISMISS"; id: string }
  | { type: "CLEAR" };

type Listener = (action: ToastAction) => void;
const listeners = new Set<Listener>();

const emitShow = (
  kind: ToastKind,
  message: string,
  options?: ToastOptions | string,
): string => {
  const opts = normalizeOptions(options);
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const duration = opts.duration ?? DEFAULT_DURATIONS[kind];
  const item: ToastItem = {
    id,
    kind,
    message,
    title: opts.title,
    duration,
    action: opts.action,
  };
  listeners.forEach((listener) => listener({ type: "SHOW", toast: item }));
  return id;
};

/**
 * Global singleton toast object. Can be imported directly anywhere in the app
 * (including utils, async services, and event listeners) without needing a React hook.
 */
export const toast: ToastApi = {
  success: (message, options) => emitShow("success", message, options),
  warning: (message, options) => emitShow("warning", message, options),
  error: (message, options) => emitShow("error", message, options),
  info: (message, options) => emitShow("info", message, options),
  show: (kind, message, options) => emitShow(kind, message, options),
  dismiss: (id) => {
    listeners.forEach((listener) => listener({ type: "DISMISS", id }));
  },
  clear: () => {
    listeners.forEach((listener) => listener({ type: "CLEAR" }));
  },
};

const ToastContext = createContext<ToastApi>(toast);

/* -------------------------------------------------------------------------- */
/* Toast Icons                                                                */
/* -------------------------------------------------------------------------- */
const ToastIcon = ({ kind }: { kind: ToastKind }) => {
  switch (kind) {
    case "success":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "warning":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "error":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case "info":
      return (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
};

/* -------------------------------------------------------------------------- */
/* Single Toast Card with Pause on Hover & Animated Progress Bar              */
/* -------------------------------------------------------------------------- */
interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastCard = ({ toast: item, onDismiss }: ToastCardProps) => {
  const config = STYLES[item.kind];
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(item.duration);

  const startDismissTimer = useCallback(
    (ms: number) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      startTimeRef.current = Date.now();
      remainingRef.current = ms;
      timerRef.current = window.setTimeout(() => {
        onDismiss(item.id);
      }, ms);
    },
    [item.id, onDismiss],
  );

  useEffect(() => {
    startDismissTimer(item.duration);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [item.duration, startDismissTimer]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(800, remainingRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    startDismissTimer(remainingRef.current);
  };

  return (
    <div
      role={item.kind === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "toast-card pointer-events-auto relative flex w-full select-text items-start gap-3.5 overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 dark:bg-slate-900/95 sm:p-4.5",
        config.card,
        item.isDismissing
          ? "translate-x-10 scale-95 opacity-0"
          : "animate-toast-in scale-100 opacity-100",
      )}
    >
      {/* Icon Badge */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform",
          config.iconWrapper,
        )}
      >
        <ToastIcon kind={item.kind} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-fg">
            {item.title || config.defaultTitle}
          </span>
        </div>
        <p className="mt-0.5 text-xs font-normal leading-relaxed text-fg-muted dark:text-slate-300 sm:text-sm">
          {item.message}
        </p>

        {item.action && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
              className="inline-flex items-center text-xs font-semibold text-brand underline underline-offset-2 hover:opacity-85"
            >
              {item.action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-lg p-1 text-fg-subtle transition-colors hover:bg-black/5 hover:text-fg dark:hover:bg-white/10 dark:hover:text-white"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Animated Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black/5 dark:bg-white/10">
        <div
          className={cn("toast-progress-bar h-full", config.bar)}
          style={{ animationDuration: `${item.duration}ms` }}
        />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Provider Component                                                         */
/* -------------------------------------------------------------------------- */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    // Start dismissal animation
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, isDismissing: true } : t)),
    );
    // Remove from state after animation completes
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 240);
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((newItem: ToastItem) => {
    setToasts((current) => {
      // Keep maximum of 5 toasts to prevent overcrowding
      const filtered = current.filter((t) => !t.isDismissing);
      const trimmed = filtered.length >= 5 ? filtered.slice(1) : filtered;
      return [...trimmed, newItem];
    });
  }, []);

  // Subscribe to standalone emitter
  useEffect(() => {
    const handleAction: Listener = (action) => {
      if (action.type === "SHOW") {
        addToast(action.toast);
      } else if (action.type === "DISMISS") {
        dismissToast(action.id);
      } else if (action.type === "CLEAR") {
        clearAllToasts();
      }
    };

    listeners.add(handleAction);
    return () => {
      listeners.delete(handleAction);
    };
  }, [addToast, dismissToast, clearAllToasts]);

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg, opts) => emitShow("success", msg, opts),
      warning: (msg, opts) => emitShow("warning", msg, opts),
      error: (msg, opts) => emitShow("error", msg, opts),
      info: (msg, opts) => emitShow("info", msg, opts),
      show: (k, msg, opts) => emitShow(k, msg, opts),
      dismiss: dismissToast,
      clear: clearAllToasts,
    }),
    [dismissToast, clearAllToasts],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[9999] mx-auto flex max-w-sm flex-col gap-3 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-full sm:max-w-md"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {toasts.map((item) => (
          <ToastCard
            key={item.id}
            toast={item}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  return context ?? toast;
}
