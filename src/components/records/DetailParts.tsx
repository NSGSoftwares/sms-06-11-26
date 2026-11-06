import type { ReactNode } from "react";

interface DetailProps {
  label: string;
  value: ReactNode;
}

/** One cell of the bordered detail grid inside a record modal. */
export const Detail = ({ label, value }: DetailProps) => (
  <div className="bg-surface px-4 py-3">
    <p className="text-xs font-medium text-fg-subtle">{label}</p>
    <div className="mt-1 break-words text-sm font-medium text-fg">{value}</div>
  </div>
);

export const DetailGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 md:grid-cols-3">
    {children}
  </div>
);

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

export const DetailSection = ({ title, children }: DetailSectionProps) => (
  <div className="mt-6">
    <h3 className="mb-3 text-sm font-semibold text-fg">{title}</h3>
    {children}
  </div>
);
