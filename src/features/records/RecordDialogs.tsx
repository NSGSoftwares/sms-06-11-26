import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecords";
import { isAdmin } from "@/lib/permissions";
import { printRecord } from "@/lib/print/printRecord";
import { formatDateTime } from "@/lib/time";
import AttachmentList from "@/components/records/AttachmentList";
import ContentView from "@/components/records/ContentView";
import { Detail, DetailGrid, DetailSection } from "@/components/records/DetailParts";
import ImageLightbox from "@/components/records/ImageLightbox";
import StatusBadge from "@/components/records/StatusBadge";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import { useToast } from "@/components/ui/ToastProvider";
import CallerForm from "@/features/caller/CallerForm";
import SupportForm from "@/features/support/SupportForm";
import type { RecordKind, TaggedRecord } from "@/types";

/** Which record is open. The live record is looked up from the store. */
export interface RecordTarget {
  kind: RecordKind;
  id: string;
}

export interface RecordMessage {
  type: "success" | "error" | "warning";
  message: string;
}

interface RecordDialogsProps {
  target: RecordTarget | null;
  onClose: () => void;
  /** Called after an edit / delete so the page can show a notice. */
  onMessage?: (message: RecordMessage) => void;
}

const KIND_LABEL: Record<RecordKind, string> = {
  support: "Support",
  caller: "Caller",
};

