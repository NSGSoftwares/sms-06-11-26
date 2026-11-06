import { useEffect, useRef, useState } from "react";
import { PALETTES, type ThemeMode } from "@/config/theme";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import Icon from "@/components/ui/Icon";

const MODES: { value: ThemeMode; label: string; icon: "sun" | "moon" | "clock" }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "clock" },
];

/** Dark-mode toggle + a solid, non-transparent popover for mode and colourful palettes. */
const ThemeMenu = () => {
  const { mode, palette, isDark, setMode, setPalette, toggleDark } = useTheme();
  const toast = useToast();
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

  const handlePaletteSelect = (item: (typeof PALETTES)[number]) => {
    setPalette(item.value);
    toast.success(`Theme palette changed to ${item.label}.`, {
      title: "Theme Updated",
      duration: 2500,
    });
  };

  const handleModeSelect = (newMode: ThemeMode) => {
    setMode(newMode);
    toast.info(`Theme mode set to ${newMode}.`, {
      title: "Mode Updated",
      duration: 2500,
    });
  };

  return (
    <div ref={rootRef} className="relative flex items-center">
      {/* Solid Button Group in Navbar */}
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface-sunken p-0.5">
        <button
          type="button"
          onClick={toggleDark}
          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-all hover:bg-surface hover:text-fg active:scale-95"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          <Icon name={isDark ? "sun" : "moon"} size={17} />
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-95",
            open
              ? "bg-white text-slate-900 shadow-sm"
              : "text-fg-muted hover:bg-surface hover:text-fg",
          )}
          aria-label="Appearance settings"
          aria-expanded={open}
          aria-haspopup="true"
          title="Colour Palettes & Appearance"
        >
          <Icon name="palette" size={17} />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Appearance settings"
          className="animate-toast-in absolute right-0 top-11 z-50 w-[350px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          style={{ opacity: 1 }}
        >
          {/* Header */}
          <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon name="palette" size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Appearance
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Choose your mode and brand colour
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* Mode Selector */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Theme Mode
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800">
              {MODES.map((item) => {
                const isSelected = mode === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleModeSelect(item.value)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150",
                      isSelected
                        ? "bg-white text-brand shadow-sm ring-1 ring-black/5 dark:bg-slate-700 dark:text-brand dark:ring-white/10"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                    )}
                  >
                    <Icon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colour Palette Grid */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Colour Palettes
              </p>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold capitalize text-brand">
                {palette}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-5 gap-2">
              {PALETTES.map((item) => {
                const isActive = palette === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`${item.label} colour`}
                    title={item.label}
                    onClick={() => handlePaletteSelect(item)}
                    className={cn(
                      "group flex flex-col items-center justify-center gap-1 rounded-xl border p-1.5 transition-all duration-150 hover:scale-105 active:scale-95",
                      isActive
                        ? "border-brand bg-brand-soft/30 text-brand ring-2 ring-brand/40 shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-700",
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center rounded-full shadow-sm ring-2 transition-transform duration-150 group-hover:scale-110",
                        isActive
                          ? "ring-brand"
                          : "ring-white/80 dark:ring-slate-900",
                      )}
                      style={{ backgroundColor: item.swatch }}
                    >
                      {isActive && (
                        <span className="text-white drop-shadow-sm">
                          <Icon name="check" size={13} />
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-center text-[10px] font-semibold leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeMenu;
