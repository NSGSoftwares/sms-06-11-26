import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecords";
import { useTokens } from "@/hooks/useTokens";
import Icon from "@/components/ui/Icon";

type Activity = { id: string; text: string; at: number; read: boolean };
const keyFor = (userId: string) => `sms_activity_notifications_${userId}`;
const dismissedKeyFor = (userId: string) => `sms_activity_dismissed_${userId}`;
const browserAlertsKey = (userId: string) => `sms_browser_alerts_${userId}`;
const transferAckKeyFor = (userId: string) => `sms_transfer_acknowledged_${userId}`;
const TRANSFER_REMINDER_INTERVAL = 30_000;

const transferSignature = (record: { updatedAt?: string; createdAt?: string; dateISO?: string }) =>
  String(record.updatedAt || record.createdAt || record.dateISO || "");

const readAcknowledgedTransfers = (userId: string): Record<string, string> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(transferAckKeyFor(userId)) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
};

const readDismissedIds = (userId: string): Set<string> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(dismissedKeyFor(userId)) || "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
};

const readSavedItems = (userId?: string): Activity[] => {
  if (!userId) return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(keyFor(userId)) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string" && typeof item.text === "string") : [];
  } catch {
    return [];
  }
};

const ActivityNotifications = () => {
  const { user } = useAuth();
  const { supportRecords, callerRecords, loading: recordsLoading, error: recordsError, reload } = useRecords();
  const { tokens, loading: tokensLoading } = useTokens();
  const [items, setItems] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previous = useRef<{ records: Map<string, string>; tokens: Map<string, string> } | null>(null);
  const supportRecordsRef = useRef(supportRecords);
  const acknowledgedTransfers = useRef<Record<string, string>>({});
  const reminderProgress = useRef(new Map<string, { signature: string; observedAt: number; count: number }>());
  const unread = useMemo(() => items.filter((item) => !item.read).length, [items]);

  useEffect(() => {
    previous.current = null;
    acknowledgedTransfers.current = user ? readAcknowledgedTransfers(user.id) : {};
    reminderProgress.current.clear();
    setOpen(false);
    setItems(readSavedItems(user?.id));
  }, [user?.id]);

  useEffect(() => {
    supportRecordsRef.current = supportRecords;
  }, [supportRecords]);

  useEffect(() => {
    if (user?.role !== "support") return;
    const refresh = () => {
      void reload();
    };
    const interval = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(interval);
  }, [reload, user?.role]);

  useEffect(() => {
    if (!user || user.role !== "support") return;

    const onPickedUp = (event: Event) => {
      const recordId = (event as CustomEvent<{ recordId?: string }>).detail?.recordId;
      if (!recordId) return;
      const record = supportRecordsRef.current.find((item) => item.id === recordId);
      if (!record) return;
      const next = {
        ...acknowledgedTransfers.current,
        [recordId]: transferSignature(record),
      };
      acknowledgedTransfers.current = next;
      try {
        localStorage.setItem(transferAckKeyFor(user.id), JSON.stringify(next));
      } catch {
        // The current page still stops reminders if storage is unavailable.
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === transferAckKeyFor(user.id)) {
        acknowledgedTransfers.current = readAcknowledgedTransfers(user.id);
      }
    };
    window.addEventListener("sms-transfer-picked-up", onPickedUp);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("sms-transfer-picked-up", onPickedUp);
      window.removeEventListener("storage", onStorage);
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "support") return;
    const checkReminders = () => {
      if (recordsError) return;
      const now = Date.now();
      for (const record of supportRecordsRef.current) {
        if (record.status !== "transferred" || record.assistedById !== user.id) continue;
        const signature = transferSignature(record);
        if (!signature) continue;
        if (acknowledgedTransfers.current[record.id] === signature) continue;

        let progress = reminderProgress.current.get(record.id);
        if (progress?.signature !== signature) {
          progress = { signature, observedAt: now, count: 0 };
          reminderProgress.current.set(record.id, progress);
          continue;
        }
        const count = Math.floor((now - progress.observedAt) / TRANSFER_REMINDER_INTERVAL);
        if (count < 1) continue;
        if (progress.count >= count) continue;
        reminderProgress.current.set(record.id, { ...progress, count });

        const reminderId = `transfer-reminder-${record.id}-${count}`;
        const text = `Transferred support #${record.id} for ${record.customerName || record.mobileNo} still needs your help.`;
        const notification: Activity = { id: reminderId, text, at: now, read: false };
        const dismissedIds = readDismissedIds(user.id);
        if (!dismissedIds.has(reminderId)) {
          setItems((current) => {
            if (current.some((item) => item.id === reminderId)) return current;
            const next = [notification, ...current].slice(0, 50);
            try {
              localStorage.setItem(keyFor(user.id), JSON.stringify(next));
            } catch {
              // The reminder remains visible until the page reloads.
            }
            return next;
          });
        }

        if (localStorage.getItem(browserAlertsKey(user.id)) === "on") {
          window.dispatchEvent(new CustomEvent("sms-activity-notification", {
            detail: { title: "Transferred support needs attention", body: text, tag: reminderId },
          }));
        }
      }
    };
    const interval = window.setInterval(checkReminders, 1_000);
    return () => window.clearInterval(interval);
  }, [recordsError, user]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!user || recordsLoading || tokensLoading) return;
    const records = [...supportRecords, ...callerRecords];
    const recordSnapshot = new Map(records.map((record) => [record.id, String(record.updatedAt || record.dateISO || "")]));
    const tokenSnapshot = new Map(tokens.map((token) => [String(token.id), `${token.progress}:${token.updatedAt || ""}`]));
    const old = previous.current;
    previous.current = { records: recordSnapshot, tokens: tokenSnapshot };
    if (!old) return;

    const additions: Activity[] = [];
    for (const record of records) {
      const value = recordSnapshot.get(record.id)!;
      const kind = record.recordType === "support" ? "Support" : "Caller";
      if (!old.records.has(record.id)) additions.push({ id: `record-${record.id}`, text: `${kind} record created for ${record.customerName}`, at: Date.now(), read: false });
      else if (old.records.get(record.id) !== value) additions.push({ id: `record-update-${record.id}-${value}`, text: `${kind} record updated for ${record.customerName}`, at: Date.now(), read: false });
    }
    for (const token of tokens) {
      const previousState = old.tokens.get(String(token.id));
      const previousProgress = previousState?.split(":", 1)[0];
      const kind = token.kind === "lead" ? "Lead" : "Support";
      const label = `${kind} token ${token.tokenNumber}`;
      if (previousProgress === undefined && token.progress === "pending") {
        additions.push({ id: `token-${token.id}`, text: `${label} is waiting`, at: Date.now(), read: false });
      } else if (previousProgress !== token.progress && token.progress === "ongoing") {
        additions.push({ id: `token-claimed-${token.id}-${token.updatedAt || "ongoing"}`, text: `${label} was claimed for a call`, at: Date.now(), read: false });
      } else if (previousProgress !== token.progress && token.progress === "completed") {
        additions.push({ id: `token-complete-${token.id}-${token.updatedAt || "completed"}`, text: `${label} was completed`, at: Date.now(), read: false });
      }
    }
    const dismissedIds = readDismissedIds(user.id);
    const existingIds = new Set(readSavedItems(user.id).map((item) => item.id));
    const freshAdditions = additions.filter((item) => !dismissedIds.has(item.id) && !existingIds.has(item.id));
    if (freshAdditions.length) {
      const alertsEnabled = localStorage.getItem(browserAlertsKey(user.id)) === "on";
      if (alertsEnabled) {
        const latest = freshAdditions[0];
        window.dispatchEvent(new CustomEvent("sms-activity-notification", {
          detail: { title: "Customer support activity", body: latest.text, tag: latest.id },
        }));
      }
      setItems((current) => {
        const currentIds = new Set(current.map((item) => item.id));
        const next = [...freshAdditions.filter((item) => !currentIds.has(item.id)), ...current].slice(0, 50);
        try { localStorage.setItem(keyFor(user.id), JSON.stringify(next)); } catch { /* Activity remains available until the page reloads. */ }
        return next;
      });
    }
  }, [user, recordsLoading, tokensLoading, supportRecords, callerRecords, tokens]);

  if (!user) return null;
  const save = (next: Activity[]) => {
    setItems(next);
    try { localStorage.setItem(keyFor(user.id), JSON.stringify(next)); } catch { /* Notifications remain usable when storage is unavailable. */ }
  };
  const dismiss = (id: string) => {
    const dismissedIds = readDismissedIds(user.id);
    dismissedIds.add(id);
    try { localStorage.setItem(dismissedKeyFor(user.id), JSON.stringify([...dismissedIds])); } catch { /* The item is still removed for this session. */ }
    save(items.filter((item) => item.id !== id));
  };
  const clear = () => {
    const dismissedIds = readDismissedIds(user.id);
    items.forEach((item) => dismissedIds.add(item.id));
    try { localStorage.setItem(dismissedKeyFor(user.id), JSON.stringify([...dismissedIds])); } catch { /* Clear remains available for this session. */ }
    save([]);
  };

  return <div className="relative" ref={panelRef}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Activity notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg-muted hover:bg-surface-sunken">
      <Icon name="bell" size={17} />
      {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-amber-300 px-1 text-center text-[10px] font-bold leading-4 text-slate-900">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <section className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-xl" aria-label="Activity notifications">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div><h2 className="text-sm font-semibold">Activity</h2><p className="text-xs text-fg-subtle">{unread} unread</p></div>
        <div className="flex gap-3 text-xs"><button type="button" className="text-brand hover:underline" onClick={() => save(items.map((item) => ({ ...item, read: true })))}>Mark all read</button><button type="button" className="text-fg-subtle hover:text-danger" onClick={clear}>Clear</button></div>
      </header>
      <div className="max-h-80 overflow-y-auto">
        {!items.length ? <p className="px-4 py-8 text-center text-sm text-fg-subtle">No activity yet.</p> : items.map((item) => <div key={item.id} className={`flex items-start border-b border-border hover:bg-muted ${item.read ? "opacity-70" : "bg-brand/5"}`}>
          <button type="button" onClick={() => dismiss(item.id)} aria-label={`Dismiss notification: ${item.text}`} className="min-w-0 flex-1 px-4 py-3 text-left">
            <span className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-brand"}`} /><span><span className="block text-sm">{item.text}</span><span className="mt-1 block text-xs text-fg-subtle">{new Date(item.at).toLocaleString()}</span></span></span>
          </button>
          <button type="button" onClick={() => dismiss(item.id)} aria-label={`Remove notification: ${item.text}`} title="Remove notification" className="px-3 py-3 text-fg-subtle hover:text-danger">×</button>
        </div>)}
      </div>
    </section>}
  </div>;
};

export default ActivityNotifications;
