import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_MODE,
  DEFAULT_PALETTE,
  PALETTES,
  THEME_STORAGE_KEY,
  type Palette,
  type ThemeMode,
} from "@/config/theme";

interface StoredTheme {
  mode: ThemeMode;
  palette: Palette;
}

export interface ThemeContextValue extends StoredTheme {
  /** True when dark colours are actually showing (mode may be "system"). */
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: Palette) => void;
  /** Light <-> dark, ignoring "system". */
  toggleDark: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

const isMode = (v: unknown): v is ThemeMode =>
  v === "light" || v === "dark" || v === "system";

const isPalette = (v: unknown): v is Palette =>
  PALETTES.some((p) => p.value === v);

const readStored = (): StoredTheme => {
  try {
    const parsed = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "{}");
    return {
      mode: isMode(parsed.mode) ? parsed.mode : DEFAULT_MODE,
      palette: isPalette(parsed.palette) ? parsed.palette : DEFAULT_PALETTE,
    };
  } catch {
    return { mode: DEFAULT_MODE, palette: DEFAULT_PALETTE };
  }
};

const systemPrefersDark = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [stored, setStored] = useState<StoredTheme>(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Follow the operating-system setting while mode === "system".
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const isDark = stored.mode === "dark" || (stored.mode === "system" && systemDark);

  // Apply to <html> and remember the choice.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.setAttribute("data-palette", stored.palette);

    const swatch = PALETTES.find((p) => p.value === stored.palette)?.swatch;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", swatch ?? "#4f46e5");

    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage unavailable - the choice just won't persist.
    }
  }, [isDark, stored]);

  const setMode = useCallback(
    (mode: ThemeMode) => setStored((prev) => ({ ...prev, mode })),
    []
  );
  const setPalette = useCallback(
    (palette: Palette) => setStored((prev) => ({ ...prev, palette })),
    []
  );
  const toggleDark = useCallback(
    () => setStored((prev) => ({ ...prev, mode: isDark ? "light" : "dark" })),
    [isDark]
  );

  const value = useMemo(
    () => ({ ...stored, isDark, setMode, setPalette, toggleDark }),
    [stored, isDark, setMode, setPalette, toggleDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
