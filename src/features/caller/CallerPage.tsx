// src/features/caller/CallerPage.tsx
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LiveTimerBadge } from "@/components/timer/TimerParts";
import { TabPanel, type TabItem } from "@/components/ui/Tabs";
import Dashboard from "@/features/dashboard/Dashboard";
import CustomerHistory from "@/features/history/CustomerHistory";
import SupportDayBook from "@/features/support/SupportDayBook";
import ActiveTokenCount from "@/features/tokens/ActiveTokenCount";
import TokensPage from "@/features/tokens/TokensPage";
import { useTabParam } from "@/hooks/useTabParam";
import type { CallerRecord, SupportRecord } from "@/types";
import CallerDayBook from "./CallerDayBook";
import CallerForm, { CALLER_TIMER_KEY } from "./CallerForm";
import GenerateTokenButton from "@/features/tokens/GenerateTokenButton";

const TABS = [
  "dashboard",
  "new",
  "caller-daybook",
  "support-daybook",
  "tokens",
  "history",
] as const;

type CallerTab = (typeof TABS)[number];

const CallerPage = () => {
  const [tab, setTab] = useTabParam<CallerTab>(TABS, "new");
  const [supportPrefill, setSupportPrefill] = useState<SupportRecord | null>(null);
  const [callerLeadPrefill, setCallerLeadPrefill] = useState<CallerRecord | null>(null);

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

  const handleUseSupportForCaller = (record: SupportRecord) => {
    setCallerLeadPrefill(null);
    setSupportPrefill(record);
    setTab("new");
  };

  const handleUseCallerForLead = (record: CallerRecord) => {
    setSupportPrefill(null);
    setCallerLeadPrefill(record);
    setTab("new");
  };

  const handleCallerSaved = () => {
    setSupportPrefill(null);
    setCallerLeadPrefill(null);
    setTab("caller-daybook");
  };

  const handleCallerCancel = () => {
    const cameFromSupportDayBook = Boolean(supportPrefill);
    setSupportPrefill(null);
    setCallerLeadPrefill(null);
    setTab(cameFromSupportDayBook ? "support-daybook" : "caller-daybook");
  };

  const tabs: TabItem<CallerTab>[] = [
    { key: "dashboard", label: "Dashboard", icon: "chart" },
    {
      key: "new",
      label: "New Caller",
      icon: "plus",
      badge:
        tab !== "new" ? (
          <LiveTimerBadge persistKey={CALLER_TIMER_KEY} />
        ) : undefined,
    },
    { key: "caller-daybook", label: "Self Day Book", icon: "book" },
    { key: "support-daybook", label: "Support Day Book", icon: "book" },
    { key: "tokens", label: "Tokens", icon: "clock", badge: <ActiveTokenCount /> },
    { key: "history", label: "Customer History", icon: "history" },
  ];

  const activeItem = tabs.find((t) => t.key === tab) || tabs[0];

  return (
    <DashboardLayout
      navTitle="Caller User Dashboard"
      heading="Caller"
      subtitle="Record calls, view your day book, and browse support records"
      tabs={tabs}
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
              className={`h-5 w-5 text-fg-muted transition-transform duration-200 ${isMobileMenuOpen ? "rotate-180" : ""
                }`}
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
              {tabs.map((item) => (
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

      {/* Hide default tablist on mobile */}
      <style>{`
        @media (max-width: 767px) {
          [role="tablist"], nav[aria-label="Tabs"] {
            display: none !important;
          }
        }
      `}</style>

      <TabPanel tab="dashboard" active={tab === "dashboard"}>
        <Dashboard scope="caller" />
      </TabPanel>

      <TabPanel tab="new" active={tab === "new"} keepMounted>
        <CallerForm
          key={supportPrefill?.id ?? callerLeadPrefill?.id ?? "new-caller"}
          prefillFromSupport={supportPrefill ?? undefined}
          prefillFromCaller={callerLeadPrefill ?? undefined}
          onSaved={handleCallerSaved}
          onCancel={supportPrefill || callerLeadPrefill ? handleCallerCancel : undefined}
        />
      </TabPanel>

      <TabPanel tab="caller-daybook" active={tab === "caller-daybook"}>
        <CallerDayBook onNewCaller={() => setTab("new")} onUseForLead={handleUseCallerForLead} />
      </TabPanel>

      <TabPanel tab="support-daybook" active={tab === "support-daybook"}>
        <SupportDayBook onUseForCaller={handleUseSupportForCaller} />
      </TabPanel>

      <TabPanel tab="tokens" active={tab === "tokens"}>
        <TokensPage />
      </TabPanel>

      <TabPanel tab="history" active={tab === "history"}>
        <CustomerHistory />
      </TabPanel>
    </DashboardLayout>
  );
};

export default CallerPage;
