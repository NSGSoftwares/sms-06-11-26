import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import Icon, { type IconName } from "./Icon";

export interface TabItem<T extends string> {
  key: T;
  label: string;
  icon?: IconName;
  /** Sidebar section title (tabs with the same group sit together). */
  group?: string;
  /** Extra content after the label (e.g. a live timer badge). */
  badge?: ReactNode;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (tab: T) => void;
  label: string;
  /** "pill" = segmented control, "solid" = dark active tab. */
  variant?: "pill" | "solid";
}

/** Accessible tab buttons. Pair with <TabPanel> for the content. */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  label,
  variant = "pill",
}: TabBarProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex w-full flex-wrap gap-1",
        variant === "pill"
          ? "border-b border-line"
          : "rounded-2xl border border-line bg-surface-muted p-1"
      )}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.key}`}
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200",
              variant === "solid" && "rounded-xl py-2",
              selected
                ? variant === "pill"
                  ? "text-brand after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand-gradient"
                  : "bg-brand text-brand-fg shadow-sm"
                : "text-fg-subtle hover:text-fg"
            )}
          >
            {tab.icon && <Icon name={tab.icon} size={16} />}
            {tab.label}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  tab: string;
  active: boolean;
  /** Keep the content mounted (hidden) so form state and timers survive. */
  keepMounted?: boolean;
  children: ReactNode;
}

export const TabPanel = ({ tab, active, keepMounted, children }: TabPanelProps) => {
  if (!active && !keepMounted) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${tab}`}
      aria-labelledby={`tab-${tab}`}
      hidden={!active}
    >
      {children}
    </div>
  );
};
