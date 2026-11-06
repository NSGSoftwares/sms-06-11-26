import type { CountItem } from "@/lib/stats";

interface DonutChartProps {
  items: CountItem[];
  ariaLabel: string;
  /** Text under the total in the middle, e.g. "records" */
  centerLabel?: string;
}

const FALLBACK = [
  "rgb(var(--brand))",
  "#0ea5e9",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];

const SIZE = 132;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DonutChart = ({ items, ariaLabel, centerLabel = "total" }: DonutChartProps) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-fg-subtle">No data yet.</p>;
  }

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={ariaLabel}
        className="h-36 w-36 shrink-0"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-surface-sunken"
        />

        {items.map((item, index) => {
          const length = (item.value / total) * CIRCUMFERENCE;
          const segment = (
            <circle
              key={item.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              style={{ stroke: item.color ?? FALLBACK[index % FALLBACK.length] }}
            >
              <title>{`${item.label}: ${item.value}`}</title>
            </circle>
          );
          offset += length;
          return segment;
        })}

        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-fg"
          fontSize={22}
          fontWeight={700}
        >
          {total}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          className="fill-fg-subtle"
          fontSize={10}
        >
          {centerLabel}
        </text>
      </svg>

      <ul className="w-full space-y-2 text-sm">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-fg-muted">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: item.color ?? FALLBACK[index % FALLBACK.length] }}
                aria-hidden="true"
              />
              {item.label}
            </span>
            <span className="font-medium text-fg">
              {item.value}{" "}
              <span className="text-xs font-normal text-fg-subtle">
                ({Math.round((item.value / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonutChart;
