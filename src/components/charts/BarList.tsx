import type { CountItem } from "@/lib/stats";

interface BarListProps {
  items: CountItem[];
  /** Show at most this many rows (the rest are dropped). */
  limit?: number;
  emptyText?: string;
}

/** Horizontal bars with a value on the right - for rankings and categories. */
const BarList = ({ items, limit = 6, emptyText = "No data yet." }: BarListProps) => {
  const shown = items.slice(0, limit);
  const max = Math.max(1, ...shown.map((i) => i.value));

  if (shown.length === 0) {
    return <p className="py-8 text-center text-sm text-fg-subtle">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {shown.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-fg-muted">{item.label}</span>
            <span className="font-medium text-fg">{item.value}</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${(item.value / max) * 100}%`,
                ...(item.color ? { backgroundColor: item.color } : {}),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

export default BarList;
