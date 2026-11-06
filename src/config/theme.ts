export type ThemeMode = "light" | "dark" | "system";
export type Palette =
  | "indigo"
  | "emerald"
  | "violet"
  | "rose"
  | "amber"
  | "cyan"
  | "sunset"
  | "fuchsia"
  | "teal"
  | "slate";

export const THEME_STORAGE_KEY = "sms_theme";

export const PALETTES: readonly { value: Palette; label: string; swatch: string }[] = [
  { value: "indigo", label: "Pulse", swatch: "#0f9687" },
  { value: "emerald", label: "Emerald", swatch: "#059669" },
  { value: "violet", label: "Violet", swatch: "#7c3aed" },
  { value: "rose", label: "Rose", swatch: "#e11d48" },
  { value: "amber", label: "Amber", swatch: "#d97706" },
  { value: "cyan", label: "Cyan", swatch: "#0891b2" },
  { value: "sunset", label: "Sunset", swatch: "#ea580c" },
  { value: "fuchsia", label: "Fuchsia", swatch: "#c026d3" },
  { value: "teal", label: "Teal", swatch: "#0d9488" },
  { value: "slate", label: "Slate", swatch: "#475569" },
];

export const DEFAULT_PALETTE: Palette = "indigo";
export const DEFAULT_MODE: ThemeMode = "system";
