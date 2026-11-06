import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import { useRecords } from "@/hooks/useRecords";

import {
  visibleTo,
} from "@/lib/permissions";

import {
  averageSeconds,
  byStaff,
  countBy,
  countByDay,
  statusBreakdown,
} from "@/lib/stats";

import {
  formatCompactDuration,
  shiftISODate,
  todayISO,
} from "@/lib/time";

import BarChart, {
  type BarSeries,
} from "@/components/charts/BarChart";

import BarList from "@/components/charts/BarList";

import DonutChart from "@/components/charts/DonutChart";

import Card from "@/components/ui/Card";

import { SelectInput } from "@/components/ui/Field";

import Spinner from "@/components/ui/Spinner";

import StatCardBase, {
  type StatCardProps,
} from "@/components/ui/StatCard";

import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

import DashboardWidgetManager from "@/components/dashboard/DashboardWidgetManager";

import {
  DASHBOARD_WIDGETS,
  DEFAULT_WIDGETS_BY_SCOPE,
  sanitizeWidgetList,
} from "./DashboardWidget";

import {
  getDashboardWidgets,
  saveDashboardWidgets,
} from "@/services/dashboardService";

import type {
  DashboardScope,
  DashboardWidgetId,
} from "@/types/dashboard";

import type {
  AnyRecord,
} from "@/types";


const BRAND =
  "rgb(var(--brand))";

const SKY =
  "#0ea5e9";

const StatCard = (props: StatCardProps) => (
  <StatCardBase {...props} variant="dashboard" />
);


const TITLES: Record<
  DashboardScope,
  string
> = {
  admin:
    "Overview of all support and caller activity",

  support:
    "Overview of your support records",

  caller:
    "Overview of your caller records",
};


interface DashboardProps {
  scope: DashboardScope;
}


