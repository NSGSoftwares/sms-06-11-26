import { useCallback, useEffect, useState, useRef } from "react";
import { getCurrentTime } from "@/lib/time";

export type RestartType = "start" | "end" | null;

interface TimerState {
  startTimestamp: number | null;
  endTimestamp: number | null;
  /** Clock time shown in the form, e.g. "14:32:05" */
  startTime: string;
  endTime: string;
  restarts: number;
}

const EMPTY: TimerState = {
  startTimestamp: null,
  endTimestamp: null,
  startTime: "",
  endTime: "",
  restarts: 0,
};

interface TimerLike {
  startTimestamp: number | null;
  ended: boolean;
  restartSessionNow: () => void;
}

interface Options {
  timer: TimerLike;
  /** false for edit mode, invalid license, etc. */
  enabled: boolean;
  deadlineSeconds: number;
  /** true once the required fields are filled */
  satisfied: boolean;
  onExpire: () => void;
}


export function useEntryDeadline({
  timer,
  enabled,
  deadlineSeconds,
  satisfied,
  onExpire,
}: Options) {
  const metRef = useRef(false);
  const restartRef = useRef(timer.restartSessionNow);
  const expireRef = useRef(onExpire);
  restartRef.current = timer.restartSessionNow;
  expireRef.current = onExpire;

  const start = timer.startTimestamp;

  // New run -> clear the latch; fields satisfied -> remember it for this run
  useEffect(() => {
    metRef.current = false;
  }, [start]);
  useEffect(() => {
    if (!satisfied) {
      metRef.current = false;
      return;
    }
    if (start !== null && Date.now() <= start + deadlineSeconds * 1000) metRef.current = true;
  }, [satisfied, start, deadlineSeconds]);

  useEffect(() => {
    if (!enabled || start === null || metRef.current) return;

    const remaining = start + deadlineSeconds * 1000 - Date.now();
    const id = window.setTimeout(
      () => {
        if (metRef.current) return;
        restartRef.current();
        expireRef.current();
      },
      Math.max(0, remaining),
    );
    return () => window.clearTimeout(id);
  }, [enabled, start, timer.ended, satisfied, deadlineSeconds]);

}

/** Fired on window whenever a persisted timer changes (same tab). */
export const TIMER_EVENT = "sms-timer-changed";

const storageKey = (key: string) => `sms_timer_${key}`;

/** Reads a saved timer (used by the hook and by the live tab badge). */
export const readPersistedTimer = (key: string): TimerState | null => {
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<TimerState>;
    if (typeof parsed.startTimestamp !== "number") return null;

    return {
      startTimestamp: parsed.startTimestamp,
      endTimestamp:
        typeof parsed.endTimestamp === "number" ? parsed.endTimestamp : null,
      startTime: parsed.startTime ?? "",
      endTime: parsed.endTime ?? "",
      restarts: typeof parsed.restarts === "number" ? parsed.restarts : 0,
    };
  } catch {
    return null;
  }
};

const writePersistedTimer = (key: string, state: TimerState) => {
  try {
    if (state.startTimestamp === null) {
      sessionStorage.removeItem(storageKey(key));
    } else {
      sessionStorage.setItem(storageKey(key), JSON.stringify(state));
    }
  } catch {
    // Storage unavailable - the timer just won't survive a refresh.
  }
  window.dispatchEvent(new Event(TIMER_EVENT));
};

/**
 * Start / End timer shared by the Support form and the Caller form.
 *
 *  - Elapsed time is always calculated from timestamps (now - start), never by
 *    adding 1 each second, so it cannot drift.
 *  - The timer is saved per tab (sessionStorage), so a page refresh does not
 *    lose a call that is in progress.
 *  - While a call is running, closing the tab asks for confirmation.
 *
 * @param persistKey unique name for this timer, e.g. "support" or "caller".
 *                   Omit it to disable persistence.
 */
