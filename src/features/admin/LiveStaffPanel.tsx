import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SelectInput } from "@/components/ui/Field";
import { formatTimer } from "@/lib/time";
import { listLiveStaff, type LiveStaff, type PresenceStatus } from "@/services/presenceService";

const REFRESH_MS = 1_000;
const ERROR_RETRY_MS = 5_000;
const ORDER: Record<PresenceStatus, number> = { live: 0, online: 1, offline: 2 };
const STYLE: Record<PresenceStatus, { label: string; chip: string; dot: string }> = {
    live: { label: "Live", chip: "bg-rose-500/10 text-rose-600", dot: "bg-rose-500 animate-pulse" },
    online: { label: "Online", chip: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
    offline: { label: "Offline", chip: "bg-slate-500/10 text-slate-500", dot: "bg-slate-400" },
};

type RoleFilter = "support" | "caller" | "all";

const LiveStaffPanel = () => {
    const [staff, setStaff] = useState<LiveStaff[]>([]);
    const [fetchedAt, setFetchedAt] = useState(Date.now());
    const [now, setNow] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("support");
    const inFlight = useRef(false);

    const load = useCallback(async (): Promise<boolean> => {
        if (inFlight.current) return true;
        inFlight.current = true;
        try {
            const data = await listLiveStaff();
            setStaff(data);
            setFetchedAt(Date.now());
            setNow(Date.now());
            setError(null);
            return true;
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not load live staff.");
            return false;
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }, []);

    // Real-time polling: next request is scheduled only after the previous one ends.
    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;

        const tick = async () => {
            let ok = true;
            if (document.visibilityState === "visible") ok = await load();
            if (!cancelled) timer = window.setTimeout(tick, ok ? REFRESH_MS : ERROR_RETRY_MS);
        };

        const onVisible = () => {
            if (document.visibilityState === "visible") void load();
        };

        void tick();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    // Smooth per-second counting between server responses.
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const rows = useMemo(
        () =>
            staff
                .filter((row) => roleFilter === "all" || row.role === roleFilter)
                .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name)),
        [staff, roleFilter],
    );

    const count = (status: PresenceStatus) => rows.filter((row) => row.status === status).length;

    return (
        <section className="relative isolate mb-6 overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-br from-surface via-surface to-brand-soft/25 p-5 shadow-card sm:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
                <div className="absolute -bottom-36 right-1/4 h-64 w-64 rounded-full bg-brand-2/10 blur-3xl" />
                <div className="absolute right-8 top-8 hidden h-36 w-36 rotate-12 rounded-[2rem] border border-brand/10 bg-brand-soft/10 shadow-[inset_0_1px_30px_rgba(255,255,255,0.12)] md:block" />
            </div>

            <div className="relative">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div className="max-w-xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
                            <span className={`h-2 w-2 rounded-full ${error ? "bg-amber-500" : "animate-pulse bg-emerald-500"}`} />
                            Staff presence
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">Live operations</h2>
                        <p className="mt-1 text-sm text-fg-subtle">
                            Monitor active calls and team availability in real time.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${error ? "border-amber-500/20 bg-amber-500/10 text-amber-600" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"}`}
                            title={error ?? `Updated ${new Date(fetchedAt).toLocaleTimeString()}`}
                        >
                            <span className={`h-2 w-2 rounded-full ${error ? "bg-amber-500" : "animate-pulse bg-emerald-500"}`} />
                            {error ? "Reconnecting" : "Real-time"}
                        </span>
                        <div className="w-36">
                            <SelectInput
                                aria-label="Staff type"
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                                className="border-brand/15 bg-surface/80 py-2"
                            >
                                <option value="support">Support</option>
                                <option value="caller">Caller</option>
                                <option value="all">All staff</option>
                            </SelectInput>
                        </div>
                    </div>
                </div>

                {error && <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-700">{error}</p>}

                <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(["live", "online", "offline"] as const).map((status) => (
                        <div key={status} className="flex items-center justify-between rounded-2xl border border-line/80 bg-surface/70 px-4 py-3 shadow-sm backdrop-blur-sm">
                            <div className="flex items-center gap-2.5">
                                <span className={`h-2.5 w-2.5 rounded-full ${STYLE[status].dot}`} />
                                <span className="text-xs font-semibold text-fg-muted">{STYLE[status].label}</span>
                            </div>
                            <span className="font-mono text-lg font-bold tabular-nums text-fg">{count(status)}</span>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <p className="rounded-2xl border border-line bg-surface/60 px-4 py-5 text-sm text-fg-subtle">Loading staff presence…</p>
                ) : rows.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line-strong bg-surface/40 px-4 py-8 text-center text-sm text-fg-subtle">No staff found for this filter.</p>
                ) : (
                    <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {rows.map((row) => {
                            const style = STYLE[row.status];
                            const seconds =
                                row.status === "live" && row.liveSeconds !== null
                                    ? row.liveSeconds + Math.max(0, Math.floor((now - fetchedAt) / 1000))
                                    : null;
                            return (
                                <li key={row.id} className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface/75 p-3.5 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-lg sm:gap-4 sm:p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-sm font-bold uppercase text-brand ring-1 ring-inset ring-brand/15">
                                            {row.status === "live" && <span className="absolute -inset-1 rounded-[1.15rem] border border-rose-500/20 motion-safe:animate-pulse" />}
                                            {row.name.trim().charAt(0) || "?"}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-fg">{row.name}</p>
                                            <p className="mt-0.5 text-xs capitalize text-fg-subtle">{row.role}{row.status === "live" && row.sessionKind ? ` · ${row.sessionKind} session` : ""}</p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                                        {seconds !== null && (
                                            <span className="rounded-lg bg-brand-soft/40 px-2 py-1 font-mono text-xs font-bold tabular-nums text-brand">
                                                {formatTimer(seconds)}
                                            </span>
                                        )}
                                        {row.status === "live" && row.restarts > 0 && (
                                            <span
                                                className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600"
                                                title="Timer restarted because the serial number wasn't entered in time"
                                            >
                                                ↻ {row.restarts}
                                            </span>
                                        )}
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style.chip}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                            {style.label}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
};

export default LiveStaffPanel;