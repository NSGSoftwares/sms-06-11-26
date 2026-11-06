import {
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AttachmentFile } from "@/types";
import {
  ATTACHMENT_ACCEPT,
  formatSize,
  openAttachment,
  readAttachment,
  validateAttachment,
} from "@/lib/files";
import { cn } from "@/lib/cn";
import Icon from "@/components/ui/Icon";

interface AttachmentPickerProps {
  attachments: AttachmentFile[];
  setAttachments: Dispatch<SetStateAction<AttachmentFile[]>>;
  disabled?: boolean;
  onPreviewImage: (src: string) => void;
}

/** File input with a removable, clickable list of the chosen files. */
const AttachmentPicker = ({
  attachments,
  setAttachments,
  disabled = false,
  onPreviewImage,
}: AttachmentPickerProps) => {
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files: File[] = input.files ? Array.from(input.files) : [];
    input.value = ""; // lets the same file be chosen again later

    const problems: string[] = [];
    const accepted: AttachmentFile[] = [];

    for (const file of files) {
      const problem = validateAttachment(file);

      if (problem) {
        problems.push(problem);
        continue;
      }

      try {
        accepted.push(await readAttachment(file));
      } catch {
        problems.push(`"${file.name}" could not be read.`);
      }
    }

    setErrors(problems);
    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted]);
    }
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((file) => file.id !== id));

  return (
    <div className={cn(disabled && "opacity-50")}>
      <label
        htmlFor="attachment-input"
        className="mb-2 block text-sm font-medium text-fg-muted"
      >
        Attachments
      </label>

      <input
        id="attachment-input"
        type="file"
        name="attachment"
        multiple
        accept={ATTACHMENT_ACCEPT}
        disabled={disabled}
        onChange={(e) => void handleChange(e)}
        className="block w-full rounded-lg border border-line-strong bg-surface text-sm text-fg-muted file:mr-4 file:cursor-pointer file:border-0 file:bg-brand file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-fg hover:file:bg-brand-hover disabled:cursor-not-allowed"
      />

      <p className="mt-1 text-xs text-fg-subtle">
        Images, PDF, Word, Excel, CSV, TXT or ZIP. Up to 5 MB per file.
      </p>

      {errors.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-danger" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-line bg-surface-muted px-3 py-2"
            >
              <button
                type="button"
                onClick={() => void openAttachment(file, onPreviewImage)}
                className="flex min-w-0 items-center gap-2 text-left text-sm text-fg-muted hover:text-fg hover:underline"
                title="Click to open"
              >
                <Icon name="paperclip" size={15} className="shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-fg-subtle">
                  ({formatSize(file.size)})
                </span>
              </button>

              <button
                type="button"
                onClick={() => removeAttachment(file.id)}
                disabled={disabled}
                className="ml-3 shrink-0 text-sm font-medium text-danger hover:underline disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentPicker;
