// File: src/components/timer/TimerParts.tsx
import { Fragment, useEffect, useRef, useState } from "react";
import type { FC } from "react";
import type { SessionTimer } from "@/hooks/useSessionTimer";
import { readPersistedTimer, TIMER_EVENT } from "@/hooks/useSessionTimer";
import { formatDuration, formatTimer } from "@/lib/time";

type Phase = "pending" | "running" | "ended";

/** "13:05:09" → "01:05:09 PM". Values that already carry AM/PM pass through unchanged. */
const to12Hour = (value?: string | null): string => {
  if (!value) return "—";
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return value;
  const h = Number(m[1]) % 24;
  const h12 = String(h % 12 || 12).padStart(2, "0");
  return `${h12}:${m[2]}${m[3] ? `:${m[3]}` : ""} ${h >= 12 ? "PM" : "AM"}`;
};

/* Translucent tones so every state reads well in light and dark themes. */
const TONE: Record<
  Phase,
  { chip: string; chipDot: string; digits: string; needle: string; ring: string; bar: string; trail: string }
> = {
  pending: {
    chip: "bg-slate-500/10 text-slate-600",
    chipDot: "bg-slate-400",
    digits: "text-fg-subtle",
    needle: "bg-slate-400",
    ring: "ring-transparent",
    bar: "bg-slate-300",
    trail: "transparent",
  },
  running: {
    chip: "bg-rose-500/10 text-rose-600",
    chipDot: "bg-rose-500",
    digits: "text-fg",
    needle: "bg-rose-500",
    ring: "ring-rose-500/20",
    bar: "bg-rose-500",
    trail: "rgba(244,63,94,0.30)",
  },
  ended: {
    chip: "bg-emerald-500/10 text-emerald-600",
    chipDot: "bg-emerald-500",
    digits: "text-emerald-600",
    needle: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    bar: "bg-emerald-500",
    trail: "rgba(16,185,129,0.22)",
  },
};

const TICKS = Array.from({ length: 12 }, (_, i) => i);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/** Round stopwatch face: ticks, fading sweep trail and a needle (one turn / 60 s). */
const StopwatchDial = ({ phase, seconds }: { phase: Phase; seconds: number }) => {
  const tone = TONE[phase];
  const running = phase === "running";
  // Target the *next* second while running so the 1s linear transition lands
  // exactly when the next tick arrives (continuous sweep, no stutter).
  const deg = phase === "pending" ? 0 : (seconds + (running ? 1 : 0)) * 6;

  return (
    <div className="relative h-14 w-14 shrink-0" aria-hidden="true">
      {running && (
        <span className="absolute -inset-1 animate-pulse rounded-full bg-rose-500/15 motion-reduce:animate-none" />
      )}
      <div className="relative h-full w-full overflow-hidden rounded-full border border-line bg-surface shadow-inner">
        <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full text-fg-subtle">
          {TICKS.map((i) => (
            <line
              key={i}
              x1="28"
              y1="3.5"
              x2="28"
              y2={i % 3 === 0 ? 7.5 : 6}
              stroke="currentColor"
              strokeWidth={i % 3 === 0 ? 1.4 : 0.9}
              strokeLinecap="round"
              opacity={i % 3 === 0 ? 0.7 : 0.4}
              transform={`rotate(${i * 30} 28 28)`}
            />
          ))}
        </svg>

        <div
          className="absolute inset-0"
          style={{
            transform: `rotate(${deg}deg)`,
            transition: running ? "transform 1s linear" : "none",
          }}
        >
          {phase !== "pending" && (
            <span
              className="absolute inset-[8px] rounded-full"
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg 250deg, ${tone.trail} 360deg)`,
              }}
            />
          )}
          <span
            className={`absolute bottom-1/2 left-1/2 top-[8px] w-[2px] -translate-x-1/2 rounded-full transition-colors duration-300 ${tone.needle}`}
          />
        </div>

        <span
          className={`absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow transition-colors duration-300 ${tone.needle}`}
        />
      </div>
    </div>
  );
};

/** Segmented stopwatch digits; colons pulse while live, empty hours are dimmed. */
const Digits = ({
  value,
  running,
  className = "",
  ariaHidden = false,
}: {
  value: string;
  running: boolean;
  className?: string;
  ariaHidden?: boolean;
}) => {
  const parts = value.split(":");
  return (
    <span
      aria-hidden={ariaHidden || undefined}
      className={`inline-flex items-baseline font-mono text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums ${className}`}
    >
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span
              className={`mx-0.5 -translate-y-0.5 ${running ? "animate-pulse motion-reduce:animate-none" : "opacity-60"
                }`}
            >
              :
            </span>
          )}
          <span className={i === 0 && p === "00" && parts.length > 2 ? "opacity-40" : ""}>{p}</span>
        </Fragment>
      ))}
    </span>
  );
};

const StatusChip = ({ phase }: { phase: Phase }) => {
  const tone = TONE[phase];
  const text = phase === "pending" ? "Ready" : phase === "running" ? "Live" : "Completed";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 ${tone.chip}`}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
        {phase === "running" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75 motion-reduce:animate-none" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone.chipDot}`} />
      </span>
      {text}
    </span>
  );
};

const TimeBlock = ({ label, value }: { label: string; value: string }) => {
  const m = /^(.*?)\s?(AM|PM)$/.exec(value);
  const time = m ? m[1] : value;
  const meridiem = m ? m[2] : "";
  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </span>
      <span
        className={`mt-0.5 whitespace-nowrap text-sm font-semibold tabular-nums ${value === "—" ? "text-fg-subtle" : "text-fg"
          }`}
      >
        {time}
        {meridiem && (
          <span className="ml-1 text-[10px] font-bold tracking-wide text-fg-muted">{meridiem}</span>
        )}
      </span>
    </div>
  );
};