const Dashboard = ({
  scope,
}: DashboardProps) => {
  const { user } =
    useAuth();
  const toast = useToast();

  const {
    supportRecords,
    callerRecords,
    loading,
  } = useRecords();

  const [
    days,
    setDays,
  ] = useState(14);

  const [
    widgets,
    setWidgets,
  ] = useState<
    DashboardWidgetId[]
  >(
    DEFAULT_WIDGETS_BY_SCOPE[
    scope
    ]
  );

  const [
    managerOpen,
    setManagerOpen,
  ] = useState(false);

  const [
    widgetsLoading,
    setWidgetsLoading,
  ] = useState(true);

  const [
    widgetsSaving,
    setWidgetsSaving,
  ] = useState(false);


  /*
   * ==========================================
   * LOAD USER DASHBOARD CONFIGURATION
   * ==========================================
   */

  useEffect(() => {
    let active = true;

    const load = async () => {
      setWidgetsLoading(true);

      try {
        const config =
          await getDashboardWidgets(
            scope
          );

        if (!active) {
          return;
        }

        setWidgets(
          sanitizeWidgetList(
            config.widgets,
            scope
          )
        );
      } catch (error) {
        console.error(
          "Failed to load dashboard widgets:",
          error
        );

        if (active) {
          setWidgets(
            [
              ...DEFAULT_WIDGETS_BY_SCOPE[
              scope
              ],
            ]
          );
        }
      } finally {
        if (active) {
          setWidgetsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [scope]);


  /*
   * ==========================================
   * SAVE USER DASHBOARD CONFIGURATION
   * ==========================================
   */

  const handleSaveWidgets =
    useCallback(
      async (
        nextWidgets: DashboardWidgetId[]
      ) => {
        setWidgetsSaving(true);

        try {
          const config =
            await saveDashboardWidgets(
              scope,
              nextWidgets
            );

          setWidgets(
            sanitizeWidgetList(
              config.widgets,
              scope
            )
          );

          setManagerOpen(false);
          toast.success("Dashboard layout and widgets saved successfully.", { title: "Dashboard Saved" });
        } catch (error) {
          console.error(
            "Failed to save dashboard widgets:",
            error
          );
          toast.error(`Dashboard changes were not saved. ${error instanceof Error ? error.message : "Check the backend connection and try again."}`, { title: "Dashboard Save Failed" });
        } finally {
          setWidgetsSaving(false);
        }
      },
      [scope, toast]
    );


  /*
   * ==========================================
   * ROLE-AWARE DATA
   * ==========================================
   */

  const support =
    useMemo(
      () =>
        scope === "caller"
          ? []
          : visibleTo(
            user,
            supportRecords
          ),
      [
        scope,
        user,
        supportRecords,
      ]
    );


  const caller =
    useMemo(
      () =>
        scope === "support"
          ? []
          : visibleTo(
            user,
            callerRecords
          ),
      [
        scope,
        user,
        callerRecords,
      ]
    );


  /*
   * ==========================================
   * STATS
   * ==========================================
   */

  const stats =
    useMemo(() => {
      const all: AnyRecord[] = [
        ...support,
        ...caller,
      ];

      const today =
        todayISO();

      const weekStart =
        shiftISODate(
          today,
          -6
        );

      return {
        all,

        total:
          all.length,

        today:
          all.filter(
            (record) =>
              record.dateISO ===
              today
          ).length,

        week:
          all.filter(
            (record) =>
              record.dateISO >=
              weekStart &&
              record.dateISO <=
              today
          ).length,

        avg:
          averageSeconds(
            all
          ),

        resolved:
          all.filter(
            (record) =>
              record.status ===
              "resolved"
          ).length,

        self_resolved:
          all.filter(
            (record) =>
              record.status ===
              "self_resolved"
          ).length,

        notResolved:
          support.filter((record) => record.status === "not_resolved").length,

        positiveFeedback:
          caller.filter((record) => record.callerMode !== "new_lead" && record.status === "positive").length,

        negativeFeedback:
          caller.filter((record) => record.callerMode !== "new_lead" && record.status === "negative").length,

        wonLeads:
          caller.filter((record) => record.callerMode === "new_lead" && record.status === "win").length,

        lostLeads:
          caller.filter((record) => record.callerMode === "new_lead" && record.status === "lost").length,

        feedbackRecords:
          caller.filter((record) => record.callerMode !== "new_lead").length,

        newLeads:
          caller.filter((record) => record.callerMode === "new_lead").length,

        invalid:
          support.filter(
            (record) =>
              record.license ===
              "Invalid"
          ).length,

        companySupport:
          support.filter(
            (record) =>
              record.companySupport
          ).length,

        newCustomers:
          caller.filter(
            (record) =>
              record.customerType ===
              "New"
          ).length,

        followUpCustomers:
          caller.filter(
            (record) =>
              record.customerType ===
              "Follow up"
          ).length,
      };
    }, [
      support,
      caller,
    ]);


  /*
   * ==========================================
   * CHART DATA
   * ==========================================
   */

  const trend =
    useMemo(
      () =>
        countByDay(
          support,
          caller,
          days
        ),
      [
        support,
        caller,
        days,
      ]
    );


  const series: BarSeries[] =
    scope === "admin"
      ? [
        {
          name: "Support",
          color: BRAND,
        },
        {
          name: "Caller",
          color: SKY,
        },
      ]
      : scope === "support"
        ? [
          {
            name: "Support",
            color: BRAND,
          },
        ]
        : [
          {
            name: "Caller",
            color: BRAND,
          },
        ];


  const barData =
    trend.map(
      (item) => ({
        label:
          item.label,

        values:
          scope === "admin"
            ? [
              item.support,
              item.caller,
            ]
            : [
              scope === "support"
                ? item.support
                : item.caller,
            ],
      })
    );


  const products =
    useMemo(
      () =>
        countBy(
          stats.all.filter(
            (record) =>
              record.product !==
              "-"
          ),
          (record) =>
            record.product
        ),
      [stats.all]
    );


  const statuses =
    useMemo(
      () =>
        statusBreakdown(stats.all),
      [stats.all]
    );


  const staff =
    useMemo(
      () =>
        byStaff(
          support,
          caller
        ).map(
          (record) => ({
            label:
              record.staffName,

            value:
              record.total,
          })
        ),
      [
        support,
        caller,
      ]
    );


  /*
   * ==========================================
   * WIDGET RENDERING
   * ==========================================
   */

  const renderWidget =
    (
      widgetId: DashboardWidgetId
    ) => {
      switch (widgetId) {
        case "today":
          return (
            <StatCard
              label="Today"
              value={
                stats.today
              }
              hint="records created today"
              icon="clock"
            />
          );

        case "last-7-days":
          return (
            <StatCard
              label="Last 7 days"
              value={
                stats.week
              }
              hint="including today"
              icon="chart"
              tone="info"
            />
          );

        case "total-records":
          return (
            <StatCard
              label="Total records"
              value={
                stats.total
              }
              hint="all time"
              icon="book"
              tone="success"
              featured="violet"
            />
          );

        case "average-duration":
          return (
            <StatCard
              label="Avg. duration"
              value={formatCompactDuration(
                stats.avg
              )}
              hint="per timed session"
              icon="history"
              tone="warning"
              featured="orange"
            />
          );

        case "resolved":
          return (
            <StatCard
              label="Resolved"
              value={
                stats.resolved
              }
              hint="resolved records"
              icon="check"
              tone="success"
            />
          );

        case "self_resolved":
          return (
            <StatCard
              label="Self Resolved"
              value={
                stats.self_resolved
              }
              hint="self_resolved records"
              icon="check"
              tone="success"
            />
          );

        case "not-resolved":
          return <StatCard label="Not resolved" value={stats.notResolved} hint="support cases awaiting a solution" icon="x" tone="danger" />;

        case "positive":
          return <StatCard label="Positive feedback" value={stats.positiveFeedback} hint="caller feedback records" icon="check" tone="success" />;

        case "negative":
          return <StatCard label="Negative feedback" value={stats.negativeFeedback} hint="caller feedback records" icon="x" tone="danger" />;

        case "won-leads":
          return <StatCard label="Won leads" value={stats.wonLeads} hint="new leads converted" icon="check" tone="success" />;

        case "lost-leads":
          return <StatCard label="Lost leads" value={stats.lostLeads} hint="new leads not converted" icon="x" tone="danger" />;

        case "feedback-records":
          return <StatCard label="Feedback records" value={stats.feedbackRecords} hint="customer feedback captured" icon="users" tone="info" />;

        case "new-leads":
          return <StatCard label="New leads" value={stats.newLeads} hint="prospects captured" icon="plus" tone="brand" />;

        case "invalid-licenses":
          return (
            <StatCard
              label="Invalid licenses"
              value={
                stats.invalid
              }
              hint="support records"
              icon="x"
              tone="danger"
            />
          );

        case "company-support":
          return (
            <StatCard
              label="Company support"
              value={
                stats.companySupport
              }
              hint="escalated to company"
              icon="users"
              tone="warning"
            />
          );

        case "new-customers":
          return (
            <StatCard
              label="New customers"
              value={
                stats.newCustomers
              }
              icon="plus"
              tone="info"
            />
          );

        case "existing-customers":
          return (
            <StatCard
              label="Follow-up customers"
              value={
                stats.followUpCustomers
              }
              icon="users"
              tone="brand"
            />
          );

        case "records-per-day":
          return (
            <Card
              className="lg:col-span-2"
              title="Records per day"
              subtitle={`Last ${days} days`}
              action={
                <SelectInput
                  aria-label="Chart range"
                  value={days}
                  onChange={(event) =>
                    setDays(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-auto py-1.5"
                >
                  <option value={7}>
                    7 days
                  </option>

                  <option value={14}>
                    14 days
                  </option>

                  <option value={30}>
                    30 days
                  </option>
                </SelectInput>
              }
            >
              <BarChart
                data={barData}
                series={series}
                ariaLabel={`Records created per day over the last ${days} days`}
              />
            </Card>
          );

        case "status-chart":
          return (
            <Card
              title="Status"
              subtitle="Where your records stand"
            >
              <DonutChart
                items={statuses}
                ariaLabel="Records by status"
                centerLabel="records"
              />
            </Card>
          );

        case "products":
          return (
            <Card title="By product">
              <BarList
                items={products}
              />
            </Card>
          );

        case "license":
          return (
            <Card title="License">
              <DonutChart
                ariaLabel="Support records by license"
                centerLabel="support"
                items={[
                  {
                    label: "Valid",
                    value:
                      support.filter(
                        (record) =>
                          record.license ===
                          "Valid"
                      ).length,
                  },
                  {
                    label: "Invalid",
                    value:
                      stats.invalid,
                  },
                ].filter(
                  (item) =>
                    item.value > 0
                )}
              />
            </Card>
          );

        case "customer-type":
          return (
            <Card title="Customer type">
              <DonutChart
                ariaLabel="Caller records by customer type"
                centerLabel="calls"
                items={[
                  {
                    label: "New",
                    value:
                      stats.newCustomers,
                  },
                  {
                    label: "Follow up",
                    value:
                      stats.followUpCustomers,
                  },
                ].filter(
                  (item) =>
                    item.value > 0
                )}
              />
            </Card>
          );

        case "top-staff":
          return (
            <Card
              title="Top staff"
              subtitle="By records created"
            >
              <BarList
                items={staff}
              />
            </Card>
          );

        case "product-offer":
          return (
            <Card title="Product offer">
              <BarList
                items={countBy(
                  caller,
                  (record) =>
                    record.productOffer
                )}
              />
            </Card>
          );

        case "caller-source":
          return (
            <Card title="Caller sources" subtitle="Records by lead or feedback source">
              <BarList items={countBy(caller, (record) => record.source?.trim() || "Unknown")} />
            </Card>
          );

        default:
          return null;
      }
    };


  /*
   * ==========================================
   * LOADING
   * ==========================================
   */

  if (
    loading ||
    widgetsLoading
  ) {
    return (
      <Spinner
        label="Loading dashboard..."
      />
    );
  }


  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <div className="w-full">

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">

        <div>
          <h2 className="text-xl font-semibold text-fg">
            Dashboard
          </h2>

          <p className="mt-1 text-sm text-fg-subtle">
            {TITLES[scope]}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          icon="filter"
          onClick={() =>
            setManagerOpen(true)
          }
        >
          Customize Dashboard
        </Button>
      </div>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {widgets
          .filter(
            (widgetId) =>
              DASHBOARD_WIDGETS.some(
                (widget) =>
                  widget.id ===
                  widgetId &&
                  widget.scopes.includes(
                    scope
                  )
              )
          )
          .map(
            (widgetId) => {
              const isStat =
                [
                  "today",
                  "last-7-days",
                  "total-records",
                  "average-duration",
                  "resolved",
                  "self_resolved",
                  "not-resolved",
                  "positive",
                  "negative",
                  "won-leads",
                  "lost-leads",
                  "feedback-records",
                  "new-leads",
                  "invalid-licenses",
                  "company-support",
                  "new-customers",
                  "existing-customers",
                ].includes(
                  widgetId
                );

              if (!isStat) {
                return null;
              }

              return (
                <div
                  key={widgetId}
                >
                  {renderWidget(
                    widgetId
                  )}
                </div>
              );
            }
          )}
      </div>


      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

        {widgets
          .filter(
            (widgetId) =>
              ![
                "today",
                "last-7-days",
                "total-records",
                "average-duration",
                "resolved",
                "self_resolved",
                "not-resolved",
                "positive",
                "negative",
                "won-leads",
                "lost-leads",
                "feedback-records",
                "new-leads",
                "invalid-licenses",
                "company-support",
                "new-customers",
                "existing-customers",
              ].includes(
                widgetId
              )
          )
          .filter(
            (widgetId) =>
              DASHBOARD_WIDGETS.some(
                (widget) =>
                  widget.id ===
                  widgetId &&
                  widget.scopes.includes(
                    scope
                  )
              )
          )
          .map(
            (widgetId) => (
              <div
                key={widgetId}
              >
                {renderWidget(
                  widgetId
                )}
              </div>
            )
          )}

      </div>


      <DashboardWidgetManager
        scope={scope}
        open={managerOpen}
        currentWidgets={
          widgets
        }
        saving={
          widgetsSaving
        }
        onClose={() =>
          setManagerOpen(false)
        }
        onSave={
          handleSaveWidgets
        }
      />

    </div>
  );
};


export default Dashboard;
