import { cn } from "@/lib/cn";
import Icon, { type IconName } from "./Icon";

type Tone = "brand" | "success" | "warning" | "danger" | "info";
type Featured = "violet" | "orange" | "teal" | "blue";

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: IconName;
  tone?: Tone;
  variant?: "default" | "dashboard";
  /** Large gradient "hero" card instead of the white one. */
  featured?: Featured;
  className?: string;
}

const TILES: Record<Tone, string> = {
  brand: "bg-brand/12 text-brand",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  info: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
};

const GRADIENTS: Record<Featured, string> = {
  violet: "from-indigo-500 via-violet-500 to-purple-600 shadow-violet-500/25",
  orange: "from-amber-500 to-orange-500 shadow-orange-500/25",
  teal: "from-teal-500 to-emerald-600 shadow-teal-500/25",
  blue: "from-sky-500 to-blue-600 shadow-blue-500/25",
};

const ACCENTS: Record<Tone, string> = {
  brand: "bg-brand",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
};

const StatCard = ({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  variant = "default",
  featured,
  className,
}: StatCardProps) => {
  if (variant === "dashboard") {
    return (
      <div
        className={cn(
          "group relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-card sm:p-5",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn("absolute inset-x-0 top-0 h-1", ACCENTS[tone])}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
              {label}
            </p>
            <p className="mt-3 truncate text-3xl font-extrabold tracking-tight text-fg">
              {value}
            </p>
          </div>
          {icon && (
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                TILES[tone],
              )}
            >
              <Icon name={icon} size={21} />
            </span>
          )}
        </div>
        {hint && (
          <p className="mt-3 truncate border-t border-line pt-2.5 text-xs font-medium text-fg-subtle">
            {hint}
          </p>
        )}
      </div>
    );
  }

  if (featured) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg",
          GRADIENTS[featured],
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 right-10 h-28 w-28 rounded-full bg-white/10"
        />

        <div className="relative flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-white/85">{label}</p>
          {icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Icon name={icon} size={18} />
            </span>
          )}
        </div>
        <p className="relative mt-4 truncate text-4xl font-bold tracking-tight">
          {value}
        </p>
        {hint && <p className="relative mt-1 text-xs font-medium text-white/80">{hint}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-shadow duration-200 hover:shadow-card",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            TILES[tone],
          )}
        >
          <Icon name={icon} size={22} />
        </span>
      )}

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
          {label}
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-2xl font-bold tracking-tight text-fg">{value}</span>
          {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
