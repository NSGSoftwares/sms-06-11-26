import { api } from "./api";

export type PresenceStatus = "live" | "online" | "offline";

export interface LiveStaff {
  id: string;
  name: string;
  username: string;
  role: "support" | "caller";
  status: PresenceStatus;
  sessionKind: "support" | "caller" | null;
  liveSeconds: number | null;
  lastSeenSecondsAgo: number | null;
  restarts: number;
}

export interface HeartbeatPayload {
  live: boolean;
  kind: "support" | "caller" | null;
  sessionId?: number;
  elapsed?: number;
  restarts?: number;
}

const PRESENCE_CLIENT_KEY = "sms_presence_client_id";

export const getPresenceClientId = (): string => {
  let clientId = sessionStorage.getItem(PRESENCE_CLIENT_KEY);
  if (!clientId) {
    clientId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(PRESENCE_CLIENT_KEY, clientId);
  }
  return clientId;
};

export const sendHeartbeat = async (p: HeartbeatPayload): Promise<void> => {
  const res = await api.post("/presence/heartbeat", {
    client_id: getPresenceClientId(),
    live: p.live,
    kind: p.kind,
    session_id: p.sessionId ?? 0,
    elapsed: p.elapsed ?? 0,
    restarts: p.restarts ?? 0,
  });

  if (!res.success || res.data?.recorded === false) {
    throw new Error(res.message || "Presence heartbeat was not recorded.");
  }
};


export interface DayBookRow {
  userId: string;
  name: string;
  role: string;
  date: string;
  firstSeen: string | null;
  lastSeen: string | null;
  onlineSeconds: number;
  liveSeconds: number;
  idleSeconds: number;
  offlineSeconds: number;
  supportSeconds: number;
  callerSeconds: number;
  restarts: number;
}

export interface DayBook {
  from: string;
  to: string;
  today: string;
  targetSeconds: number;
  staff: { id: string; name: string; role: string }[];
  rows: DayBookRow[];
}

export const getStaffDayBook = async (q: {
  from: string;
  to: string;
  userId?: string;
}): Promise<DayBook> => {
  const params = new URLSearchParams({ from: q.from, to: q.to });
  if (q.userId) params.set("user_id", q.userId);

  const res = await api.get(`/presence/daybook?${params.toString()}`);
  const d: any = res.data?.data ?? res.data ?? {};

  return {
    from: String(d.from ?? q.from),
    to: String(d.to ?? q.to),
    today: String(d.today ?? q.to),
    targetSeconds: Number(d.target_seconds) || 28800,
    staff: (d.staff ?? []).map((s: any) => ({
      id: String(s.id),
      name: String(s.name),
      role: String(s.role),
    })),
    rows: (d.rows ?? []).map(
      (r: any): DayBookRow => ({
        userId: String(r.user_id),
        name: String(r.name ?? "Staff"),
        role: String(r.role ?? ""),
        date: String(r.date),
        firstSeen: r.first_seen ?? null,
        lastSeen: r.last_seen ?? null,
        onlineSeconds: Number(r.online_seconds) || 0,
        liveSeconds: Number(r.live_seconds) || 0,
        idleSeconds: Number(r.idle_seconds) || 0,
        offlineSeconds: Number(r.offline_seconds) || 0,
        supportSeconds: Number(r.support_seconds) || 0,
        callerSeconds: Number(r.caller_seconds) || 0,
        restarts: Number(r.restarts) || 0,
      }),
    ),
  };
};

export const listLiveStaff = async (): Promise<LiveStaff[]> => {
  const res = await api.get("/presence/live");
  const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return list.map((row: any) => ({
    id: String(row.id),
    name: String(row.name ?? row.username ?? "Staff"),
    username: String(row.username ?? ""),
    role: row.role === "caller" ? "caller" : "support",
    status: (["live", "online"].includes(row.status) ? row.status : "offline") as PresenceStatus,
    sessionKind: row.session_kind ?? null,
    liveSeconds: row.live_seconds == null ? null : Number(row.live_seconds),
    lastSeenSecondsAgo: row.last_seen_seconds_ago == null ? null : Number(row.last_seen_seconds_ago),
    restarts: Number(row.restarts ?? 0),
  }));
};