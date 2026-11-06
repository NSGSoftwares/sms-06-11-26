import { formatTimer } from "@/lib/time";
import type { DayBookRow } from "@/services/presenceService";

export const clock12 = (v: string | null): string => {
  if (!v) return "—";
  const m = /(\d{2}):(\d{2}):(\d{2})/.exec(v);
  if (!m) return v;
  const h = Number(m[1]);
  return `${String(h % 12 || 12).padStart(2, "0")}:${m[2]}:${m[3]} ${h >= 12 ? "PM" : "AM"}`;
};

/** Time that counts toward the daily target: support time for support staff, calling time for callers. */
export const workSeconds = (r: DayBookRow): number =>
  r.role === "caller" ? r.callerSeconds : r.supportSeconds;

export const workLabel = (r: DayBookRow): string => (r.role === "caller" ? "Calling" : "Support");

export const pctOfTarget = (r: DayBookRow, target: number): number =>
  target > 0 ? Math.round((workSeconds(r) / target) * 100) : 0;

const HEAD = [
  "Date", "Staff", "First seen", "Last seen", "Online", "Live",
  "Work time", "Idle", "Away", "Restarts", "vs 480 min",
];

const body = (rows: DayBookRow[], target: number): string[][] =>
  rows.map((r) => [
    r.date, r.name, clock12(r.firstSeen), clock12(r.lastSeen),
    formatTimer(r.onlineSeconds), formatTimer(r.liveSeconds),
    formatTimer(workSeconds(r)), formatTimer(r.idleSeconds), formatTimer(r.offlineSeconds),
    String(r.restarts),
    `${pctOfTarget(r, target)}%`,
  ]);

const save = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export interface ExportMeta { from: string; to: string; userLabel: string; target: number }
const base = (m: ExportMeta) => `staff-time-log_${m.from}_${m.to}`;
const NOTE = "Work time = support time for support staff, calling time for callers";

export const exportDayBookCsv = (rows: DayBookRow[], m: ExportMeta) => {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [HEAD, ...body(rows, m.target)].map((r) => r.map(esc).join(",")).join("\r\n");
  save(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${base(m)}.csv`);
};

export const exportDayBookXlsx = async (rows: DayBookRow[], m: ExportMeta) => {
  const XLSX = await import("xlsx");
  const aoa = [
    ["Staff Time Log"],
    [`Period: ${m.from} to ${m.to}`, `Staff: ${m.userLabel}`, `Target: ${m.target / 60} min/day`],
    [NOTE],
    [],
    HEAD,
    ...body(rows, m.target),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = HEAD.map((h, i) => ({ wch: i === 1 ? 24 : Math.max(12, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Time Log");
  XLSX.writeFile(wb, `${base(m)}.xlsx`);
};

export const exportDayBookPdf = async (rows: DayBookRow[], m: ExportMeta) => {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Staff Time Log", 40, 36);
  doc.setFontSize(9);
  doc.text(`Period: ${m.from} to ${m.to}   |   Staff: ${m.userLabel}   |   Target: ${m.target / 60} min/day`, 40, 52);
  doc.text(NOTE, 40, 64);
  autoTable(doc, {
    head: [HEAD],
    body: body(rows, m.target),
    startY: 76,
    styles: { fontSize: 6.5, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(`${base(m)}.pdf`);
};