import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readPersistedTimer, TIMER_EVENT } from "@/hooks/useSessionTimer";
import { sendHeartbeat } from "@/services/presenceService";

const HEARTBEAT_MS = 15_000;
const WATCH_MS = 3_000;
const TIMER_KEYS = ["support", "caller"] as const;
type TimerKind = (typeof TIMER_KEYS)[number];

interface RunningTimer {
  kind: TimerKind;
  startTimestamp: number;
  restarts: number;
}

const runningTimer = (): RunningTimer | null => {
  for (const key of TIMER_KEYS) {
    const saved = readPersistedTimer(key);
    if (saved && saved.startTimestamp !== null && saved.endTimestamp === null) {
      return { kind: key, startTimestamp: saved.startTimestamp, restarts: saved.restarts ?? 0 };
    }
  }
  return null;
};

/** Online while signed in, "live" while a call timer is running. */
export const usePresenceHeartbeat = (): void => {
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.role;
  const lastSent = useRef("");

  useEffect(() => {
    if (!userId || (role !== "support" && role !== "caller")) return;

    lastSent.current = "";

    const send = (force: boolean) => {
      const timer = runningTimer();
      // A restart changes startTimestamp, so it is sent immediately.
      const signature = timer ? `${timer.kind}:${timer.startTimestamp}` : "idle";
      if (!force && signature === lastSent.current) return;
      lastSent.current = signature;

      void sendHeartbeat({
        live: timer !== null,
        kind: timer?.kind ?? null,
        sessionId: timer?.startTimestamp,
        elapsed: timer ? Math.max(0, Math.floor((Date.now() - timer.startTimestamp) / 1000)) : 0,
        restarts: timer?.restarts ?? 0,
      }).catch((error: unknown) => {
        lastSent.current = "";
        console.error("Presence heartbeat failed; staff status may become stale.", error);
      });
    };

    send(true);
    const beat = window.setInterval(() => send(true), HEARTBEAT_MS);
    const watch = window.setInterval(() => send(false), WATCH_MS);
    const onChange = () => send(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") send(true);
    };
    const onFocus = () => send(true);
    const onOnline = () => send(true);
    const onPageShow = () => send(true);

    window.addEventListener(TIMER_EVENT, onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(beat);
      window.clearInterval(watch);
      window.removeEventListener(TIMER_EVENT, onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, role]);
};