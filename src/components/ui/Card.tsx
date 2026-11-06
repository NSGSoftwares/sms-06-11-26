import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  title?: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Bordered elevated panel used for chart blocks, filters and summaries. */
const Card = ({ title, subtitle, action, className, children }: CardProps) => (
  <section
    className={cn(
      "rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6",
      className,
    )}
  >
    {(title || action) && (
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && (
            <h3 className="text-sm font-bold tracking-tight text-fg sm:text-base">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs font-normal text-fg-subtle">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export default Card;
