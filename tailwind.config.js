/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

// All colours are CSS variables (see src/styles/index.css) so that dark mode
// and the colour palettes switch at runtime without touching any component.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: token("brand"),
          hover: token("brand-hover"),
          soft: token("brand-soft"),
          on: token("brand-on-soft"),
          fg: token("brand-fg"),
          2: token("brand-2"),
        },
        surface: {
          DEFAULT: token("surface"),
          muted: token("surface-muted"),
          sunken: token("surface-sunken"),
        },
        line: { DEFAULT: token("line"), strong: token("line-strong") },
        fg: {
          DEFAULT: token("fg"),
          muted: token("fg-muted"),
          subtle: token("fg-subtle"),
        },
        nav: {
          DEFAULT: token("nav"),
          active: token("nav-active"),
          fg: token("nav-fg"),
        },
        success: { DEFAULT: token("success"), soft: token("success-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
        info: { DEFAULT: token("info"), soft: token("info-soft") },
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 1px rgb(var(--shadow) / 0.04), 0 2px 4px rgb(var(--shadow) / 0.04), 0 12px 32px -8px rgb(var(--shadow) / 0.12)",
        pop: "0 24px 64px -12px rgb(var(--shadow) / 0.35), 0 0 0 1px rgb(var(--line) / 0.6)",
        glow: "0 8px 24px -6px rgb(var(--brand) / 0.45)",
      },
    },
  },
  plugins: [],
};
