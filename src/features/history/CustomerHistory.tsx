import { useMemo, useState } from "react";
import { HISTORY_MIN_QUERY, SHARE_HISTORY_ACROSS_STAFF } from "@/config";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecords";
import { isAdmin, visibleTo } from "@/lib/permissions";
import { matchesSerialOrMobile } from "@/lib/search";
import { sumSeconds } from "@/lib/stats";
import { formatCompactDuration } from "@/lib/time";
import StatusBadge from "@/components/records/StatusBadge";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Field, TextInput } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import StatCard from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/ToastProvider";
import RecordDialogs, {
  type RecordMessage,
  type RecordTarget,
} from "@/features/records/RecordDialogs";
import type { TaggedRecord } from "@/types";

const excerpt = (entry: TaggedRecord): string => {
  const text = entry.record.problems.find((p) => p.text)?.text ?? "";
  if (!text) return "No problem description recorded.";
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
};

/**
 * Search by mobile number or serial number to see every earlier support and
 * caller interaction for that customer, newest first.
 */
const CustomerHistory = () => {
  const { user } = useAuth();
  const { supportRecords, callerRecords, loading } = useRecords();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<RecordTarget | null>(null);
  const [message, setMessage] = useState<RecordMessage | null>(null);

  const seesEverything = isAdmin(user) || SHARE_HISTORY_ACROSS_STAFF;

  const entries = useMemo<TaggedRecord[]>(() => {
    const support = seesEverything ? supportRecords : visibleTo(user, supportRecords);
    const caller = seesEverything ? callerRecords : visibleTo(user, callerRecords);

    return [
      ...support.map((record): TaggedRecord => ({ kind: "support", record })),
      ...caller.map((record): TaggedRecord => ({ kind: "caller", record })),
    ];
  }, [seesEverything, user, supportRecords, callerRecords]);

  const trimmed = query.trim();
  const ready = trimmed.length >= HISTORY_MIN_QUERY;

  const matches = useMemo(() => {
    if (!ready) return [];

    return entries
      .filter((e) => matchesSerialOrMobile(e.record, trimmed))
      .sort(
        (a, b) =>
          b.record.createdAt.localeCompare(a.record.createdAt) ||
          b.record.id.localeCompare(a.record.id)
      );
  }, [entries, ready, trimmed]);

  const summary = useMemo(() => {
    const records = matches.map((m) => m.record);
    const dates = records.map((r) => r.dateISO).sort();
    const first = matches.find((m) => m.record.dateISO === dates[0]);
    const last = matches.find((m) => m.record.dateISO === dates[dates.length - 1]);

    return {
      support: matches.filter((m) => m.kind === "support").length,
      caller: matches.filter((m) => m.kind === "caller").length,
      seconds: sumSeconds(records),
      serials: [...new Set(records.map((r) => r.serialNo))],
      mobiles: [...new Set(records.map((r) => r.mobileNo))],
      products: [...new Set(records.map((r) => r.product).filter((p) => p !== "-"))],
      firstDate: first?.record.date ?? "-",
      lastDate: last?.record.date ?? "-",
    };
  }, [matches]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-fg">Customer History</h2>
        <p className="mt-1 text-sm text-fg-subtle">
          Find every earlier interaction by mobile number or serial number
        </p>
      </div>

      {message && (
        <Notice type={message.type} message={message.message} onClose={() => setMessage(null)} />
      )}

      {!seesEverything && (
        <Notice
          type="warning"
          message="History is limited to the records you created."
        />
      )}

      <div className="max-w-xl">
        <Field
          label="Mobile or Serial No."
          hint={`Type at least ${HISTORY_MIN_QUERY} characters.`}
        >
          {(control) => (
            <TextInput
              {...control}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 9876543210 or SN-1001"
              autoComplete="off"
            />
          )}
        </Field>
      </div>

      {loading && <p className="mt-6 text-sm text-fg-subtle">Loading records...</p>}

      {!loading && !ready && (
        <div className="mt-6 rounded-xl border border-dashed border-line-strong">
          <EmptyState
            title="Search for a customer"
            message="Enter a mobile number or serial number to see their full history."
          />
        </div>
      )}

      {!loading && ready && matches.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line-strong">
          <EmptyState
            title="No history found"
            message={`Nothing matches “${trimmed}”. Check the number and try again.`}
          />
        </div>
      )}

      {ready && matches.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Interactions"
              value={matches.length}
              hint={`${summary.support} support · ${summary.caller} caller`}
              icon="history"
            />
            <StatCard label="First contact" value={summary.firstDate} icon="clock" tone="info" />
            <StatCard label="Last contact" value={summary.lastDate} icon="clock" tone="success" />
            <StatCard
              label="Total time"
              value={formatCompactDuration(summary.seconds)}
              icon="chart"
              tone="warning"
            />
          </div>

          <Card className="mt-4">
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-fg-subtle">Mobile numbers</dt>
                <dd className="mt-1 font-medium text-fg">{summary.mobiles.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-fg-subtle">Serial numbers</dt>
                <dd className="mt-1 break-words font-medium text-fg">{summary.serials.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-fg-subtle">Products</dt>
                <dd className="mt-1 font-medium text-fg">
                  {summary.products.length > 0 ? summary.products.join(", ") : "-"}
                </dd>
              </div>
            </dl>
          </Card>

          <ol className="mt-6 space-y-3 border-l-2 border-line pl-5">
            {matches.map((entry) => (
              <li key={`${entry.kind}-${entry.record.id}`} className="relative">
                <span
                  className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-surface bg-brand"
                  aria-hidden="true"
                />

                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={entry.kind === "support" ? "brand" : "info"}>
                        {entry.kind === "support" ? "Support" : "Caller"} #{entry.record.id}
                      </Badge>
                      <span className="text-sm font-medium text-fg">{entry.record.date}</span>
                      <StatusBadge status={entry.record.status} />
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon="eye"
                      onClick={() => setTarget({ kind: entry.kind, id: entry.record.id })}
                    >
                      View
                    </Button>
                  </div>

                  <p className="mt-2 text-sm text-fg-muted">{excerpt(entry)}</p>

                  <p className="mt-2 text-xs text-fg-subtle">
                    {entry.record.serialNo} · {entry.record.mobileNo} · {entry.record.product}
                    {entry.record.durationSeconds > 0 && ` · ${entry.record.duration}`}
                    {` · by ${entry.record.createdBy.name}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

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
    </div>
  );
};

export default CustomerHistory;
