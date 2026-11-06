import { api } from "./api";
import type {
    DashboardScope,
    DashboardWidgetConfig,
    DashboardWidgetId,
} from "@/types/dashboard";

import {
    DEFAULT_WIDGETS_BY_SCOPE,
    getAvailableWidgets,
} from "@/features/dashboard/DashboardWidget";

const extractData = <T,>(response: any): T => {
    return (
        response?.data?.data ??
        response?.data ??
        response
    ) as T;
};

/**
 * Custom sanitizer that respects explicit empty arrays (cleared widgets)
 */
const sanitizeForSave = (
    widgets: unknown,
    scope: DashboardScope
): DashboardWidgetId[] => {
    if (Array.isArray(widgets) && widgets.length === 0) {
        return [];
    }

    if (!Array.isArray(widgets)) {
        return [...DEFAULT_WIDGETS_BY_SCOPE[scope]];
    }

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

    return result;
};

export const getDashboardWidgets = async (
    scope: DashboardScope
): Promise<DashboardWidgetConfig> => {
    const response = await api.get(
        "/dashboard/widgets",
        {
            scope,
        }
    );

    const data = extractData<{
        scope?: DashboardScope;
        widgets?: unknown;
    }>(response);

    // If backend returns null/undefined or empty array properly
    const rawWidgets = data?.widgets;
    const resolvedWidgets = Array.isArray(rawWidgets)
        ? sanitizeForSave(rawWidgets, scope)
        : [...DEFAULT_WIDGETS_BY_SCOPE[scope]];

    return {
        scope,
        widgets: resolvedWidgets,
    };
};

export const saveDashboardWidgets = async (
    scope: DashboardScope,
    widgets: DashboardWidgetId[]
): Promise<DashboardWidgetConfig> => {
    // Allows empty array [] when clear all is selected
    const sanitized = sanitizeForSave(
        widgets,
        scope
    );

    const response = await api.post(
        "/dashboard/widgets",
        {
            scope,
            widgets: sanitized,
        }
    );

    const data = extractData<{
        scope?: DashboardScope;
        widgets?: unknown;
    }>(response);

    const rawWidgets = data?.widgets;
    const finalWidgets = Array.isArray(rawWidgets)
        ? sanitizeForSave(rawWidgets, scope)
        : sanitized;

    return {
        scope,
        widgets: finalWidgets,
    };
};

export const resetDashboardWidgets = async (
    scope: DashboardScope
): Promise<DashboardWidgetConfig> => {
    // Explicitly forces only the essential default widgets for the scope
    return saveDashboardWidgets(
        scope,
        DEFAULT_WIDGETS_BY_SCOPE[scope]
    );
};