const Inner = ({
  target,
  onClose,
  onMessage,
}: {
  target: RecordTarget;
  onClose: () => void;
  onMessage?: (message: RecordMessage) => void;
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const {
    supportRecords,
    callerRecords,
    loading,
    removeSupportRecord,
    removeCallerRecord,
  } = useRecords();

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const tagged: TaggedRecord | null = useMemo(() => {
    if (target.kind === "support") {
      const record = supportRecords.find((r) => r.id === target.id);
      return record ? { kind: "support", record } : null;
    }
    const record = callerRecords.find((r) => r.id === target.id);
    return record ? { kind: "caller", record } : null;
  }, [target, supportRecords, callerRecords]);

  // The record vanished (e.g. deleted in another tab): close quietly.
  useEffect(() => {
    if (!loading && !tagged) onClose();
  }, [loading, tagged, onClose]);

  if (!tagged) return null;

  const { record } = tagged;
  const canManage = isAdmin(user);
  const label = KIND_LABEL[tagged.kind];

  const handleDelete = async () => {
    setBusy(true);
    try {
      if (tagged.kind === "support") await removeSupportRecord(record.id);
      else await removeCallerRecord(record.id);

      toast.success(`${label} record #${record.id} deleted successfully.`, {
        title: "Record Deleted",
      });
      onMessage?.({
        type: "success",
        message: `${label} record #${record.id} deleted.`,
      });
      onClose();
    } catch (error) {
      setConfirmDelete(false);
      const message = error instanceof Error ? error.message : "Could not delete the record.";
      setActionError(message);
      toast.error(message, { title: "Delete Failed" });
    } finally {
      setBusy(false);
    }
  };

  const handleEdited = () => {
    toast.success(`${label} record #${record.id} updated successfully.`, {
      title: "Record Updated",
    });
    onMessage?.({
      type: "success",
      message: `${label} record #${record.id} updated.`,
    });
    onClose();
  };

  // ------------------------------------------------------------- edit mode
  if (mode === "edit") {
    return (
      <Modal
        title={`Edit ${label} #${record.id}`}
        subtitle={record.date}
        maxWidth="max-w-5xl"
        onClose={() => setMode("view")}
      >
        {tagged.kind === "support" ? (
          <SupportForm
            initial={tagged.record}
            onSaved={handleEdited}
            onCancel={() => setMode("view")}
          />
        ) : (
          <CallerForm
            initial={tagged.record}
            onSaved={handleEdited}
            onCancel={() => setMode("view")}
          />
        )}
      </Modal>
    );
  }

  // ------------------------------------------------------------- view mode
  return (
    <>
      <Modal
        title={`${label} #${record.id}`}
        subtitle={record.date}
        onClose={onClose}
        closeOnOverlay
        footer={
          <>
            <Button
              variant="secondary"
              icon="printer"
              onClick={() => void printRecord(tagged)}
            >
              Print / PDF
            </Button>

            {canManage && (
              <>
                <Button variant="secondary" icon="edit" onClick={() => setMode("edit")}>
                  Edit
                </Button>
                <Button
                  variant="dangerOutline"
                  icon="trash"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              </>
            )}
          </>
        }
      >
        {actionError && (
          <Notice type="error" message={actionError} onClose={() => setActionError(null)} />
        )}

        <DetailGrid>
          <Detail label="Record ID" value={`#${record.id}`} />
          <Detail label="Date" value={record.date} />
          <Detail label="Serial No." value={record.serialNo} />
          <Detail label="Mobile No." value={record.mobileNo} />
          <Detail label="Product" value={record.product} />
          <Detail label="Organization Name" value={record.organizationName || "—"} />

          {tagged.kind === "support" ? (
            <>
              <Detail
                label="License"
                value={
                  <Badge tone={tagged.record.license === "Valid" ? "success" : "danger"}>
                    {tagged.record.license}
                  </Badge>
                }
              />
              <Detail label="Transfer to" value={tagged.record.assistedByName || "—"} />
            </>
          ) : (
            <>
              <Detail label="Product Offer" value={tagged.record.productOffer} />
              <Detail label="Customer Type" value={tagged.record.customerType} />
            </>
          )}

          <Detail label="Start Time" value={record.startTime} />
          <Detail label="End Time" value={record.endTime} />
          <Detail label="Total Duration" value={record.duration} />
          <Detail label="Created By" value={record.createdBy.name} />
          <Detail label="Created At" value={formatDateTime(record.createdAt)} />
          <Detail
            label="Last Updated"
            value={
              record.updatedBy
                ? `${formatDateTime(record.updatedAt)} by ${record.updatedBy.name}`
                : "Not edited"
            }
          />
          <Detail
            label="Status"
            value={
              <div className="flex flex-col items-start gap-1">
                <StatusBadge status={record.status} />
                <span className="text-xs text-fg-subtle">Fixed at submission</span>
              </div>
            }
          />
        </DetailGrid>

        <DetailSection title="Problems">
          <ContentView
            items={record.problems}
            emptyText="No problems recorded."
            onPreview={setPreviewImage}
            attachments={record.attachments}
            context="problem"
          />
        </DetailSection>

        <DetailSection title="Solutions">
          <ContentView
            items={record.solutions}
            emptyText="No solutions recorded."
            onPreview={setPreviewImage}
            attachments={record.attachments}
            context="solution"
          />
        </DetailSection>

        {tagged.kind === "support" && (
          <DetailSection title="Company Support">
            {tagged.record.companySupport ? (
              <div className="space-y-2">
                <Badge tone="success">Required</Badge>
                {tagged.record.remarks?.trim() && <p className="text-sm text-fg-muted">{tagged.record.remarks}</p>}
              </div>
            ) : (
              <Badge>Not Required</Badge>
            )}
          </DetailSection>
        )}

        <DetailSection title="Attachments">
          <AttachmentList
            attachments={record.attachments}
            onPreviewImage={setPreviewImage}
          />
        </DetailSection>

        {record.statusHistory.length > 0 && (
          <DetailSection title="Status History">
            <ol className="space-y-2 border-l-2 border-line pl-4">
              {[...record.statusHistory].reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="text-sm text-fg-muted">
                  <StatusBadge status={entry.status} />
                  <span className="ml-2 text-xs text-fg-subtle">
                    {formatDateTime(entry.at)} · {entry.by.name}
                  </span>
                </li>
              ))}
            </ol>
          </DetailSection>
        )}
      </Modal>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this record?"
          message={
            <>
              {label} record{" "}
              <span className="font-medium text-fg-muted">#{record.id}</span> will be
              permanently deleted. This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          busy={busy}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
};

/** View / edit / delete / print dialogs for one record, shared by every list. */
const RecordDialogs = ({ target, onClose, onMessage }: RecordDialogsProps) => {
  if (!target) return null;

  // key: a different record always starts in "view" mode with a clean state.
  return (
    <Inner
      key={`${target.kind}-${target.id}`}
      target={target}
      onClose={onClose}
      onMessage={onMessage}
    />
  );
};

export default RecordDialogs;