export const useSessionTimer = (persistKey?: string) => {
  const [timer, setTimer] = useState<TimerState>(
    () => (persistKey ? readPersistedTimer(persistKey) : null) ?? EMPTY
  );
  const [now, setNow] = useState(() => Date.now());
  const [restartType, setRestartType] = useState<RestartType>(null);

  const started = timer.startTimestamp !== null;
  const ended = started && timer.endTimestamp !== null;
  const running = started && !ended;

  // Tick once per second while running. Stops as soon as End is clicked.
  useEffect(() => {
    if (!running) return;

    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Save every change so a refresh can pick the call up again.
  useEffect(() => {
    if (persistKey) writePersistedTimer(persistKey, timer);
  }, [persistKey, timer]);

  // Do not lose a running call by accident.
  useEffect(() => {
    if (!running) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [running]);

  const elapsedSeconds =
    timer.startTimestamp === null
      ? 0
      : Math.max(
          0,
          Math.floor(((timer.endTimestamp ?? now) - timer.startTimestamp) / 1000)
        );

  const beginSession = useCallback(() => {
    setNow(Date.now());
    setTimer({
      startTimestamp: Date.now(),
      endTimestamp: null,
      startTime: getCurrentTime(),
      endTime: "",
      restarts: 0
    });
  }, []);

    const restartSessionNow = useCallback(() => {
    setRestartType(null);
    setNow(Date.now());
    setTimer((prev) => ({
      startTimestamp: Date.now(),
      endTimestamp: null,
      startTime: getCurrentTime(),
      endTime: "",
      restarts: (prev.restarts ?? 0) + 1,
    }));
  }, []);

  const finishSession = useCallback(() => {
    setTimer((prev) =>
      prev.startTimestamp === null
        ? prev
        : { ...prev, endTimestamp: Date.now(), endTime: getCurrentTime() }
    );
  }, []);

  const handleStart = useCallback(() => {
    if (timer.startTimestamp === null) {
      beginSession();
    } else {
      setRestartType("start"); // ask before restarting
    }
  }, [timer.startTimestamp, beginSession]);

  const handleEnd = useCallback(() => {
    if (timer.startTimestamp === null) return; // End needs a Start first

    if (timer.endTimestamp === null) {
      finishSession();
    } else {
      setRestartType("end"); // ask before changing the end time
    }
  }, [timer.startTimestamp, timer.endTimestamp, finishSession]);

  const confirmRestart = useCallback(() => {
    if (restartType === "start") {
      if (timer.endTimestamp !== null) beginSession();
      else restartSessionNow();
    }
    if (restartType === "end") finishSession();
    setRestartType(null);
  }, [restartType, timer.endTimestamp, beginSession, restartSessionNow, finishSession]);

  const cancelRestart = useCallback(() => setRestartType(null), []);

  const reset = useCallback(() => {
    setTimer(EMPTY);
    setRestartType(null);
    // Clear storage immediately as the form may navigate/remount before the
    // persistence effect runs. This prevents the next form instance from
    // restoring the just-finished call timer.
    if (persistKey) writePersistedTimer(persistKey, EMPTY);
  }, [persistKey]);

  /** Final duration in seconds, or 0 if the session has not ended. */
  const getFinalDurationSeconds = useCallback((): number => {
    if (timer.startTimestamp === null || timer.endTimestamp === null) return 0;
    return Math.floor((timer.endTimestamp - timer.startTimestamp) / 1000);
  }, [timer.startTimestamp, timer.endTimestamp]);

  return {
    startTimestamp: timer.startTimestamp,
    startTime: timer.startTime,
    endTime: timer.endTime,
    restarts: timer.restarts,
    elapsedSeconds,
    restartType,
    started,
    ended,
    running,
    handleStart,
    restartSessionNow,
    handleEnd,
    confirmRestart,
    cancelRestart,
    reset,
    getFinalDurationSeconds,
  };
};

export type SessionTimer = ReturnType<typeof useSessionTimer>;
