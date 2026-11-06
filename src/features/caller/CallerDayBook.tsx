import { useEffect, useMemo, useState } from "react";

import {
  STATUSES,
} from "@/config";

import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecords";

import {
  callerRecordsTable,
  exportTable,
  type ExportFormat,
} from "@/lib/export";

import { isAdmin as checkAdmin } from "@/lib/permissions";

import DataTable, {
  type Column,
} from "@/components/data-table/DataTable";

import ExportMenu from "@/components/records/ExportMenu";

import {
  FilterBar,
  FilterField,
} from "@/components/records/FilterBar";

import StatusBadge from "@/components/records/StatusBadge";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Notice from "@/components/ui/Notice";
import { useToast } from "@/components/ui/ToastProvider";
import ImageLightbox from "@/components/records/ImageLightbox";
import { openAttachment } from "@/lib/files";
import { listStaff } from "@/services/userService";

import RecordDialogs, {
  type RecordMessage,
  type RecordTarget,
} from "@/features/records/RecordDialogs";

import type { CallerRecord } from "@/types";

interface CallerDayBookProps {
  onNewCaller?: () => void;
  onUseForLead?: (record: CallerRecord) => void;
}

const Dash = () => (
  <span className="text-fg-subtle">
    —
  </span>
);

/* -------------------------------------------------------------------------- */
/* TIME                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Convert database TIME value to MM:SS.
 *
 * Examples:
 * 16:32:55 -> 32:55
 * 16:32:57 -> 32:57
 * 00:02:05 -> 02:05
 *
 * The database value itself is NOT changed.
 */
const formatTime12Hour = (
  value: string | null | undefined
): string => {
  const time = String(value ?? "").trim();

  if (!time) return "";

  const match = time.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) return time;

  let hours = Number(match[1]);
  const minutes = match[2];

  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};

/* -------------------------------------------------------------------------- */
/* SEARCH                                                                     */
/* -------------------------------------------------------------------------- */

const matchesCallerSearch = (
  record: CallerRecord,
  search: string
): boolean => {
  const query = String(
    search ?? ""
  )
    .trim()
    .toLowerCase();

  if (!query) {
    return true;
  }

  return [
    record.serialNo,
    record.customerName,
    record.organizationName,
    record.mobileNo,
    record.product,
    record.productOffer,
    record.source,
    record.address,
    record.contactPersonName,
    record.gstNumber,
    record.remarks,
    record.lostReason,
    record.status,
    record.customerType,
    record.attachments.map((attachment) => attachment.name).join(" "),
    record.createdBy?.name,
    record.callerMode === "new_lead" ? "new lead" : "feedback",
  ].some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(query)
  );
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

