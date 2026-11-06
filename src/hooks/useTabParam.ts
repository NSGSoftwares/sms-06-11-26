import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps the active tab in the URL (?tab=...). A refresh stays on the same tab
 * and the browser Back button moves between tabs.
 */
export const useTabParam = <T extends string>(
  validTabs: readonly T[],
  fallback: T
): [T, (tab: T) => void] => {
  const [params, setParams] = useSearchParams();

  const raw = params.get("tab");
  const tab = validTabs.includes(raw as T) ? (raw as T) : fallback;

  const setTab = useCallback(
    (next: T) =>
      setParams((prev) => {
        const copy = new URLSearchParams(prev);
        copy.set("tab", next);
        return copy;
      }),
    [setParams]
  );

  return [tab, setTab];
};
