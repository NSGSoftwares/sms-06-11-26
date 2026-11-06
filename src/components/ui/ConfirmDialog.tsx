import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import Button from "./Button";

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for destructive actions such as delete. */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehavior(panelRef, onCancel);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl border border-brand/20 bg-surface p-6 shadow-pop"
      >
        <h2 className="text-lg font-semibold text-fg">{title}</h2>

        <div className="mt-2 text-sm text-fg-subtle">{message}</div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>

          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
