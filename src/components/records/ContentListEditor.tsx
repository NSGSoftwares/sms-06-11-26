import {
  useState,
  type ClipboardEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ContentItem } from "@/types";
import { compressImage, createEmptyItem } from "@/lib/files";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { resolveAttachmentUrl } from "@/services/api";

interface ContentListEditorProps {
  /** Box heading, e.g. "Problem Description" or "Solution" */
  label: string;
  /** Singular word used in placeholders, e.g. "Problem" */
  itemLabel: string;
  addLabel: string;
  items: ContentItem[];
  setItems: Dispatch<SetStateAction<ContentItem[]>>;
  disabled?: boolean;
  onPreview: (src: string) => void;
}

/**
 * Used for BOTH Problems and Solutions (Support form and Caller form).
 * Each entry holds text and any number of pasted screenshots.
 */
const ContentListEditor = ({
  label,
  itemLabel,
  addLabel,
  items,
  setItems,
  disabled = false,
  onPreview,
}: ContentListEditorProps) => {
  const [pasteError, setPasteError] = useState<string | null>(null);

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);

  const updateText = (id: string, text: string) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );

  const removeItem = (id: string) =>
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      // Always keep one empty box so the section never disappears.
      return next.length > 0 ? next : [createEmptyItem()];
    });

  const removeImage = (id: string, imageIndex: number) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, images: item.images.filter((_, i) => i !== imageIndex) }
          : item
      )
    );

  // Ctrl+V handler: if the clipboard holds an image (e.g. a screenshot) it is
  // added to THIS entry; ordinary text pastes behave as normal.
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>, itemId: string) => {
    const clipboardItems: DataTransferItem[] = Array.from(e.clipboardData.items);

    const imageFiles = clipboardItems
      .filter((clipItem) => clipItem.type.startsWith("image/"))
      .map((clipItem) => clipItem.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length === 0) return; // plain text paste

    e.preventDefault();
    setPasteError(null);

    imageFiles.forEach((file) => {
      compressImage(file)
        .then((dataUrl) =>
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, images: [...item.images, dataUrl] }
                : item
            )
          )
        )
        .catch(() => setPasteError("The pasted image could not be read."));
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface-muted p-5",
        disabled && "opacity-50"
      )}
    >
      <p className="mb-3 text-sm font-semibold text-fg">{label}</p>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-lg border border-line-strong bg-surface p-3"
          >
            <div className="flex gap-2">
              <TextArea
                value={item.text}
                disabled={disabled}
                onChange={(e) => updateText(item.id, e.target.value)}
                onPaste={(e) => handlePaste(e, item.id)}
                aria-label={`${itemLabel} ${index + 1}`}
                placeholder={`${itemLabel} ${index + 1} - type text or paste screenshot`}
                rows={3}
                className="min-h-[80px] flex-1 resize-y"
              />

              <Button
                variant="dangerOutline"
                size="sm"
                disabled={disabled}
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                className="self-start"
              >
                ✕
              </Button>
            </div>

            {item.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {item.images.map((image, imageIndex) => (
                  <div key={imageIndex} className="relative">
                    <button
                      type="button"
                      onClick={() => onPreview(resolveAttachmentUrl(image))}
                      aria-label={`Preview screenshot ${imageIndex + 1}`}
                      className="block overflow-hidden rounded-lg border border-line-strong hover:opacity-80"
                    >
                      <img
                        src={resolveAttachmentUrl(image)}
                        alt={`Screenshot ${imageIndex + 1}`}
                        className="h-20 w-28 object-cover"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeImage(item.id, imageIndex)}
                      disabled={disabled}
                      aria-label={`Remove screenshot ${imageIndex + 1}`}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs leading-none text-white shadow hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {pasteError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {pasteError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" size="sm" onClick={addItem} disabled={disabled}>
          {addLabel}
        </Button>
        <span className="text-xs text-fg-subtle">Tip: press Ctrl+V to paste a screenshot</span>
      </div>
    </div>
  );
};

export default ContentListEditor;
