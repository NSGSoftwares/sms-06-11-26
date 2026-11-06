import type { ReactNode } from "react";
import { controlClass } from "@/components/ui/Field";

interface FilterBarProps {
  children: ReactNode;
  shown: number;
  total: number;
  active: boolean;
  onClear: () => void;
  noun?: string;
}

/** Card holding the filter inputs + "Showing X of Y" + Clear filters. */
export const FilterBar = ({
  children,
  shown,
  total,
  active,
  onClear,
  noun = "records",
}: FilterBarProps) => (
  <div className="mb-5 rounded-xl border border-line bg-surface-muted p-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {children}
    </div>

    <div className="mt-3 flex items-center justify-between text-xs text-fg-subtle">
      <span aria-live="polite">
        Showing {shown} of {total} {noun}
      </span>

      {active && (
        <button
          type="button"
          onClick={onClear}
          className="font-medium text-brand hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  </div>
);

interface FilterFieldProps {
  label: string;
  children: (props: { id: string; className: string }) => ReactNode;
}

export const FilterField = ({ label, children }: FilterFieldProps) => {
  const id = `filter-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-fg-subtle">
        {label}
      </label>
      {children({ id, className: `${controlClass} py-2` })}
    </div>
  );
};
