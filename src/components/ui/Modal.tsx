import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { cn } from "@/lib/cn";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons pinned to the bottom of the dialog (e.g. Edit / Print / Delete). */
  footer?: ReactNode;
  /** Tailwind max-width class for the panel. */
  maxWidth?: string;
  /** Allow clicking the dark background to close (not for forms). */
  closeOnOverlay?: boolean;
}

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-4xl",
  closeOnOverlay = false,
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehavior(panelRef, onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "my-auto flex max-h-[calc(100dvh-2rem)] min-h-0 w-full flex-col overflow-hidden rounded-3xl bg-surface shadow-pop",
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-fg">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-fg-subtle">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-3 py-1.5 text-xl leading-none text-fg-subtle hover:bg-surface-sunken hover:text-fg"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
