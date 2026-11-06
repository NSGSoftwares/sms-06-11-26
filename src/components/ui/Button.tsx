import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import Icon, { type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "danger" | "dangerOutline" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-brand-fg shadow-sm ring-1 ring-inset ring-white/15 hover:shadow-glow hover:brightness-110 active:scale-[0.98]",
  secondary:
    "border border-line bg-surface text-fg shadow-sm hover:border-line-strong hover:bg-surface-muted active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:shadow-md hover:shadow-rose-600/20 active:scale-[0.98]",
  dangerOutline:
    "border border-rose-500/40 bg-surface text-rose-600 hover:bg-rose-500/10 active:scale-[0.98]",
  ghost: "text-fg-muted hover:bg-surface-sunken hover:text-fg active:scale-[0.98]",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs font-semibold rounded-lg",
  md: "px-4 py-2.5 text-sm font-semibold rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Shows `loadingText` and blocks clicks. */
  loading?: boolean;
  loadingText?: string;
  children?: ReactNode;
}

const Button = ({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  loadingText,
  className,
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center justify-center gap-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...rest}
  >
    {icon && !loading && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
    {loading ? loadingText ?? "Please wait..." : children}
  </button>
);

export default Button;
