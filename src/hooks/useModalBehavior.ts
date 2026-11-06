import { useEffect, useRef, type RefObject } from "react";

// A stack so that Escape only closes the TOP-most dialog (e.g. a confirm
// dialog opened on top of a record dialog) and scrolling stays locked until
// the last one closes.
const stack: symbol[] = [];

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog behaviour: Escape to close (top dialog only), page scroll lock,
 * focus moves into the dialog and returns to the opener, Tab stays inside.
 */
export const useModalBehavior = (
  panelRef: RefObject<HTMLElement>,
  onClose: () => void,
  active = true
): void => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return;

    const id = Symbol("modal");
    stack.push(id);

    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;

      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (items.length === 0) {
          e.preventDefault();
          return;
        }

        const first = items[0];
        const last = items[items.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const index = stack.indexOf(id);
      if (index !== -1) stack.splice(index, 1);
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [active, panelRef]);
};
