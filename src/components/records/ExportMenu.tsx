import { useEffect, useRef, useState } from "react";
import type { ExportFormat } from "@/lib/export";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  /** Shown to explain what will be exported, e.g. "12 filtered records". */
  summary?: string;
  /** Button text (default "Export"). */
  label?: string;
}

/** "Export" button with a small CSV / Excel menu. */
const ExportMenu = ({
  onExport,
  disabled,
  summary,
  label = "Export",
}: ExportMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (format: ExportFormat) => {
    setOpen(false);
    onExport(format);
  };

  const itemClass =
    "block w-full px-4 py-2 text-left text-sm text-fg-muted hover:bg-surface-sunken hover:text-fg";

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="secondary"
        icon="download"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop"
        >
          {summary && (
            <p className="border-b border-line px-4 py-2 text-xs text-fg-subtle">
              {summary}
            </p>
          )}
          <button type="button" role="menuitem" className={itemClass} onClick={() => choose("xlsx")}>
            <Icon name="download" size={14} className="mr-2 inline" />
            Excel (.xlsx)
          </button>
          <button type="button" role="menuitem" className={itemClass} onClick={() => choose("csv")}>
            <Icon name="download" size={14} className="mr-2 inline" />
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