const CallerDayBook = ({
  onNewCaller,
  onUseForLead,
}: CallerDayBookProps) => {
  const { user } = useAuth();

  const {
    callerRecords,
    loading,
    error,
    changeStatus,
  } = useRecords();
  const toast = useToast();

  const [target, setTarget] =
    useState<RecordTarget | null>(
      null
    );
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [message, setMessage] =
    useState<RecordMessage | null>(
      null
    );

  const [dateFilter, setDateFilter] =
    useState("");

  const [productFilter, setProductFilter] =
    useState("All");

  const [organizationFilter, setOrganizationFilter] = useState("All");

  const [modeFilter, setModeFilter] = useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [staffFilter, setStaffFilter] = useState("All");
  const [staffOptions, setStaffOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [staffOptionsError, setStaffOptionsError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const isAdmin =
    checkAdmin(user);

  /* ------------------------------------------------------------------------ */
  /* VISIBILITY                                                               */
  /* ------------------------------------------------------------------------ */

  const visibleRecords = useMemo(() => {
    if (!user) {
      return [];
    }

    /*
     * Admin:
     * See all caller records.
     */
    if (user.role === "admin") {
      return callerRecords;
    }

    /*
     * Caller:
     * See only own caller records.
     */
    const currentUserId =
      String(user.id);

    return callerRecords.filter(
      (record) =>
        String(
          record.createdBy?.id ??
          ""
        ) === currentUserId
    );
  }, [
    user,
    callerRecords,
  ]);

  const productOptions = useMemo(() => [...new Set(visibleRecords.map((record) => record.product).filter(Boolean))].sort(), [visibleRecords]);
  const organizationOptions = useMemo(() => [...new Set(visibleRecords.map((record) => record.organizationName?.trim()).filter((name): name is string => Boolean(name)))].sort(), [visibleRecords]);
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void listStaff("caller")
      .then((staff) => {
        if (active) setStaffOptions(staff.map(({ id, name }) => ({ id, name })));
      })
      .catch((loadError) => {
        if (active) setStaffOptionsError(loadError instanceof Error ? loadError.message : "Could not load caller staff.");
      });
    return () => { active = false; };
  }, [isAdmin]);
  const statusOptions = STATUSES.filter((status) => modeFilter === "feedback"
    ? ["positive", "negative"].includes(status.value)
    : modeFilter === "new_lead"
      ? ["win", "lost", "not_interested", "in_progress"].includes(status.value)
      : ["positive", "negative", "win", "lost"].includes(status.value));

  /* ------------------------------------------------------------------------ */
  /* FILTERING                                                                */
  /* ------------------------------------------------------------------------ */

  const filteredRecords = useMemo(
    () =>
      visibleRecords.filter(
        (record) =>
          (
            !dateFilter ||
            record.dateISO ===
            dateFilter
          ) &&
          (
            productFilter ===
            "All" ||
            record.product ===
            productFilter
          ) &&
          (organizationFilter === "All" || record.organizationName?.trim() === organizationFilter) &&
          (modeFilter === "All" || (record.callerMode ?? "feedback") === modeFilter) &&
          (staffFilter === "All" || String(record.createdBy?.id ?? "") === staffFilter) &&
          (
            statusFilter ===
            "All" ||
            record.status ===
            statusFilter
          ) &&
          matchesCallerSearch(
            record,
            search
          )
      ),
    [
      visibleRecords,
      dateFilter,
      productFilter,
      organizationFilter,
      modeFilter,
      statusFilter,
      staffFilter,
      search,
    ]
  );

  const filtersActive =
    dateFilter !== "" ||
    productFilter !== "All" ||
    organizationFilter !== "All" ||
    modeFilter !== "All" ||
    statusFilter !== "All" ||
    staffFilter !== "All" ||
    search !== "";

  const clearFilters = () => {
    setDateFilter("");
    setProductFilter("All");
    setOrganizationFilter("All");
    setModeFilter("All");
    setStatusFilter("All");
    setStaffFilter("All");
    setSearch("");
  };

  /* ------------------------------------------------------------------------ */
  /* EXPORT                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleExport = (
    format: ExportFormat
  ) => {
    if (filteredRecords.length === 0) {
      toast.warning("No caller records available to export with current filters.", {
        title: "Export Warning",
      });
      return;
    }
    try {
      exportTable(
        format,
        "caller-day-book",
        "Caller Day Book",
        callerRecordsTable(
          filteredRecords,
          isAdmin
        )
      );
      toast.success(
        `Successfully exported ${filteredRecords.length} caller record(s) to ${format.toUpperCase()}.`,
        { title: "Export Completed" },
      );
    } catch {
      toast.error("Caller records export failed. Please try again.", {
        title: "Export Error",
      });
    }
  };

  /* ------------------------------------------------------------------------ */
  /* TABLE                                                                     */
  /* ------------------------------------------------------------------------ */

  const columns: Column<CallerRecord>[] =
    [
      {
        key: "no",
        header: "#",

        render: (
          _record,
          index
        ) => (
          <span className="font-medium text-fg-muted">
            {index + 1}
          </span>
        ),
      },

      {
        key: "date",
        header: "Date",

        sortValue: (record) =>
          `${record.dateISO}-${record.id}`,

        render: (record) => (
          <span className="whitespace-nowrap">
            {record.date}
          </span>
        ),
      },

      /* -------------------------------------------------------------------- */
      /* SERIAL / CUSTOMER NAME                                               */
      /* -------------------------------------------------------------------- */

      {
        key: "serialNo",
        header: "Serial No.",
        sortValue: (record) => record.serialNo,
        render: (record) => <span className="whitespace-nowrap font-medium">{record.serialNo || <Dash />}</span>,
      },

      {
        key: "customerName",
        header: "Customer Name",
        sortValue: (record) => record.customerName,
        render: (record) => <span className="whitespace-nowrap">{record.customerName || <Dash />}</span>,
      },

      {
        key: "organizationName",
        header: "Organization Name",
        sortValue: (record) => record.organizationName ?? "",
        render: (record) => <span className="whitespace-nowrap">{record.organizationName || <Dash />}</span>,
      },

      /* -------------------------------------------------------------------- */
      /* MOBILE                                                                */
      /* -------------------------------------------------------------------- */

      {
        key: "mobile",
        header: "Mobile No.",

        sortValue: (record) =>
          record.mobileNo,

        render: (record) => (
          <span className="whitespace-nowrap">
            {record.mobileNo || (
              <Dash />
            )}
          </span>
        ),
      },

      /* -------------------------------------------------------------------- */
      /* PRODUCT                                                               */
      /* -------------------------------------------------------------------- */

      {
        key: "product",
        header: "Product",

        sortValue: (record) =>
          record.product,

        render: (record) =>
          record.product || (
            <Dash />
          ),
      },

      /* -------------------------------------------------------------------- */
      /* PRODUCT OFFER                                                         */
      /* -------------------------------------------------------------------- */

      {
        key: "offer",
        header: "Product Offer",

        sortValue: (record) =>
          record.productOffer,

        render: (record) =>
          record.productOffer || (
            <Dash />
          ),
      },

      /* -------------------------------------------------------------------- */
      /* CUSTOMER TYPE                                                         */
      /* -------------------------------------------------------------------- */

      {
        key: "type",
        header: "Customer Type",

        sortValue: (record) =>
          record.customerType,

        render: (record) => (
          <Badge
            tone={
              record.customerType ===
                "New"
                ? "info"
                : "brand"
            }
          >
            {record.customerType ||
              "—"}
          </Badge>
        ),
      },

      { key: "source", header: "Source", sortValue: (record) => record.source, render: (record) => record.source || <Dash /> },

      {
        key: "callerMode",
        header: "Form Type",
        sortValue: (record) => record.callerMode ?? "feedback",
        render: (record) => <Badge tone={record.callerMode === "new_lead" ? "info" : "brand"}>{record.callerMode === "new_lead" ? "New Lead" : "Feedback"}</Badge>,
      },

      { key: "contactPerson", header: "Contact Person", sortValue: (record) => record.contactPersonName ?? "", hidden: modeFilter === "feedback", render: (record) => record.contactPersonName || <Dash /> },
      { key: "address", header: "Address", sortValue: (record) => record.address ?? "", hidden: modeFilter === "feedback", render: (record) => record.address ? <span className="block max-w-xs truncate" title={record.address}>{record.address}</span> : <Dash /> },
      { key: "gst", header: "GST No.", sortValue: (record) => record.gstNumber ?? "", hidden: modeFilter === "feedback", render: (record) => record.gstNumber || <Dash /> },
      { key: "rating", header: "Rating", sortValue: (record) => record.rating ?? 0, hidden: modeFilter === "new_lead", render: (record) => record.rating ? <Badge tone="brand">{record.rating} / 5</Badge> : <Dash /> },
      { key: "note", header: "Note / Lost Reason", sortValue: (record) => `${record.remarks ?? ""} ${record.lostReason ?? ""}`, render: (record) => { const note = [record.remarks, record.lostReason ? `Lost: ${record.lostReason}` : ""].filter(Boolean).join(" · "); return note ? <span className="block max-w-xs truncate" title={note}>{note}</span> : <Dash />; } },

      /* -------------------------------------------------------------------- */
      /* STATUS                                                                */
      /* -------------------------------------------------------------------- */

      {
        key: "status",
        header: "Status",

        sortValue: (record) =>
          STATUSES.findIndex(
            (status) =>
              status.value ===
              record.status
          ),

        render: (record) => isAdmin ? (
          <select
            aria-label={`Change status for caller record ${record.id}`}
            className="rounded-md border border-line bg-surface px-2 py-1 text-sm"
            value={record.status}
            disabled={statusUpdatingId === record.id}
            onChange={(event) => {
              const nextStatus = event.target.value as CallerRecord["status"];
              setStatusUpdatingId(record.id);
              void changeStatus("caller", record.id, nextStatus)
                .then(() => {
                  toast.success(`Status updated for caller record #${record.id}.`, { title: "Status Updated" });
                  setMessage({ type: "success", message: `Status updated for caller record #${record.id}.` });
                })
                .catch((updateError) => {
                  const errorMsg = updateError instanceof Error ? updateError.message : "Could not update status.";
                  toast.error(errorMsg, { title: "Update Failed" });
                  setMessage({ type: "error", message: errorMsg });
                })
                .finally(() => setStatusUpdatingId(null));
            }}
          >
            {STATUSES.filter((status) => (record.callerMode === "new_lead"
              ? ["win", "lost", "not_interested", "in_progress"]
              : ["positive", "negative"]).includes(status.value)).map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
          </select>
        ) : (
          <StatusBadge
            status={
              record.status
            }
          />
        ),
      },

      /* -------------------------------------------------------------------- */
      /* START TIME                                                            */
      /* -------------------------------------------------------------------- */

      {
        key: "start",
        header: "Start",

        render: (record) => {
          const startTime =
            formatTime12Hour(
              record.startTime
            );

          return (
            <span className="whitespace-nowrap font-medium">
              {startTime || (
                <Dash />
              )}
            </span>
          );
        },
      },

      /* -------------------------------------------------------------------- */
      /* END TIME                                                              */
      /* -------------------------------------------------------------------- */

      {
        key: "end",
        header: "End",

        render: (record) => {
          const endTime =
            formatTime12Hour(
              record.endTime
            );

          return (
            <span className="whitespace-nowrap font-medium">
              {endTime || (
                <Dash />
              )}
            </span>
          );
        },
      },

      /* -------------------------------------------------------------------- */
      /* DURATION                                                              */
      /* -------------------------------------------------------------------- */

      {
        key: "duration",
        header: "Total Duration",

        sortValue: (record) =>
          record.durationSeconds,

        render: (record) => (
          <span className="whitespace-nowrap font-medium">
            {record.duration}
          </span>
        ),
      },

      /* -------------------------------------------------------------------- */
      /* ATTACHMENTS                                                           */
      /* -------------------------------------------------------------------- */

      {
        key: "attachments",
        header: "Attachments",
        align: "center",
        hidden: modeFilter === "feedback",

        sortValue: (record) =>
          record.attachments.length,

        render: (record) => record.attachments.length ? (
          <div className="flex min-w-40 flex-col gap-1.5">
            <Badge><Icon name="paperclip" size={12} />{record.attachments.length} {record.attachments.length === 1 ? "File" : "Files"}</Badge>
            <div className="flex max-w-56 flex-col items-start gap-1">
              {record.attachments.map((file) => <button key={file.id} type="button" title={`Open ${file.name}`} onClick={() => void openAttachment(file, setPreviewImage)} className="max-w-full truncate text-left text-xs font-medium text-brand hover:underline">{file.name}</button>)}
            </div>
          </div>
        ) : <Dash />,
      },

      /* -------------------------------------------------------------------- */
      /* CREATED BY                                                            */
      /* -------------------------------------------------------------------- */

      {
        key: "createdBy",
        header: "Created By",
        hidden: !isAdmin,

        sortValue: (record) =>
          record.createdBy
            ?.name ?? "",

        render: (record) => (
          <span className="whitespace-nowrap">
            {record.createdBy
              ?.name || "—"}
          </span>
        ),
      },

      /* -------------------------------------------------------------------- */
      /* ACTION                                                                */
      /* -------------------------------------------------------------------- */

      {
        key: "action",
        header: "Action",
        align: "center",

        render: (record) => {
          const canUseForLead = !isAdmin && record.status === "in_progress";
          return (
            <Button
              variant="secondary"
              size="sm"
              icon={canUseForLead ? "plus" : "eye"}
              onClick={() => {
                if (canUseForLead && onUseForLead) {
                  onUseForLead(record);
                  return;
                }
                setTarget({ kind: "caller", id: record.id });
              }}
              aria-label={`${canUseForLead ? "Use for Lead" : isAdmin ? "Manage" : "View"} caller record ${record.id}`}
            >
              {canUseForLead ? "Use for Lead" : isAdmin ? "Manage" : "View"}
            </Button>
          );
        },
      },
    ];

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">
            Caller Day Book
          </h2>

          <p className="mt-1 text-sm text-fg-subtle">
            {isAdmin
              ? "All records created by Caller Users"
              : "Caller records created by you"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu
            onExport={
              handleExport
            }
            disabled={
              filteredRecords.length ===
              0
            }
            summary={`${filteredRecords.length} ${filtersActive
              ? "filtered "
              : ""
              }records`}
          />

          {onNewCaller && (
            <Button
              icon="plus"
              onClick={
                onNewCaller
              }
            >
              New Caller
            </Button>
          )}
        </div>
      </div>

      {message && (
        <Notice
          type={message.type}
          message={
            message.message
          }
          onClose={() =>
            setMessage(null)
          }
        />
      )}

      {error && (
        <Notice
          type="error"
          message={error}
        />
      )}
      {staffOptionsError && <Notice type="error" message={`Staff filter unavailable: ${staffOptionsError}`} onClose={() => setStaffOptionsError(null)} />}

      <FilterBar
        shown={
          filteredRecords.length
        }
        total={
          visibleRecords.length
        }
        active={filtersActive}
        onClear={
          clearFilters
        }
      >
        <FilterField label="Date">
          {(props) => (
            <input
              {...props}
              type="date"
              value={
                dateFilter
              }
              onChange={(event) =>
                setDateFilter(
                  event.target
                    .value
                )
              }
            />
          )}
        </FilterField>

        <FilterField label="Product">
          {(props) => (
            <select
              {...props}
              value={
                productFilter
              }
              onChange={(event) =>
                setProductFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="All">
                All
              </option>

              {productOptions.map(
                (product) => (
                  <option
                    key={product}
                    value={product}
                  >
                    {product}
                  </option>
                )
              )}
            </select>
          )}
        </FilterField>

        <FilterField label="Organization">
          {(props) => <select {...props} value={organizationFilter} onChange={(event) => setOrganizationFilter(event.target.value)}>
            <option value="All">All organizations</option>
            {organizationOptions.map((organization) => <option key={organization} value={organization}>{organization}</option>)}
          </select>}
        </FilterField>

        <FilterField label="Form Type">
          {(props) => <select {...props} value={modeFilter} onChange={(event) => { setModeFilter(event.target.value); setStatusFilter("All"); }}><option value="All">All</option><option value="feedback">Feedback</option><option value="new_lead">New Lead</option></select>}
        </FilterField>

        <FilterField label="Status">
          {(props) => (
            <select
              {...props}
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="All">
                All
              </option>

              {statusOptions.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {status.label}
                  </option>
                )
              )}
            </select>
          )}
        </FilterField>

        {isAdmin && <FilterField label="Staff name">
          {(props) => <select {...props} value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}>
            <option value="All">All callers</option>
            {staffOptions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select>}
        </FilterField>}

        <FilterField label="Search">
          {(props) => (
            <input
              {...props}
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Serial / Customer / Mobile..."
            />
          )}
        </FilterField>
      </FilterBar>

      <DataTable
        caption="Caller records"
        columns={columns}
        rows={filteredRecords}
        rowKey={(record) =>
          record.id
        }
        loading={loading}
        minWidth={
          isAdmin
          ? "2600px"
            : "2300px"
        }
        emptyTitle={
          visibleRecords.length ===
            0
            ? "No caller records yet."
            : "No records match the current filters."
        }
        emptyMessage={
          visibleRecords.length ===
            0
            ? "Saved caller records will appear here."
            : undefined
        }
      />

      <RecordDialogs
        target={target}
        onClose={() =>
          setTarget(null)
        }
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

export default CallerDayBook;
