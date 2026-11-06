import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_LABEL } from "@/config";
import { useAuth } from "@/hooks/useAuth";
import { type TabItem } from "@/components/ui/Tabs";
import Icon from "@/components/ui/Icon";
import { toast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import ThemeMenu from "./ThemeMenu";
import NotificationToggle from "./NotificationToggle";
import ActivityNotifications from "./ActivityNotifications";

/** Brand name shown at the top of the sidebar. */
const APP_BRAND = "SupportPulse";
const DEFAULT_GROUP = "Main menu";

/** Pages made of their own cards sit straight on the canvas (no outer panel). */
const BARE_TABS: readonly string[] = ["dashboard"];

interface DashboardLayoutProps<T extends string> {
  /** Small text under the brand name in the sidebar */
  navTitle: string;
  /** Page heading */
  heading: string;
  subtitle: string;
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  /** Buttons shown in the top bar (e.g. Generate Token). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * The page shell shared by Support, Caller User and Admin:
 * navy sidebar (grouped navigation, user, Logout), a sticky top bar with
 * actions + theme/notifications, then the page heading and content.
 */
function DashboardLayout<T extends string>({
  navTitle,
  heading,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
}: DashboardLayoutProps<T>) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // clears the session + auth state
    toast.info("You have signed out successfully.", { title: "Signed Out" });
    navigate("/login", { replace: true }); // replace: Back can't return here
  };

  const logoutButton = (className: string) => (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      <Icon name="logout" size={16} />
      <span>Logout</span>
    </button>
  );

  const bare = BARE_TABS.includes(activeTab);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      {/* ---------------- Sidebar (top strip on small screens) ---------------- */}
      <aside className="flex min-h-0 flex-col gap-3 bg-nav p-3 text-white lg:sticky lg:top-0 lg:h-screen lg:gap-3 lg:overflow-y-auto lg:p-0">
        <div className="flex items-center justify-between gap-3 lg:shrink-0 lg:border-b lg:border-white/10 lg:px-5 lg:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-brand-fg shadow-glow"
              aria-hidden="true"
            >
              <Icon name="users" size={20} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-bold tracking-tight">
                {APP_BRAND}
              </p>
              <p className="truncate text-xs text-slate-400">{navTitle}</p>
            </div>
          </div>
          {logoutButton("px-3 py-2 lg:hidden")}
        </div>

        <nav
          role="tablist"
          aria-orientation="vertical"
          aria-label={`${heading} sections`}
          className="flex flex-wrap gap-1 lg:min-h-0 lg:flex-1 lg:flex-col lg:flex-nowrap lg:overflow-y-auto lg:px-3 lg:pb-2"
        >
          {tabs.map((tab, index) => {
            const selected = tab.key === activeTab;
            const group = tab.group ?? DEFAULT_GROUP;
            const showGroup = index === 0 || group !== (tabs[index - 1].group ?? DEFAULT_GROUP);

            return (
              <div key={tab.key} className="contents">
                {showGroup && (
                  <p className="hidden px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:pt-1 lg:block">
                    {group}
                  </p>
                )}
                <button
                  type="button"
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.key}`}
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    "group flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors duration-150 lg:py-2.5",
                    selected
                      ? "border-white/10 bg-nav-active text-white"
                      : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {tab.icon && (
                    <Icon
                      name={tab.icon}
                      size={18}
                      className={cn(
                        "shrink-0",
                        selected ? "text-brand-2" : "text-slate-400 group-hover:text-slate-200",
                      )}
                    />
                  )}
                  <span className="whitespace-nowrap lg:flex-1">{tab.label}</span>
                  {tab.badge}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="hidden shrink-0 space-y-1 border-t border-white/10 p-4 lg:block">
          {user && (
            <div className="flex items-center gap-3 rounded-xl p-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-bold uppercase text-brand-2">
                {user.name.trim().charAt(0) || "?"}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {ROLE_LABEL[user.role]}
                </p>
              </div>
            </div>
          )}
          {logoutButton("w-full px-3 py-2.5")}
        </div>
      </aside>

      {/* ---------------- Content ---------------- */}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-8">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              {actions}
            </div>
            <div className="flex items-center gap-2">
              <ActivityNotifications />
              <NotificationToggle />
              <ThemeMenu />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto w-full max-w-none">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl">
                {heading}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-fg-subtle">{subtitle}</p>
            </div>

            <div
              className={cn(
                "page-reveal",
                !bare &&
                  "rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-7",
              )}
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
