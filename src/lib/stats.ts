import { STATUSES } from "@/config";
import type { AnyRecord, CallerRecord, RecordStatus, SupportRecord } from "@/types";
import { formatShortDate, lastDays, todayISO } from "./time";

export interface CountItem {
  label: string;
  value: number;
  color?: string;
}

export interface DayCount {
  /** yyyy-mm-dd */
  date: string;
  /** "09 Oct" */
  label: string;
  support: number;
  caller: number;
  total: number;
}

export interface StaffRow {
  staffId: string;
  staffName: string;
  support: number;
  caller: number;
  total: number;
  totalSeconds: number;
  /** Average over records that have a timed session. */
  avgSeconds: number;
  /** Status Resolved or Self Resolved. */
  resolved: number;
  /** Status Open or In Progress. */
  pending: number;
  invalidLicense: number;
  companySupport: number;
}

export const sumSeconds = (records: { durationSeconds: number }[]): number =>
  records.reduce((sum, r) => sum + r.durationSeconds, 0);

/** Average duration, ignoring records without a timed session (0 seconds). */
export const averageSeconds = (
  records: { durationSeconds: number }[]
): number => {
  const timed = records.filter((r) => r.durationSeconds > 0);
  return timed.length === 0 ? 0 : Math.round(sumSeconds(timed) / timed.length);
};

/** Counts items per key, biggest first. */
export const countBy = <T>(
  items: T[],
  getKey: (item: T) => string
): CountItem[] => {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

/** Records per day for the last `days` days (zero-filled), oldest first. */
export const countByDay = (
  support: SupportRecord[],
  caller: CallerRecord[],
  days: number,
  endISO: string = todayISO()
): DayCount[] => {
  const rows = new Map<string, DayCount>(
    lastDays(days, endISO).map((date) => [
      date,
      { date, label: formatShortDate(date), support: 0, caller: 0, total: 0 },
    ])
  );

  support.forEach((r) => {
    const row = rows.get(r.dateISO);
    if (row) {
      row.support += 1;
      row.total += 1;
    }
  });

  caller.forEach((r) => {
    const row = rows.get(r.dateISO);
    if (row) {
      row.caller += 1;
      row.total += 1;
    }
  });

  return [...rows.values()];
};

const DASHBOARD_STATUSES = new Set<RecordStatus>([
  "resolved",
  "not_resolved",
  "self_resolved",
  "positive",
  "negative",
  "win",
  "lost",
]);

/** Status distribution for the current support, feedback, and lead workflows. */
export const statusBreakdown = (records: AnyRecord[]): CountItem[] =>
  STATUSES.filter((status) => DASHBOARD_STATUSES.has(status.value)).map((s) => ({
    label: s.label,
    value: records.filter((r) => r.status === s.value).length,
    color: s.chart,
  })).filter((item) => item.value > 0);

/** Keeps records whose dateISO is inside [from, to]. Empty bound = open. */
export const filterByDateRange = <T extends { dateISO: string }>(
  records: T[],
  from: string,
  to: string
): T[] =>
  records.filter(
    (r) => (!from || r.dateISO >= from) && (!to || r.dateISO <= to)
  );

/** One row per staff member who created at least one of the given records. */
export const byStaff = (
  support: SupportRecord[],
  caller: CallerRecord[]
): StaffRow[] => {
  const rows = new Map<string, StaffRow>();

  const rowFor = (record: AnyRecord): StaffRow => {
    let row = rows.get(record.createdBy.id);
    if (!row) {
      row = {
        staffId: record.createdBy.id,
        staffName: record.createdBy.name,
        support: 0,
        caller: 0,
        total: 0,
        totalSeconds: 0,
        avgSeconds: 0,
        resolved: 0,
        pending: 0,
        invalidLicense: 0,
        companySupport: 0,
      };
      rows.set(record.createdBy.id, row);
    }
    return row;
  };

  const addCommon = (row: StaffRow, record: AnyRecord) => {
    row.total += 1;
    row.totalSeconds += record.durationSeconds;
    if (record.status === "resolved" || record.status === "self_resolved") {
      row.resolved += 1;
    } else {
      row.pending += 1;
    }
  };

  support.forEach((record) => {
    const row = rowFor(record);
    row.support += 1;
    addCommon(row, record);
    if (record.license === "Invalid") row.invalidLicense += 1;
    if (record.companySupport) row.companySupport += 1;
  });

  caller.forEach((record) => {
    const row = rowFor(record);
    row.caller += 1;
    addCommon(row, record);
  });

  // Average needs the per-staff timed records, so compute it in a second pass.
  const timed = new Map<string, { seconds: number; count: number }>();
  [...support, ...caller].forEach((record) => {
    if (record.durationSeconds <= 0) return;
    const entry = timed.get(record.createdBy.id) ?? { seconds: 0, count: 0 };
    entry.seconds += record.durationSeconds;
    entry.count += 1;
    timed.set(record.createdBy.id, entry);
  });
  rows.forEach((row) => {
    const entry = timed.get(row.staffId);
    row.avgSeconds = entry ? Math.round(entry.seconds / entry.count) : 0;
  });

  return [...rows.values()].sort(
    (a, b) => b.total - a.total || a.staffName.localeCompare(b.staffName)
  );
};
