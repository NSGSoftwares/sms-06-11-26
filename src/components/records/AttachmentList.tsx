import type { AttachmentFile } from "@/types";
import { formatSize, openAttachment } from "@/lib/files";
import Icon from "@/components/ui/Icon";

interface AttachmentListProps {
  attachments: AttachmentFile[];
  onPreviewImage: (src: string) => void;
}

/** Read-only attachment list for the detail modals. */
const AttachmentList = ({ attachments, onPreviewImage }: AttachmentListProps) => {
  if (attachments.length === 0) {
    return <p className="text-sm text-fg-subtle">No attachments.</p>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between rounded-lg border border-line bg-surface-muted px-4 py-3"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm text-fg-muted">
            <Icon name="paperclip" size={15} className="shrink-0" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-fg-subtle">
              ({formatSize(file.size)})
            </span>
          </span>

          <button
            type="button"
            onClick={() => void openAttachment(file, onPreviewImage)}
            className="ml-3 shrink-0 text-xs font-medium text-brand hover:underline"
          >
            View
          </button>
        </div>
      ))}
    </div>
  );
};

export default AttachmentList;
