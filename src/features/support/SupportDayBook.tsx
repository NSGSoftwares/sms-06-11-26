import { useEffect, useMemo, useState } from "react";
import { STATUSES } from "@/config";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecords";
import { exportTable, supportRecordsTable, type ExportFormat } from "@/lib/export";
import { isAdmin as checkAdmin, visibleSupportTo } from "@/lib/permissions";
import { matchesSerialOrMobile } from "@/lib/search";
import DataTable, { type Column } from "@/components/data-table/DataTable";
import ExportMenu from "@/components/records/ExportMenu";
import { FilterBar, FilterField } from "@/components/records/FilterBar";
import StatusBadge from "@/components/records/StatusBadge";
import ImageLightbox from "@/components/records/ImageLightbox";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import { useToast } from "@/components/ui/ToastProvider";
import { listStaff } from "@/services/userService";
import { resolveAttachmentUrl } from "@/services/api";
import RecordDialogs, {
  type RecordMessage,
  type RecordTarget,
} from "@/features/records/RecordDialogs";
import type { AttachmentFile, SupportRecord } from "@/types";

interface SupportDayBookProps {
  /** When given, a "+ New Support" button is shown and calls this. */
  onNewSupport?: () => void;
  /** Caller action: start a new caller record using this support record. */
  onUseForCaller?: (record: SupportRecord) => void;
}

const Dash = () => <span className="text-fg-subtle">—</span>;

const contentSummary = (items: SupportRecord["problems"]) => {
  const summary = items
    .map((item, index) => {
      const text = item.text.trim() || (item.images.length ? `${item.images.length} screenshot(s)` : "");
      return text ? `${index + 1}. ${text}` : "";
    })
    .filter(Boolean)
    .join(" · ");
  return summary || "—";
};

const SnapshotThumbnail = ({ file, onPreview }: { file: AttachmentFile; onPreview: (src: string) => void }) => {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = useMemo(() => resolveAttachmentUrl(file.dataUrl), [file.dataUrl]);

  return (
    <button
      type="button"
      onClick={() => onPreview(resolvedUrl)}
      title={`Click to preview ${file.name}`}
      aria-label={`Preview ${file.name}`}
      className="group relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line-strong bg-surface-muted transition hover:scale-105 hover:border-brand hover:ring-2 hover:ring-brand/30"
    >
      {!failed && resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={file.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition group-hover:opacity-90"
        />
      ) : (
        <span className="flex flex-col items-center justify-center p-1 text-center text-[10px] leading-tight text-fg-subtle">
          <svg className="mb-0.5 h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="max-w-[56px] truncate">{file.name}</span>
        </span>
      )}
    </button>
  );
};

const ContentSnapshots = ({ items, attachments, context, label, onPreview }: { items: SupportRecord["problems"]; attachments: AttachmentFile[]; context?: "problem" | "solution"; label: string; onPreview: (src: string) => void }) => {
  const files = attachments.filter((file) => (!context || file.context === context) && file.type.startsWith("image/"));
  const known = new Set(files.map((file) => file.dataUrl));
  if (context) items.flatMap((item) => item.images).filter((src) => src && !known.has(src)).forEach((src, index) => files.push({ id: `${context}-inline-${index}`, name: `${label} screenshot ${index + 1}`, type: "image/png", size: 0, dataUrl: src, context }));
  if (!files.length) return <Dash />;
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="flex items-center gap-1.5">
        {files.slice(0, 3).map((file) => <SnapshotThumbnail key={file.id} file={file} onPreview={onPreview} />)}
      </div>
      <Badge>{files.length} {files.length === 1 ? "image" : "images"}</Badge>
    </div>
  );
};

const formatTime12Hour = (value: string | null) => {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value || "—";
  const rawHour = Number(match[1]);
  return `${String(rawHour % 12 || 12).padStart(2, "0")}:${match[2]} ${rawHour >= 12 ? "PM" : "AM"}`;
};

