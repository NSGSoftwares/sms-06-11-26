import { useRef } from "react";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { resolveAttachmentUrl } from "@/services/api";

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

/** Full-size image viewer. Click the background, press Esc, or use × to close. */
const ImageLightbox = ({ src, onClose }: ImageLightboxProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehavior(panelRef, onClose, src !== null);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Screenshot preview"
        tabIndex={-1}
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute -right-4 -top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-medium text-slate-700 shadow-lg hover:bg-slate-100"
        >
          ×
        </button>

        <img
          src={resolveAttachmentUrl(src)}
          alt="Screenshot preview"
          className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
};

export default ImageLightbox;
