export interface BarSeries {
  name: string;
  /** Any CSS colour, e.g. "rgb(var(--brand))" or "#0ea5e9". */
  color: string;
}

export interface BarDatum {
  label: string;
  /** One value per series (stacked). */
  values: number[];
}

interface BarChartProps {
  data: BarDatum[];
  series: BarSeries[];
  ariaLabel: string;
  height?: number;
}

const W = 640;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 34 };

/** Rounds a maximum up to a tidy axis limit (4, 8, 10, 20, 50...). */
export const niceMax = (max: number): number => {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * pow >= max) ?? 10;
  return Math.ceil((step * pow) / 4) * 4;
};

/** Stacked column chart drawn with plain SVG (no chart library needed). */
const BarChart = ({ data, series, ariaLabel, height = 220 }: BarChartProps) => {
  const plotW = W - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;

  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const yMax = niceMax(Math.max(0, ...totals));
  const ticks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);

  const slot = data.length > 0 ? plotW / data.length : plotW;
  const barW = Math.min(36, slot * 0.62);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  const y = (v: number) => MARGIN.top + plotH - (v / yMax) * plotH;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={W - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 6}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-fg-subtle"
              fontSize={11}
            >
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </text>
          </g>
        ))}

        {data.map((datum, i) => {
          const x = MARGIN.left + slot * i + (slot - barW) / 2;
          let acc = 0;

          return (
            <g key={`${datum.label}-${i}`}>
              <title>
                {datum.label}:{" "}
                {series.map((s, si) => `${datum.values[si] ?? 0} ${s.name}`).join(", ")}
              </title>

              {datum.values.map((value, si) => {
                if (value <= 0) return null;
                const top = y(acc + value);
                const barHeight = y(acc) - top;
                acc += value;

                return (
                  <rect
                    key={series[si]?.name ?? si}
                    x={x}
                    y={top}
                    width={barW}
                    height={barHeight}
                    rx={si === datum.values.length - 1 ? 3 : 0}
                    style={{ fill: series[si]?.color }}
                  />
                );
              })}

              {i % labelEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-fg-subtle"
                  fontSize={11}
                >
                  {datum.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {series.length > 1 && (
        <ul className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-fg-subtle">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BarChart;
