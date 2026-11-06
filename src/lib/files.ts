import { MAX_ATTACHMENT_BYTES } from "@/config";
import type { AttachmentFile, ContentItem } from "@/types";
import { resolveAttachmentUrl } from "@/services/api";
import { uid } from "./id";
import { toast } from "@/components/ui/ToastProvider";

export const createEmptyItem = (): ContentItem => ({
  id: uid(),
  text: "",
  images: [],
});

/** Keep only entries that actually contain text or at least one image. */
export const cleanItems = (items: ContentItem[]): ContentItem[] =>
  items
    .filter((item) => item.text.trim() !== "" || item.images.length > 0)
    .map((item) => ({ ...item, text: item.text.trim() }));

/** Editing: always show at least one (possibly empty) box. */
export const itemsForEditing = (items: ContentItem[]): ContentItem[] =>
  items.length > 0 ? items.map((i) => ({ ...i })) : [createEmptyItem()];

/** True when any entry holds text or an image. */
export const hasContent = (items: ContentItem[]): boolean =>
  items.some((item) => item.text.trim() !== "" || item.images.length > 0);

export const fileToDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be decoded"));
    img.src = src;
  });

/**
 * Converts a pasted screenshot into a data URL. Large screenshots are scaled
 * down (max 1600px wide) so many of them still fit in browser storage.
 */
export const compressImage = async (
  file: Blob,
  maxWidth = 1600,
  quality = 0.85
): Promise<string> => {
  const original = await fileToDataUrl(file);
  const img = await loadImage(original);

  const scale = Math.min(1, maxWidth / img.width);
  if (scale === 1 && file.size < 400 * 1024) {
    return original; // already small - keep it untouched
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return original;

  // JPEG has no transparency, so paint a white background first.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
};

const ALLOWED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "pdf",
  "txt",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "zip",
];

export const ATTACHMENT_ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

export const isImage = (type: string): boolean => type.startsWith("image/");

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Returns an error message, or null when the file is acceptable. */
export const validateAttachment = (file: File): string | null => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `"${file.name}" is not a supported file type.`;
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `"${file.name}" is larger than ${formatSize(MAX_ATTACHMENT_BYTES)}.`;
  }

  return null;
};

const guessType = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
};

export const readAttachment = async (file: File): Promise<AttachmentFile> => ({
  id: uid(),
  name: file.name,
  type: guessType(file),
  size: file.size,
  dataUrl: await fileToDataUrl(file),
});

/**
 * Opens an attachment: images go to the lightbox (via onPreviewImage), other
 * files (PDF etc.) open in a new browser tab.
 */
export const openAttachment = async (
  attachment: AttachmentFile,
  onPreviewImage: (src: string) => void
): Promise<void> => {
  if (isImage(attachment.type) && attachment.dataUrl.startsWith("data:")) {
    onPreviewImage(attachment.dataUrl);
    return;
  }

  // Open the tab synchronously so popup blockers allow it.
  const tab = isImage(attachment.type) ? null : window.open("about:blank", "_blank");

  try {
    const isLocalData = attachment.dataUrl.startsWith("data:");
    const requestUrl = isLocalData ? attachment.dataUrl : resolveAttachmentUrl(attachment.dataUrl);
    const response = await fetch(requestUrl, {
      headers: !isLocalData && localStorage.getItem("auth_token")
        ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
        : undefined,
    });
    if (!response.ok) throw new Error("Attachment download failed");
    const blob = await response.blob();
    if (isImage(attachment.type)) {
      onPreviewImage(await fileToDataUrl(blob));
      tab?.close();
      return;
    }
    const url = URL.createObjectURL(blob);

    if (tab) {
      tab.location.href = url;
    } else {
      // Popup blocked - fall back to a download.
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      link.click();
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    tab?.close();
    toast.error("This file could not be opened.", { title: "Attachment Error" });
  }
};