const SELECTABLE_STATUSES = ["resolved", "not_resolved", "self_resolved"];

const SupportDayBook = ({ onNewSupport, onUseForCaller }: SupportDayBookProps) => {
  const { user } = useAuth();
  const { supportRecords, loading, error, changeStatus, editSupportRecord } = useRecords();
  const toast = useToast();

  const [target, setTarget] = useState<RecordTarget | null>(null);
  const [message, setMessage] = useState<RecordMessage | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [productFilter, setProductFilter] = useState("All");
  const [organizationFilter, setOrganizationFilter] = useState("All");
  const [licenseFilter, setLicenseFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [assistedByFilter, setAssistedByFilter] = useState("All");
  const [staffOptions, setStaffOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [staffOptionsError, setStaffOptionsError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isAdmin = checkAdmin(user);

  const handleTransfer = (record: SupportRecord, targetUserId: string) => {
    setStatusUpdatingId(record.id);
    void editSupportRecord(record.id, { assistedById: targetUserId })
      .then((saved) => {
        const text = `Support record #${record.id} transferred to ${saved.assistedByName || "the selected user"}. Status is now Transferred.`;
        toast.success(text, { title: "Transferred" });
        setMessage({ type: "success", message: text });
      })
      .catch((transferError) => {
        const errorMsg = transferError instanceof Error ? transferError.message : "Could not transfer the record.";
        toast.error(errorMsg, { title: "Transfer Failed" });
        setMessage({ type: "error", message: errorMsg });
      })
      .finally(() => setStatusUpdatingId(null));
  };

  const handleStatusChange = (record: SupportRecord, status: string) => {
    setStatusUpdatingId(record.id);
    void changeStatus("support", record.id, status as SupportRecord["status"])
      .then(() => toast.success(`Status updated for record #${record.id}.`, { title: "Status Updated" }))
      .catch((statusError) => {
        const errorMsg = statusError instanceof Error ? statusError.message : "Could not update the status.";
        toast.error(errorMsg, { title: "Status Error" });
        setMessage({ type: "error", message: errorMsg });
      })
      .finally(() => setStatusUpdatingId(null));
  };

  // Admin sees every record, callers can read every support record,
  // and support staff see only the records they created.
  const visibleRecords = useMemo(() => visibleSupportTo(user, supportRecords), [user, supportRecords]);

  const productOptions = useMemo(() => [...new Set(visibleRecords.map((r) => r.product).filter(Boolean))].sort(), [visibleRecords]);
  const organizationOptions = useMemo(() => [...new Set(visibleRecords.map((r) => r.organizationName?.trim()).filter((name): name is string => Boolean(name)))].sort(), [visibleRecords]);
  const licenseOptions = useMemo(() => [...new Set(visibleRecords.map((r) => r.license).filter(Boolean))].sort(), [visibleRecords]);

  useEffect(() => {
    if (!isAdmin && user?.role !== "support") return;
    let active = true;
    void listStaff("support")
      .then((staff) => {
        if (active) setStaffOptions(staff.map(({ id, name }) => ({ id, name })));
      })
      .catch((loadError) => {
        if (active) setStaffOptionsError(loadError instanceof Error ? loadError.message : "Could not load support staff.");
      });
    return () => { active = false; };
  }, [isAdmin, user?.role]);

  const filteredRecords = useMemo(
    () =>
      visibleRecords.filter(
        (r) =>
          (!dateFilter || r.dateISO === dateFilter) &&
          (productFilter === "All" || r.product === productFilter) &&
          (organizationFilter === "All" || r.organizationName?.trim() === organizationFilter) &&
          (licenseFilter === "All" || r.license === licenseFilter) &&
          (statusFilter === "All" || r.status === statusFilter) &&
          (staffFilter === "All" || String(r.createdBy?.id ?? "") === staffFilter) &&
          (assistedByFilter === "All" ||
            (assistedByFilter === "me" && String(r.assistedById ?? "") === String(user?.id ?? "")) ||
            (assistedByFilter === "transferred" && Boolean(r.assistedById)) ||
            (assistedByFilter === "none" && !r.assistedById) ||
            String(r.assistedById ?? "") === assistedByFilter) &&
          (matchesSerialOrMobile(r, search) || [
            r.customerName, r.organizationName, r.product, r.license, r.status,
            r.issueSubject, r.issueDescription, r.resolution, r.remarks,
            r.problems.map((item) => item.text).join(" "),
            r.solutions.map((item) => item.text).join(" "),
            r.attachments.map((item) => item.name).join(" "),
            r.createdBy?.name, r.assistedByName, r.companySupport ? "company support" : "",
          ].join(" ").toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [visibleRecords, dateFilter, productFilter, organizationFilter, licenseFilter, statusFilter, staffFilter, assistedByFilter, search, user?.id],
  );

  const filtersActive =
    dateFilter !== "" ||
    productFilter !== "All" ||
    organizationFilter !== "All" ||
    licenseFilter !== "All" ||
    statusFilter !== "All" ||
    staffFilter !== "All" ||
    assistedByFilter !== "All" ||
    search !== "";

  const clearFilters = () => {
    setDateFilter("");
    setProductFilter("All");
    setOrganizationFilter("All");
    setLicenseFilter("All");
    setStatusFilter("All");
    setStaffFilter("All");
    setAssistedByFilter("All");
    setSearch("");
  };

  const handleExport = (format: ExportFormat) => {
    if (filteredRecords.length === 0) {
      toast.warning("No support records available to export with current filters.", { title: "Export Warning" });
      return;
    }
    try {
      exportTable(format, "support-day-book", "Support Day Book", supportRecordsTable(filteredRecords, isAdmin));
      toast.success(
        `Successfully exported ${filteredRecords.length} support record(s) to ${format.toUpperCase()}.`,
        { title: "Export Completed" },
      );
    } catch {
      toast.error("Support records export failed. Please try again.", { title: "Export Error" });
    }
  };

  const columns: Column<SupportRecord>[] = [
    {
      key: "no",
      header: "#",
      render: (_r, index) => <span className="font-medium text-fg-muted">{index + 1}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortValue: (r) => `${r.dateISO}-${String(r.id).padStart(9, "0")}`,
      render: (r) => <span className="whitespace-nowrap">{r.date}</span>,
    },
    {
      key: "serial",
      header: "Serial No.",
      sortValue: (r) => r.serialNo,
      render: (r) => <span className="whitespace-nowrap font-medium">{r.serialNo}</span>,
    },
    {
      key: "customerName",
      header: "Customer Name",
      sortValue: (record) => record.customerName ?? "",
      render: (record) =>
        record.customerName?.trim() ? <span className="whitespace-nowrap">{record.customerName}</span> : <Dash />,
    },
    {
      key: "organizationName",
      header: "Organization Name",
      sortValue: (record) => record.organizationName ?? "",
      render: (record) =>
        record.organizationName?.trim() ? <span className="whitespace-nowrap">{record.organizationName}</span> : <Dash />,
    },
    {
      key: "mobile",
      header: "Mobile No.",
      sortValue: (r) => r.mobileNo,
      render: (r) => <span className="whitespace-nowrap">{r.mobileNo}</span>,
    },
    { key: "product", header: "Product", sortValue: (r) => r.product, render: (r) => r.product },
    {
      key: "license",
      header: "License",
      sortValue: (r) => r.license,
      render: (r) => <Badge tone={r.license === "Valid" ? "success" : "danger"}>{r.license}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => STATUSES.findIndex((s) => s.value === r.status),
      render: (r) => isAdmin ? (
        <select
          aria-label={`Change status of support record ${r.id}`}
          className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
          value={r.status}
          disabled={statusUpdatingId === r.id}
          onChange={(e) => handleStatusChange(r, e.target.value)}
        >
          {r.status === "transferred" && <option value="transferred" disabled>Transferred</option>}
          {STATUSES.filter((s) => SELECTABLE_STATUSES.includes(s.value)).map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      ) : <StatusBadge status={r.status} />,
    },
    { key: "start", header: "Start", render: (r) => <span className="whitespace-nowrap">{formatTime12Hour(r.startTime)}</span> },
    { key: "end", header: "End", render: (r) => <span className="whitespace-nowrap">{formatTime12Hour(r.endTime)}</span> },
    { key: "problem", header: "Problem Description", sortValue: (r) => r.issueDescription ?? "", render: (r) => <span className="block max-w-xs truncate" title={contentSummary(r.problems)}>{contentSummary(r.problems)}</span> },
    { key: "problemSnapshots", header: "Problem Screenshots", sortValue: (r) => r.attachments.filter((file) => file.context === "problem").length || r.problems.reduce((count, item) => count + item.images.length, 0), render: (r) => <ContentSnapshots items={r.problems} attachments={r.attachments} context="problem" label="Problem" onPreview={setPreviewImage} /> },
    { key: "solution", header: "Solution", sortValue: (r) => r.resolution ?? "", render: (r) => <span className="block max-w-xs truncate" title={contentSummary(r.solutions)}>{contentSummary(r.solutions)}</span> },
    { key: "solutionSnapshots", header: "Solution Screenshots", sortValue: (r) => r.attachments.filter((file) => file.context === "solution").length || r.solutions.reduce((count, item) => count + item.images.length, 0), render: (r) => <ContentSnapshots items={r.solutions} attachments={r.attachments} context="solution" label="Solution" onPreview={setPreviewImage} /> },
    {
      key: "duration",
      header: "Total Duration",
      sortValue: (r) => r.durationSeconds,
      render: (r) => <span className="whitespace-nowrap font-medium">{r.duration}</span>,
    },
    {
      key: "company",
      header: "Company Support",
      align: "center",
      sortValue: (r) => (r.companySupport ? 1 : 0),
      render: (r) =>
        r.companySupport ? <span className="font-medium text-success" aria-label="Required">✓</span> : <Dash />,
    },
    {
      key: "createdBy",
      header: "Created By",
      hidden: !isAdmin,
      sortValue: (r) => r.createdBy.name,
      render: (r) => <span className="whitespace-nowrap">{r.createdBy.name}</span>,
    },
    {
      key: "assistedBy",
      header: "Transfer to",
      sortValue: (r) => r.assistedByName ?? "",
      render: (r) => isAdmin ? (
        <select
          aria-label={`Transfer support record ${r.id} to`}
          className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
          value={r.assistedById ?? ""}
          disabled={statusUpdatingId === r.id}
          onChange={(event) => {
            if (event.target.value) handleTransfer(r, event.target.value);
          }}
        >
          <option value="" disabled>Select user</option>
          {r.assistedById && !staffOptions.some((s) => s.id === r.assistedById) && (
            <option value={r.assistedById}>{r.assistedByName}</option>
          )}
          {staffOptions
            .filter((s) => s.id !== r.createdBy?.id)
            .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : r.assistedByName ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-1 ring-purple-600/20 whitespace-nowrap">
          {r.assistedByName}
        </span>
      ) : <Dash />,
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      render: (r) => {
        const caller = user?.role === "caller";
        const useForLead = caller && r.status === "in_progress";
        const actionLabel = caller
          ? useForLead ? "Use for Lead" : "Use for Feedback"
          : isAdmin ? "Manage" : "View";

        if (caller && r.feedbackCompleted) {
          return <Badge tone="success">Feedback complete</Badge>;
        }

        return (
          <Button
            variant="secondary"
            size="sm"
            icon={caller ? "plus" : "eye"}
            onClick={() => {
              if (caller) {
                onUseForCaller?.(r);
                return;
              }
              setTarget({ kind: "support", id: r.id });
            }}
            aria-label={`${actionLabel} support record ${r.id}`}
          >
            {actionLabel}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">Support Day Book</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            {user?.role === "caller"
              ? "Browse support records and create customer feedback"
              : isAdmin
                ? "All support records created by Support Staff"
                : "Support records created by you"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            onExport={handleExport}
            disabled={filteredRecords.length === 0}
            summary={`${filteredRecords.length} ${filtersActive ? "filtered " : ""}records`}
          />
          {onNewSupport && (
            <Button icon="plus" onClick={onNewSupport}>
              New Support
            </Button>
          )}
        </div>
      </div>

      {message && <Notice type={message.type} message={message.message} onClose={() => setMessage(null)} />}
      {error && <Notice type="error" message={error} />}
      {staffOptionsError && <Notice type="error" message={`Staff filter unavailable: ${staffOptionsError}`} onClose={() => setStaffOptionsError(null)} />}

      <FilterBar shown={filteredRecords.length} total={visibleRecords.length} active={filtersActive} onClear={clearFilters}>
        <FilterField label="Date">
          {(p) => <input {...p} type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />}
        </FilterField>

        <FilterField label="Product">
          {(p) => (
            <select {...p} value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
              <option value="All">All</option>
              {productOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          )}
        </FilterField>

        <FilterField label="Organization">
          {(p) => (
            <select {...p} value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
              <option value="All">All organizations</option>
              {organizationOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          )}
        </FilterField>

        <FilterField label="License">
          {(p) => (
            <select {...p} value={licenseFilter} onChange={(e) => setLicenseFilter(e.target.value)}>
              <option value="All">All</option>
              {licenseOptions.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          )}
        </FilterField>

        <FilterField label="Status">
          {(p) => (
            <select {...p} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="transferred">Transferred</option>
              {STATUSES.filter((s) => SELECTABLE_STATUSES.includes(s.value)).map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}
        </FilterField>

        {isAdmin && (
          <FilterField label="Staff name">
            {(p) => (
              <select {...p} value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
                <option value="All">All staff</option>
                {staffOptions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            )}
          </FilterField>
        )}

        {(isAdmin || user?.role === "support") && (
          <FilterField label="Transfer to">
            {(p) => (
              <select {...p} value={assistedByFilter} onChange={(e) => setAssistedByFilter(e.target.value)}>
                <option value="All">All records</option>
                <option value="me">Transferred to Me</option>
                <option value="transferred">Any Transferred</option>
                <option value="none">Not Transferred</option>
                {staffOptions.map(({ id, name }) => <option key={id} value={id}>Transferred to: {name}</option>)}
              </select>
            )}
          </FilterField>
        )}

        <FilterField label="Search">
          {(p) => (
            <input
              {...p}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Serial, customer, product, or notes..."
            />
          )}
        </FilterField>
      </FilterBar>

      <DataTable
        caption="Support records"
        columns={columns}
        rows={filteredRecords}
        rowKey={(r) => r.id}
        loading={loading}
        minWidth={isAdmin ? "2600px" : "2400px"}
        emptyTitle={visibleRecords.length === 0 ? "No support records yet." : "No records match the current filters."}
        emptyMessage={visibleRecords.length === 0 ? "Saved support records will appear here." : undefined}
      />

      <RecordDialogs
        target={target}
        onClose={() => setTarget(null)}
        onMessage={(msg) => {
          setMessage(msg);
          if (msg.type === "success") {
            toast.success(msg.message, { title: "Record Notice" });
          } else if (msg.type === "warning") {
            toast.warning(msg.message, { title: "Record Warning" });
          } else {
            toast.error(msg.message, { title: "Record Error" });
          }
        }}
      />

      <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};

export default SupportDayBook;