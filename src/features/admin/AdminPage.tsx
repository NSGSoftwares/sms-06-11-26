// File: sms-frontend/src/features/admin/AdminPage.tsx
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TabPanel, type TabItem } from "@/components/ui/Tabs";
import CallerDayBook from "@/features/caller/CallerDayBook";
import Dashboard from "@/features/dashboard/Dashboard";
import CustomerHistory from "@/features/history/CustomerHistory";
import SupportDayBook from "@/features/support/SupportDayBook";
import SupportForm from "@/features/support/SupportForm";
import ActiveTokenCount from "@/features/tokens/ActiveTokenCount";
import GenerateTokenButton from "@/features/tokens/GenerateTokenButton";
import TokenPanel from "@/features/tokens/TokenPanel";
import TokensPage from "@/features/tokens/TokensPage";
import { useTabParam } from "@/hooks/useTabParam";
import ReportsPage from "./ReportsPage";
import UserManagement from "./UserManagement";
import SettingsPage from "./SettingsPage";
import LiveStaffPanel from "./LiveStaffPanel";
import StaffDayBook from "./StaffDayBook";

const TABS = [
  "dashboard",
  "tokens",
  "new_support",
  "support",
  "caller",
  "staff_log",
  "history",
  "reports",
  "users",
  "settings",
] as const;
type AdminTab = (typeof TABS)[number];

const TAB_ITEMS: TabItem<AdminTab>[] = [
  { key: "dashboard", label: "Dashboard", icon: "chart" },
  { key: "tokens", label: "Tokens", icon: "clock", badge: <ActiveTokenCount /> },
  { key: "new_support", label: "New Support", icon: "plus" },
  { key: "support", label: "Support Day Book", icon: "book" },
  { key: "caller", label: "Caller Day Book", icon: "book" },
  { key: "staff_log", label: "Staff Time Log", icon: "clock" },
  { key: "history", group: "Management", label: "Customer History", icon: "history" },
  { key: "reports", group: "Management", label: "Reports", icon: "filter" },
  { key: "users", group: "Management", label: "Users", icon: "users" },
  { key: "settings", group: "Management", label: "Settings", icon: "filter" }, // Fixed: Replaced invalid "settings" icon with a valid icon type
];

const AdminPage = () => {
  const [tab, setTab] = useTabParam<AdminTab>(TABS, "dashboard");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeItem = TAB_ITEMS.find((t) => t.key === tab) || TAB_ITEMS[0];

  return (
    <DashboardLayout
      navTitle="Admin Dashboard"
      heading="Admin"
      subtitle="Monitor all activity, run reports and manage users"
      tabs={TAB_ITEMS}
      activeTab={tab}
      onTabChange={setTab}
      actions={<GenerateTokenButton />}
    >
      {/* Mobile tab selector */}
      <div className="relative z-40 mb-6 md:hidden" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-surface p-3.5 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
                Select Module
              </span>
              <span className="text-base font-bold text-fg">{activeItem.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeItem.badge && <div className="scale-90">{activeItem.badge}</div>}
            <svg
              className={`h-5 w-5 text-fg-muted transition-transform duration-200 ${isMobileMenuOpen ? "rotate-180" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {isMobileMenuOpen && (
          <div className="absolute left-0 top-full mt-2 w-full origin-top rounded-xl border border-line bg-surface shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex max-h-[55vh] flex-col overflow-y-auto p-1.5">
              {TAB_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTab(item.key);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3.5 text-left transition-colors ${tab === item.key
                    ? "bg-brand/10 text-brand"
                    : "text-fg hover:bg-surface-hover"
                    }`}
                >
                  <span className={`text-sm ${tab === item.key ? "font-bold" : "font-medium"}`}>
                    {item.label}
                  </span>
                  {item.badge && <div className="scale-90">{item.badge}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          [role="tablist"], nav[aria-label="Tabs"] {
            display: none !important;
          }
        }
      `}</style>

      <TabPanel tab="dashboard" active={tab === "dashboard"}>
        <section className="relative isolate mb-6 overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-br from-brand-soft/50 via-surface to-surface p-6 shadow-card sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
            <div className="absolute -bottom-36 right-1/3 h-64 w-64 rounded-full bg-brand-2/10 blur-3xl" />
            <div className="absolute -right-10 top-4 hidden h-56 w-56 rotate-12 rounded-[3rem] border border-brand/15 bg-brand-soft/15 shadow-[inset_0_1px_40px_rgba(255,255,255,0.18)] md:block" />
            <div className="absolute right-16 top-14 hidden h-40 w-40 -rotate-12 rounded-[2.5rem] border border-brand/10 md:block" />
          </div>
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-surface/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Operations command center
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-fg sm:text-4xl">
              Your team, in focus.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-fg-subtle sm:text-base">
              Live staff activity, waiting tokens and business performance—together in one clear view.
            </p>
          </div>
        </section>
        <LiveStaffPanel />
        <TokenPanel onViewAll={() => setTab("tokens")} />
        <Dashboard scope="admin" />
      </TabPanel>
      <TabPanel tab="tokens" active={tab === "tokens"}>
        <TokensPage />
      </TabPanel>
      <TabPanel tab="new_support" active={tab === "new_support"}>
        <SupportForm onSaved={() => setTab("support")} />
      </TabPanel>
      <TabPanel tab="support" active={tab === "support"}>
        <SupportDayBook onNewSupport={() => setTab("new_support")} />
      </TabPanel>
      <TabPanel tab="caller" active={tab === "caller"}>
        <CallerDayBook />
      </TabPanel>
      <TabPanel tab="staff_log" active={tab === "staff_log"}>
        <StaffDayBook />
      </TabPanel>
      <TabPanel tab="history" active={tab === "history"}>
        <CustomerHistory />
      </TabPanel>
      <TabPanel tab="reports" active={tab === "reports"}>
        <ReportsPage />
      </TabPanel>
      <TabPanel tab="users" active={tab === "users"}>
        <UserManagement />
      </TabPanel>
      <TabPanel tab="settings" active={tab === "settings"}>
        <SettingsPage />
      </TabPanel>
    </DashboardLayout>
  );
};

export default AdminPage;
