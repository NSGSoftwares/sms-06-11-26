import type {
    DashboardScope,
    DashboardWidgetDefinition,
    DashboardWidgetId,
} from "@/types/dashboard";

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
    {
        id: "today",
        label: "Today",
        category: "stats",
        scopes: ["admin", "support", "caller"],
    },
    {
        id: "last-7-days",
        label: "Last 7 Days",
        category: "stats",
        scopes: ["admin", "support", "caller"],
    },
    {
        id: "total-records",
        label: "Total Records",
        category: "stats",
        scopes: ["admin", "support", "caller"],
    },
    {
        id: "average-duration",
        label: "Average Duration",
        category: "stats",
        scopes: ["admin", "support", "caller"],
    },

    {
        id: "resolved",
        label: "Resolved",
        category: "status",
        scopes: ["admin", "support"],
    },
    {
        id: "self_resolved",
        label: "Self Resolved",
        category: "status",
        scopes: ["admin", "support"],
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
        scopes: ["admin", "support"],
    },
    {
        id: "company-support",
        label: "Company Support",
        category: "support",
        scopes: ["admin", "support"],
    },

    {
        id: "new-customers",
        label: "New Customers",
        category: "caller",
        scopes: ["admin", "caller"],
    },
    {
        id: "existing-customers",
        label: "Follow-up Customers",
        category: "caller",
        scopes: ["admin", "caller"],
    },

    {
        id: "records-per-day",
        label: "Records Per Day",
        category: "charts",
        scopes: ["admin", "support", "caller"],
    },
    {
        id: "status-chart",
        label: "Status",
        category: "charts",
        scopes: ["admin", "support", "caller"],
    },
    {
        id: "products",
        label: "By Product",
        category: "charts",
        scopes: ["admin", "support", "caller"],
    },
    {
        id: "license",
        label: "License",
        category: "charts",
        scopes: ["admin", "support"],
    },
    {
        id: "customer-type",
        label: "Customer Type",
        category: "charts",
        scopes: ["admin", "caller"],
    },
    {
        id: "top-staff",
        label: "Top Staff",
        category: "charts",
        scopes: ["admin"],
    },
    {
        id: "product-offer",
        label: "Product Offer",
        category: "charts",
        scopes: ["admin", "caller"],
    },
    {
        id: "caller-source",
        label: "Caller Sources",
        category: "caller",
        scopes: ["admin", "caller"],
    },
];

export const getAvailableWidgets = (
    scope: DashboardScope
): DashboardWidgetDefinition[] =>
    DASHBOARD_WIDGETS.filter((widget) =>
        widget.scopes.includes(scope)
    );

export const DEFAULT_WIDGETS_BY_SCOPE: Record<
    DashboardScope,
    DashboardWidgetId[]
> = {
    admin: [
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
    ],

    support: [
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
    ],

    caller: [
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
    ],
};

export const isWidgetAllowedForScope = (
    widgetId: DashboardWidgetId,
    scope: DashboardScope
): boolean => {
    const widget = DASHBOARD_WIDGETS.find(
        (item) => item.id === widgetId
    );

    return Boolean(
        widget && widget.scopes.includes(scope)
    );
};

export const sanitizeWidgetList = (
    widgets: unknown,
    scope: DashboardScope
): DashboardWidgetId[] => {
    // If it's an explicit array, allow it even if empty (0 widgets)
    if (Array.isArray(widgets)) {
        const allowed = new Set(
            getAvailableWidgets(scope).map(
                (widget) => widget.id
            )
        );

        const result: DashboardWidgetId[] = [];

        for (const value of widgets) {
            if (
                typeof value !== "string" ||
                !allowed.has(value as DashboardWidgetId)
            ) {
                continue;
            }

            const widgetId = value as DashboardWidgetId;

            if (!result.includes(widgetId)) {
                result.push(widgetId);
            }
        }

        // Return result directly, allowing empty array [] if user cleared all
        return result;
    }

    return [...DEFAULT_WIDGETS_BY_SCOPE[scope]];
};
