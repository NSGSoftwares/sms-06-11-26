import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canUseTokens } from "@/lib/permissions";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";

const preferenceKey = (userId: string) => `sms_browser_alerts_${userId}`;

const playBeep = async (context: AudioContext) => {
  if (context.state === "closed") return;
  if (context.state !== "running") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }
  if (context.state !== "running") return;

  for (const [frequency, volume] of [[880, 0.12], [1320, 0.06]]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.31);
  }
};

const NotificationToggle = () => {
  const { user } = useAuth();
  const toast = useToast();
  const allowed = canUseTokens(user);
  const [enabled, setEnabled] = useState(false);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    setEnabled(Boolean(user && localStorage.getItem(preferenceKey(user.id)) === "on"));
  }, [user?.id]);

  useEffect(() => {
    if (!allowed || !user || !enabled || audio.current) return;
    const activateAudio = () => {
      try {
        const AudioContextCtor = window.AudioContext;
        if (!AudioContextCtor) return;
        audio.current = new AudioContextCtor();
        void audio.current.resume().catch(() => undefined);
      } catch {
        // Browser notifications remain available if audio is unavailable.
      }
    };
    document.addEventListener("pointerdown", activateAudio, { once: true });
    return () => document.removeEventListener("pointerdown", activateAudio);
  }, [allowed, enabled, user?.id]);

  useEffect(() => {
    if (!allowed || !user || !enabled) return;
    const onActivity = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; body?: string; tag?: string }>).detail ?? {};
      const message = detail.body || "There is new activity in your workspace.";
      toast.warning(message, {
        title: detail.title || "Customer support activity",
        duration: 8000,
      });
      if (audio.current) void playBeep(audio.current);
    };
    window.addEventListener("sms-activity-notification", onActivity);
    return () => window.removeEventListener("sms-activity-notification", onActivity);
  }, [allowed, enabled, toast, user]);

  useEffect(() => () => { void audio.current?.close(); }, []);

  if (!allowed || !user) return null;

  const toggle = async () => {
    if (enabled) {
      setEnabled(false);
      localStorage.setItem(preferenceKey(user.id), "off");
      return;
    }
    try {
      const AudioContextCtor = window.AudioContext;
      if (AudioContextCtor) {
        audio.current = new AudioContextCtor();
        await audio.current.resume();
      }
    } catch {
      // Browser notifications still work if audio is unavailable.
    }
    setEnabled(true);
    localStorage.setItem(preferenceKey(user.id), "on");
    toast.success("In-app reminders and bell sound are enabled.", { title: "Alerts Enabled" });
  };

  return (
    <button type="button" onClick={() => void toggle()} aria-pressed={enabled}
      title={enabled ? "Turn off in-app reminders" : "Turn on in-app reminders"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${enabled ? "border-emerald-500/40 bg-emerald-500/15 text-fg" : "border-line text-fg-muted hover:bg-surface-sunken"}`}>
      <Icon name="bell" size={16} />
      <span className="hidden sm:inline">Alerts {enabled ? "On" : "Off"}</span>
    </button>
  );
};

export default NotificationToggle;
