import { useMemo, useState } from "react";
import type { AttachmentFile, ContentItem } from "@/types";
import { resolveAttachmentUrl } from "@/services/api";

interface ContentViewProps {
  items: ContentItem[];
  emptyText: string;
  onPreview: (src: string) => void;
  attachments?: AttachmentFile[];
  context?: "problem" | "solution";
}

const StoredScreenshot = ({ file, index, onPreview }: { file: AttachmentFile; index: number; onPreview: (src: string) => void }) => {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = useMemo(() => resolveAttachmentUrl(file.dataUrl), [file.dataUrl]);

  return (
    <button
      type="button"
      onClick={() => onPreview(resolvedUrl)}
      aria-label={`Open screenshot ${index + 1}`}
      title={file.name}
      className="overflow-hidden rounded-lg border border-line-strong transition hover:opacity-80"
    >
      {!failed && resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={`Screenshot ${index + 1}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-24 w-32 object-cover"
        />
      ) : (
        <span className="flex h-24 w-32 items-center justify-center px-2 text-xs text-fg-subtle">
          {file.name}
        </span>
      )}
    </button>
  );
};

/** Read-only list of problems/solutions with clickable screenshot previews. */
const ContentView = ({ items, emptyText, onPreview, attachments = [], context }: ContentViewProps) => {
  if (items.length === 0) {
    return <p className="text-sm text-fg-subtle">{emptyText}</p>;
  }

  const storedImages = attachments.filter((file) => file.type.startsWith("image/") && (!context || file.context === context));
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm text-fg-muted"
        >
          {item.text ? (
            <p className="whitespace-pre-wrap break-words">
              {index + 1}. {item.text}
            </p>
          ) : (
            <p className="text-fg-subtle">{index + 1}. (image only)</p>
          )}

          {(item.images.length > 0 || storedImages.some((file) => {
            const itemNo = file.name.match(/pasted-screenshot-(\d+)-/i)?.[1];
            return itemNo ? Number(itemNo) === index + 1 : index === 0;
          })) && (
            <div className="mt-3 flex flex-wrap gap-3">
              {(() => {
                const matchedFiles = new Set<string>();
                const inlineImages = item.images.map((image, imageIndex) => {
                  const file = storedImages.find((candidate) => candidate.dataUrl === image);
                  if (file) matchedFiles.add(file.id);
                  return file
                    ? <StoredScreenshot key={file.id} file={file} index={imageIndex} onPreview={onPreview} />
                    : <button key={`${item.id}-inline-${imageIndex}`} type="button" onClick={() => onPreview(image)} aria-label={`Open screenshot ${imageIndex + 1}`} className="overflow-hidden rounded-lg border border-line-strong transition hover:opacity-80"><img src={image} alt={`Screenshot ${imageIndex + 1}`} className="h-24 w-32 object-cover" /></button>;
                });
                const additionalFiles = storedImages.filter((file) => {
                  if (matchedFiles.has(file.id)) return false;
                  const itemNo = file.name.match(/pasted-screenshot-(\d+)-/i)?.[1];
                  return itemNo ? Number(itemNo) === index + 1 : index === 0;
                });
                return <>{inlineImages}{additionalFiles.map((file, imageIndex) => <StoredScreenshot key={file.id} file={file} index={item.images.length + imageIndex} onPreview={onPreview} />)}</>;
              })()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ContentView;
