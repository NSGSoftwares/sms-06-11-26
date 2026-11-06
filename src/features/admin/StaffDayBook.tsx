import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import { SelectInput } from "@/components/ui/Field";
import { formatTimer } from "@/lib/time";
import {
    clock12, exportDayBookCsv, exportDayBookPdf, exportDayBookXlsx,
    pctOfTarget, workSeconds,
} from "@/lib/export/staffDayBook";
import { getStaffDayBook, type DayBook } from "@/services/presenceService";

const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };

const INPUT = "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand";
const BTN = "rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover disabled:opacity-50";

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-xl border border-line bg-surface p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
        <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-fg">{value}</p>
        {sub && <p className="text-xs text-fg-subtle">{sub}</p>}
    </div>
);

const StaffDayBook = () => {
    const [from, setFrom] = useState(ymd(new Date()));
    const [to, setTo] = useState(ymd(new Date()));
    const [userId, setUserId] = useState("");
    const [data, setData] = useState<DayBook | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setData(await getStaffDayBook({ from, to, userId: userId || undefined }));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not load the staff time log.");
        } finally {
            setLoading(false);
        }
    }, [from, to, userId]);

    useEffect(() => {
        setLoading(true);
        void load();
    }, [load]);

    // Keep today's numbers fresh.
    useEffect(() => {
        const today = ymd(new Date());
        if (!(from <= today && today <= to)) return;
        const id = window.setInterval(() => {
            if (document.visibilityState === "visible") void load();
        }, 30_000);
        return () => window.clearInterval(id);
    }, [from, to, load]);

    const rows = data?.rows ?? [];
    const target = data?.targetSeconds ?? 28800;
    const isToday = from === to && from === ymd(new Date());

    const totals = useMemo(() => {
        const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
        return {
            online: sum((r) => r.onlineSeconds),
            live: sum((r) => r.liveSeconds),
            support: sum((r) => r.supportSeconds),
            calling: sum((r) => r.callerSeconds),
            activeStaff: new Set(rows.filter((r) => r.onlineSeconds > 0).map((r) => r.userId)).size,
            allStaff: new Set(rows.map((r) => r.userId)).size,
        };
    }, [rows]);

    const userLabel = userId ? data?.staff.find((s) => s.id === userId)?.name ?? "Selected" : "All staff";
    const meta = { from, to, userLabel, target };

    const preset = (f: string, t: string) => { setFrom(f); setTo(t); };

    return (
        <Card
            className="mb-6"
            title={isToday ? "Staff time log · Today" : "Staff time log"}
            subtitle={`Online = signed in · Live = on a call · Target ${target / 60} min/day of work time (support time for support staff, calling time for callers) · admin only`}
            action={
                <div className="flex flex-wrap gap-2">
                    <button className={BTN} disabled={!rows.length} onClick={() => exportDayBookCsv(rows, meta)}>CSV</button>
                    <button className={BTN} disabled={!rows.length} onClick={() => void exportDayBookXlsx(rows, meta)}>Excel</button>
                    <button className={BTN} disabled={!rows.length} onClick={() => void exportDayBookPdf(rows, meta)}>PDF</button>
                </div>
            }
        >
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="text-xs font-semibold text-fg-subtle">
                    From
                    <input type="date" className={`${INPUT} mt-1 block`} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-fg-subtle">
                    To
                    <input type="date" className={`${INPUT} mt-1 block`} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                </label>
                <label className="w-48 text-xs font-semibold text-fg-subtle">
                    Staff
                    <SelectInput aria-label="Staff" value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1 py-1.5">
                        <option value="">All staff</option>
                        {data?.staff.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                    </SelectInput>
                </label>
                <div className="flex gap-2">
                    <button className={BTN} onClick={() => preset(ymd(new Date()), ymd(new Date()))}>Today</button>
                    <button className={BTN} onClick={() => preset(daysAgo(6), ymd(new Date()))}>Last 7 days</button>
                    <button className={BTN} onClick={() => { const n = new Date(); preset(ymd(new Date(n.getFullYear(), n.getMonth(), 1)), ymd(n)); }}>This month</button>
                </div>
            </div>

            {error && <p className="mb-3 text-sm text-danger">{error}</p>}

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <Tile label="Staff active" value={`${totals.activeStaff}/${totals.allStaff}`} />
                <Tile label="Total online" value={formatTimer(totals.online)} />
                <Tile label="Total live" value={formatTimer(totals.live)} />
                <Tile label="Support time" value={formatTimer(totals.support)} />
                <Tile label="Calling time" value={formatTimer(totals.calling)} />
            </div>

            {loading ? (
                <p className="text-sm text-fg-subtle">Loading…</p>
            ) : rows.length === 0 ? (
                <p className="text-sm text-fg-subtle">No activity recorded for this selection.</p>
            ) : (
                <div className="overflow-x-auto">
                    <p className="mb-2 text-xs text-fg-subtle">Scroll horizontally to see all columns.</p>
                    <table className="w-full min-w-[1100px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-line text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                                {["Date", "Staff", "First seen", "Last seen", "Online", "Live", "Work time", "Idle", "Away", "Restarts", `vs ${target / 60} min`].map((h) => (
                                    <th key={h} className="px-2 py-2">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line tabular-nums">
                            {rows.map((r) => {
                                const pct = pctOfTarget(r, target);
                                return (
                                    <tr key={`${r.userId}-${r.date}`}>
                                        <td className="px-2 py-2 whitespace-nowrap">{r.date}</td>
                                        <td className="px-2 py-2 whitespace-nowrap font-medium text-fg">{r.name}</td>
                                        <td className="px-2 py-2 whitespace-nowrap">{clock12(r.firstSeen)}</td>
                                        <td className="px-2 py-2 whitespace-nowrap">{clock12(r.lastSeen)}</td>
                                        <td className="px-2 py-2 font-mono">{formatTimer(r.onlineSeconds)}</td>
                                        <td className="px-2 py-2 font-mono text-rose-600">{formatTimer(r.liveSeconds)}</td>
                                        <td className="px-2 py-2">
                                            <p className="font-mono font-semibold text-fg">{formatTimer(workSeconds(r))}</p>
                                        </td>
                                        <td className="px-2 py-2 font-mono">{formatTimer(r.idleSeconds)}</td>
                                        <td className="px-2 py-2 font-mono text-fg-subtle">{formatTimer(r.offlineSeconds)}</td>
                                        <td className="px-2 py-2">{r.restarts > 0 ? <span className="text-amber-600">↻ {r.restarts}</span> : "—"}</td>
                                        <td className="px-2 py-2">
                                            <div className="flex min-w-24 items-center gap-2">
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-500/15">
                                                    <div
                                                        className={`h-full ${pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>
                                                <span className="whitespace-nowrap text-xs font-semibold">{pct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default StaffDayBook;