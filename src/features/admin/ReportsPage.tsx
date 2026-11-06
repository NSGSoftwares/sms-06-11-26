import { useMemo, useState } from "react";
import { useRecords } from "@/hooks/useRecords";
import {
  callerRecordsTable,
  exportTable,
  staffReportTable,
  supportRecordsTable,
  type ExportFormat,
} from "@/lib/export";
import {
  averageSeconds,
  byStaff,
  countByDay,
  filterByDateRange,
  sumSeconds,
  type StaffRow,
} from "@/lib/stats";
import {
  formatCompactDuration,
  parseISODate,
  shiftISODate,
  startOfMonthISO,
  todayISO,
} from "@/lib/time";
import BarChart from "@/components/charts/BarChart";
import DataTable, { type Column } from "@/components/data-table/DataTable";
import ExportMenu from "@/components/records/ExportMenu";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import StatCard from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/ToastProvider";

type TypeFilter = "both" | "support" | "caller";

const MAX_CHART_DAYS = 31;

const dayCount = (from: string, to: string): number =>
  Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000) + 1;

/** Admin report: activity per staff member for any date range. */
const ReportsPage = () => {
  const { supportRecords, callerRecords, loading } = useRecords();
  const toast = useToast();

  const [from, setFrom] = useState(() => shiftISODate(todayISO(), -29));
  const [to, setTo] = useState(() => todayISO());
  const [type, setType] = useState<TypeFilter>("both");
  const [staffId, setStaffId] = useState("all");

  const rangeInvalid = Boolean(from && to && from > to);

  // Everyone who has created at least one record, for the Staff dropdown.
  const staffOptions = useMemo(() => {
    const names = new Map<string, string>();
    [...supportRecords, ...callerRecords].forEach((r) =>
      names.set(r.createdBy.id, r.createdBy.name)
    );
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [supportRecords, callerRecords]);

  const { support, caller } = useMemo(() => {
    if (rangeInvalid) return { support: [], caller: [] };

    const byWho = <T extends { createdBy: { id: string } }>(rows: T[]) =>
      staffId === "all" ? rows : rows.filter((r) => String(r.createdBy.id) === staffId);

    return {
      support:
        type === "caller" ? [] : byWho(filterByDateRange(supportRecords, from, to)),
      caller:
        type === "support" ? [] : byWho(filterByDateRange(callerRecords, from, to)),
    };
  }, [supportRecords, callerRecords, from, to, type, staffId, rangeInvalid]);

  const all = useMemo(() => [...support, ...caller], [support, caller]);
  const staffRows = useMemo(() => byStaff(support, caller), [support, caller]);

  const resolved = all.filter((r) => r.status === "resolved" || r.status === "self_resolved").length;
  const resolvedPct = all.length === 0 ? "—" : `${Math.round((resolved / all.length) * 100)}%`;

  // The chart shows at most the last 31 days of the chosen range.
  const chartDays = Math.min(MAX_CHART_DAYS, Math.max(1, dayCount(from || to, to)));
  const trend = useMemo(
    () => countByDay(support, caller, chartDays, to || todayISO()),
    [support, caller, chartDays, to]
  );

  const setPreset = (preset: "today" | "7" | "30" | "month") => {
    const today = todayISO();
    setTo(today);
    setFrom(
      preset === "today"
        ? today
        : preset === "7"
          ? shiftISODate(today, -6)
          : preset === "30"
            ? shiftISODate(today, -29)
            : startOfMonthISO(today)
    );
  };

  const columns: Column<StaffRow>[] = [
    {
      key: "staff",
      header: "Staff",
      sortValue: (r) => r.staffName,
      render: (r) => <span className="font-medium">{r.staffName}</span>,
    },
    { key: "support", header: "Support", align: "center", sortValue: (r) => r.support, render: (r) => r.support },
    { key: "caller", header: "Caller", align: "center", sortValue: (r) => r.caller, render: (r) => r.caller },
    {
      key: "total",
      header: "Total",
      align: "center",
      sortValue: (r) => r.total,
      render: (r) => <span className="font-semibold">{r.total}</span>,
    },
    { key: "resolved", header: "Resolved", align: "center", sortValue: (r) => r.resolved, render: (r) => r.resolved },
    { key: "pending", header: "Open", align: "center", sortValue: (r) => r.pending, render: (r) => r.pending },
    {
      key: "invalid",
      header: "Invalid Licenses",
      align: "center",
      sortValue: (r) => r.invalidLicense,
      render: (r) => r.invalidLicense,
    },
    {
      key: "company",
      header: "Company Support",
      align: "center",
      sortValue: (r) => r.companySupport,
      render: (r) => r.companySupport,
    },
    {
      key: "time",
      header: "Total Time",
      sortValue: (r) => r.totalSeconds,
      render: (r) => formatCompactDuration(r.totalSeconds),
    },
    {
      key: "avg",
      header: "Avg. Time",
      sortValue: (r) => r.avgSeconds,
      render: (r) => formatCompactDuration(r.avgSeconds),
    },
  ];

  const stamp = `${from || "start"}_to_${to || "today"}`;
  const exportSummary = (format: ExportFormat) => {
    try {
      exportTable(format, `staff-report-${stamp}`, "Staff Report", staffReportTable(staffRows));
      toast.success(`Exported staff summary (${staffRows.length} members) to ${format.toUpperCase()}.`, { title: "Export Completed" });
    } catch {
      toast.error("Failed to export staff report.", { title: "Export Failed" });
    }
  };
  const exportSupport = (format: ExportFormat) => {
    try {
      exportTable(format, `support-records-${stamp}`, "Support Records", supportRecordsTable(support, true));
      toast.success(`Exported ${support.length} support records to ${format.toUpperCase()}.`, { title: "Export Completed" });
    } catch {
      toast.error("Failed to export support records.", { title: "Export Failed" });
    }
  };
  const exportCaller = (format: ExportFormat) => {
    try {
      exportTable(format, `caller-records-${stamp}`, "Caller Records", callerRecordsTable(caller, true));
      toast.success(`Exported ${caller.length} caller records to ${format.toUpperCase()}.`, { title: "Export Completed" });
    } catch {
      toast.error("Failed to export caller records.", { title: "Export Failed" });
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">Reports</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            Staff activity for any date range
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportMenu
            label="Staff summary"
            onExport={exportSummary}
            disabled={staffRows.length === 0}
            summary={`${staffRows.length} staff member${staffRows.length === 1 ? "" : "s"}`}
          />
          {support.length > 0 && (
            <ExportMenu
              label="Support records"
              onExport={exportSupport}
              summary={`${support.length} records in range`}
            />
          )}
          {caller.length > 0 && (
            <ExportMenu
              label="Caller records"
              onExport={exportCaller}
              summary={`${caller.length} records in range`}
            />
          )}
        </div>
      </div>

      <Card className="mb-6 bg-surface-muted">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="From">
            {(control) => (
              <TextInput {...control} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            )}
          </Field>

          <Field label="To">
            {(control) => (
              <TextInput {...control} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            )}
          </Field>

          <Field label="Record type">
            {(control) => (
              <SelectInput {...control} value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
                <option value="both">Support + Caller</option>
                <option value="support">Support only</option>
                <option value="caller">Caller only</option>
              </SelectInput>
            )}
          </Field>

          <Field label="Staff member">
            {(control) => (
              <SelectInput {...control} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="all">All staff</option>
                {staffOptions.map(([id, name]) => (
                  <option key={id} value={String(id)}>
                    {name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-fg-subtle">Quick range:</span>
          <Button variant="secondary" size="sm" onClick={() => setPreset("today")}>Today</Button>
          <Button variant="secondary" size="sm" onClick={() => setPreset("7")}>Last 7 days</Button>
          <Button variant="secondary" size="sm" onClick={() => setPreset("30")}>Last 30 days</Button>
          <Button variant="secondary" size="sm" onClick={() => setPreset("month")}>This month</Button>
        </div>
      </Card>

      {rangeInvalid && (
        <Notice type="error" message="The “From” date must be on or before the “To” date." />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Records" value={all.length} hint="in this range" icon="book" />
        <StatCard label="Total time" value={formatCompactDuration(sumSeconds(all))} icon="clock" tone="info" />
        <StatCard label="Avg. duration" value={formatCompactDuration(averageSeconds(all))} icon="history" tone="warning" />
        <StatCard label="Resolved / Self Resolved" value={resolvedPct} hint={`${resolved} of ${all.length}`} icon="check" tone="success" />
      </div>

      <Card
        className="mt-6"
        title="Records per day"
        subtitle={
          dayCount(from || to, to) > MAX_CHART_DAYS
            ? `Showing the last ${MAX_CHART_DAYS} days of the range`
            : "Within the selected range"
        }
      >
        <BarChart
          ariaLabel="Records per day in the selected range"
          series={[
            { name: "Support", color: "rgb(var(--brand))" },
            { name: "Caller", color: "#0ea5e9" },
          ]}
          data={trend.map((d) => ({ label: d.label, values: [d.support, d.caller] }))}
        />
      </Card>

      <h3 className="mb-3 mt-8 text-base font-semibold text-fg">By staff member</h3>
      <DataTable
        caption="Staff report"
        columns={columns}
        rows={staffRows}
        rowKey={(r) => r.staffId}
        loading={loading}
        minWidth="900px"
        emptyTitle="No records in this range."
        emptyMessage="Try a wider date range or another staff member."
      />
    </div>
  );
};

export default ReportsPage;
