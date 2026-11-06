import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

const EmptyState = ({ title, message, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
    <p className="text-sm font-semibold text-fg-muted">{title}</p>
    {message && <p className="mt-1 max-w-sm text-sm text-fg-subtle">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