interface TimerBannerProps {
  timer: SessionTimer;
  noun: string;
  hidden?: boolean;
  disabled?: boolean;
  startDisabled?: boolean;
}

/**
 * Sticky stopwatch-style bar: dial + digits, Start/End times and a single
 * Start → End → Done action. Once ended the session is locked (no restart).
 */
export const TimerBanner = ({
  timer,
  noun,
  hidden = false,
  disabled = false,
  startDisabled = false,
}: TimerBannerProps) => {
  // Hooks must run before the early return below.
  const startedAt = useRef(0);

  if (hidden) return null;

  const isPending = !timer.started;
  const isRunning = timer.started && !timer.ended;
  const isEnded = timer.started && timer.ended;
  const phase: Phase = isPending ? "pending" : isRunning ? "running" : "ended";
  const tone = TONE[phase];

  const handleAction = () => {
    if (disabled || (isPending && startDisabled)) return;
    if (isPending) {
      startedAt.current = Date.now();
      timer.handleStart();
    } else if (isRunning) {
      // Swallow a double-click so Start can't instantly turn into End.
      if (Date.now() - startedAt.current < 800) return;
      timer.handleEnd();
    }
    // Ended: locked — no restart.
  };

  const digits = isPending ? formatTimer(0) : formatTimer(timer.elapsedSeconds);

  return (
    <div className="sticky top-[4.75rem] z-30 mb-4 flex justify-center py-1">
      <div
        role="timer"
        aria-live="off"
        className={`relative flex w-full max-w-3xl flex-wrap items-center gap-x-5 gap-y-2.5 overflow-hidden rounded-2xl border border-line bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 shadow-xl ring-1 transition-colors duration-500 ${tone.ring} ${disabled ? "opacity-60" : ""
          }`}
      >
        {/* Accent bar */}
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-0.5 transition-colors duration-500 ${tone.bar} ${isRunning ? "animate-pulse motion-reduce:animate-none" : ""
            }`}
        />

        {/* Dial + label + digits */}
        <div className="order-1 flex items-center gap-3.5">
          <StopwatchDial phase={phase} seconds={timer.elapsedSeconds} />
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
                {isEnded ? `Total ${noun}` : `${noun} Timer`}
              </p>
              <StatusChip phase={phase} />
            </div>
            <Digits
              value={digits}
              running={isRunning}
              ariaHidden={isEnded}
              className={`transition-colors duration-300 ${tone.digits}`}
            />
            {isEnded && <span className="sr-only">{formatDuration(timer.elapsedSeconds)}</span>}
          </div>
        </div>

        {/* Start / End times (hint while pending; hidden on mobile to save space) */}
        {isPending ? (
          <p className="order-2 hidden flex-1 text-center text-xs text-fg-subtle sm:block">
            Press Start when the call begins
          </p>
        ) : (
          <div className="order-3 flex w-full items-center justify-around gap-4 border-t border-line pt-2.5 sm:order-2 sm:w-auto sm:flex-1 sm:justify-center sm:gap-5 sm:border-0 sm:pt-0">
            <TimeBlock label="Start" value={to12Hour(timer.startTime)} />
            <span className="text-fg-subtle" aria-hidden="true">
              <ChevronIcon />
            </span>
            <TimeBlock label="End" value={to12Hour(timer.endTime)} />
          </div>
        )}

        {/* Single action: Start → End → Done (locked) */}
        <div className="order-2 ml-auto sm:order-3 sm:ml-0">
          {isEnded ? (
            <span
              className="inline-flex h-9 min-w-[5rem] items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-600"
              title="Session complete"
            >
              <CheckIcon />
              Done
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              disabled={disabled || (isPending && startDisabled)}
              aria-label={isPending ? `Start ${noun} timer` : `End ${noun} timer`}
              className={`inline-flex h-9 min-w-[5rem] items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-bold shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-0 active:scale-[0.97] ${isPending
                ? "bg-brand-gradient text-brand-fg shadow-glow hover:brightness-110 focus:ring-brand/50"
                : "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
                }`}
            >
              {isPending ? <PlayIcon /> : <StopIcon />}
              {isPending ? "Start" : "End"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface TimerFieldsProps {
  timer: SessionTimer;
  disabled?: boolean;
}

/**
 * Start/End now live in the sticky TimerBanner. Kept as a no-op so existing
 * imports and usages keep compiling; remove the usages whenever convenient.
 */
export const TimerFields: FC<TimerFieldsProps> = () => null;

/** Restart is intentionally unsupported. No-op kept for existing usages. */
export const RestartDialog: FC<{ timer: SessionTimer }> = () => null;

export const LiveTimerBadge = ({ persistKey }: { persistKey: string }) => {
  const [, force] = useState(0);

  useEffect(() => {
    const refresh = () => force((n) => n + 1);
    window.addEventListener(TIMER_EVENT, refresh);
    const id = window.setInterval(refresh, 1000);
    return () => {
      window.removeEventListener(TIMER_EVENT, refresh);
      window.clearInterval(id);
    };
  }, []);

  const saved = readPersistedTimer(persistKey);
  if (!saved || saved.endTimestamp !== null || saved.startTimestamp === null) {
    return null;
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - saved.startTimestamp) / 1000)
  );

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
      title="A call is in progress"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
      {formatTimer(seconds)}
    </span>
  );
};
