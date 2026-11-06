export type DashboardScope =
  | "admin"
  | "support"
  | "caller";

export type DashboardWidgetId =
  | "today"
  | "last-7-days"
  | "total-records"
  | "average-duration"
  | "resolved"
  | "self_resolved"
  | "not-resolved"
  | "positive"
  | "negative"
  | "won-leads"
  | "lost-leads"
  | "feedback-records"
  | "new-leads"
  | "invalid-licenses"
  | "company-support"
  | "new-customers"
  | "existing-customers"
  | "records-per-day"
  | "status-chart"
  | "products"
  | "license"
  | "customer-type"
  | "top-staff"
  | "product-offer"
  | "caller-source";

export type DashboardWidgetCategory =
  | "stats"
  | "status"
  | "support"
  | "caller"
  | "charts";

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  label: string;
  category: DashboardWidgetCategory;
  scopes: DashboardScope[];
}

export interface DashboardWidgetConfig {
  scope: DashboardScope;
  widgets: DashboardWidgetId[];
}

/* -------------------------------------------------------------------------- */
/* WIDGET DEFINITIONS                                                         */
/* -------------------------------------------------------------------------- */

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    id: "today",
    label: "Today",
    category: "stats",
    scopes: [
      "admin",
      "support",
      "caller",
    ],
  },

  {
    id: "last-7-days",
    label: "Last 7 Days",
    category: "stats",
    scopes: [
      "admin",
      "support",
      "caller",
    ],
  },

  {
    id: "total-records",
    label: "Total Records",
    category: "stats",
    scopes: [
      "admin",
      "support",
      "caller",
    ],
  },

  {
    id: "average-duration",
    label: "Average Duration",
    category: "stats",
    scopes: [
      "admin",
      "support",
      "caller",
    ],
  },

  {
    id: "resolved",
    label: "Resolved",
    category: "status",
    scopes: [
      "admin",
      "support",
    ],
  },

  {
    id: "self_resolved",
    label: "Self Resolved",
    category: "status",
    scopes: [
      "admin",
      "support",
    ],
  },

  { id: "not-resolved", label: "Not Resolved", category: "status", scopes: ["admin", "support"] },
  { id: "positive", label: "Positive Feedback", category: "status", scopes: ["admin", "caller"] },
  { id: "negative", label: "Negative Feedback", category: "status", scopes: ["admin", "caller"] },
  { id: "won-leads", label: "Won Leads", category: "caller", scopes: ["admin", "caller"] },
  { id: "lost-leads", label: "Lost Leads", category: "caller", scopes: ["admin", "caller"] },
  { id: "feedback-records", label: "Feedback Records", category: "caller", scopes: ["admin", "caller"] },
  { id: "new-leads", label: "New Leads", category: "caller", scopes: ["admin", "caller"] },

  {
    id: "invalid-licenses",
    label: "Invalid Licenses",
    category: "support",
    scopes: [
      "admin",
      "support",
    ],
  },

  {
    id: "company-support",
    label: "Company Support",
    category: "support",
    scopes: [
      "admin",
      "support",
    ],
  },

  {
    id: "new-customers",
    label: "New Customers",
    category: "caller",
    scopes: [
      "admin",
      "caller",
    ],
  },

  {
    id: "existing-customers",
    label: "Follow-up Customers",
    category: "caller",
    scopes: [
      "admin",
      "caller",
    ],
  },

  {
    id: "records-per-day",
    label: "Records Per Day",
    category: "charts",
    scopes: [
      "admin",
      "support",
      "caller",
    ],
  },

  {
    id: "status-chart",
    label: "Status Chart",
    category: "charts",
    scopes: [
      "admin",
      "support",
      "caller",
    ],
  },

  {
    id: "products",
    label: "Products",
    category: "charts",
    scopes: [
      "admin",
      "support",
      "caller",
    ],
  },

  {
    id: "license",
    label: "License",
    category: "support",
    scopes: [
      "admin",
      "support",
    ],
  },

  {
    id: "customer-type",
    label: "Customer Type",
    category: "caller",
    scopes: [
      "admin",
      "caller",
    ],
  },

  {
    id: "top-staff",
    label: "Top Staff",
    category: "charts",
    scopes: [
      "admin",
    ],
  },

  {
    id: "product-offer",
    label: "Product Offer",
    category: "caller",
    scopes: [
      "admin",
      "caller",
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* NEW CALLER SOURCE WIDGET                                               */
  /* ---------------------------------------------------------------------- */

  {
    id: "caller-source",
    label: "Caller Sources",
    category: "caller",
    scopes: [
      "admin",
      "caller",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* DEFAULT WIDGETS                                                           */
/* -------------------------------------------------------------------------- */

export const DEFAULT_ADMIN_WIDGETS: DashboardWidgetId[] = [
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

  "records-per-day",
  "status-chart",
  "products",
  "license",
  "top-staff",
  "customer-type",
  "product-offer",
  "caller-source",
];

export const DEFAULT_SUPPORT_WIDGETS: DashboardWidgetId[] = [
  "today",
  "last-7-days",
  "total-records",
  "average-duration",

  "resolved",
  "self_resolved",
  "not-resolved",

  "invalid-licenses",
  "company-support",

  "records-per-day",
  "status-chart",
  "products",
  "license",
];

export const DEFAULT_CALLER_WIDGETS: DashboardWidgetId[] = [
  "today",
  "last-7-days",
  "total-records",
  "average-duration",

  "positive",
  "negative",
  "won-leads",
  "lost-leads",
  "feedback-records",
  "new-leads",

  "new-customers",
  "existing-customers",

  "records-per-day",
  "status-chart",
  "products",
  "customer-type",
  "product-offer",

  "caller-source",
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

export const getWidgetsForScope = (
  scope: DashboardScope
): DashboardWidgetDefinition[] =>
  DASHBOARD_WIDGETS.filter(
    (widget) =>
      widget.scopes.includes(scope)
  );

export const isWidgetAllowed = (
  widgetId: DashboardWidgetId,
  scope: DashboardScope
): boolean =>
  DASHBOARD_WIDGETS.some(
    (widget) =>
      widget.id === widgetId &&
      widget.scopes.includes(scope)
  );

export const getDefaultWidgets = (
  scope: DashboardScope
): DashboardWidgetId[] => {
  switch (scope) {
    case "admin":
      return [...DEFAULT_ADMIN_WIDGETS];

    case "support":
      return [...DEFAULT_SUPPORT_WIDGETS];

    case "caller":
      return [...DEFAULT_CALLER_WIDGETS];

    default:
      return [];
  }
};
