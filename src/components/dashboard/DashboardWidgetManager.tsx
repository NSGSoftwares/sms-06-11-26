import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Button from "@/components/ui/Button";
import type {
    DashboardScope,
    DashboardWidgetId,
} from "@/types/dashboard";

import {
    DEFAULT_WIDGETS_BY_SCOPE,
    getAvailableWidgets,
} from "@/features/dashboard/DashboardWidget";

interface DashboardWidgetManagerProps {
    scope: DashboardScope;
    open: boolean;
    currentWidgets: DashboardWidgetId[];
    saving?: boolean;
    onClose: () => void;
    onSave: (
        widgets: DashboardWidgetId[]
    ) => Promise<void> | void;
}

const DashboardWidgetManager = ({
    scope,
    open,
    currentWidgets,
    saving = false,
    onClose,
    onSave,
}: DashboardWidgetManagerProps) => {
    const availableWidgets = useMemo(
        () => getAvailableWidgets(scope),
        [scope]
    );

    const [selected, setSelected] =
        useState<DashboardWidgetId[]>(
            currentWidgets
        );

    const [draggedId, setDraggedId] =
        useState<DashboardWidgetId | null>(
            null
        );

    useEffect(() => {
        if (open) {
            setSelected([...currentWidgets]);
            setDraggedId(null);
        }
    }, [open, currentWidgets]);

    if (!open) {
        return null;
    }

    const isSelected = (
        id: DashboardWidgetId
    ) => selected.includes(id);

    const toggle = (
        id: DashboardWidgetId
    ) => {
        setSelected((current) => {
            if (current.includes(id)) {
                return current.filter(
                    (item) => item !== id
                );
            }

            return [...current, id];
        });
    };

    const move = (
        id: DashboardWidgetId,
        direction: "up" | "down"
    ) => {
        setSelected((current) => {
            const index = current.indexOf(id);

            if (index === -1) {
                return current;
            }

            const nextIndex =
                direction === "up"
                    ? index - 1
                    : index + 1;

            if (
                nextIndex < 0 ||
                nextIndex >= current.length
            ) {
                return current;
            }

            const next = [...current];

            [
                next[index],
                next[nextIndex],
            ] = [
                    next[nextIndex],
                    next[index],
                ];

            return next;
        });
    };

    const handleDrop = (
        targetId: DashboardWidgetId
    ) => {
        if (
            !draggedId ||
            draggedId === targetId
        ) {
            return;
        }

        setSelected((current) => {
            const from = current.indexOf(
                draggedId
            );

            const to = current.indexOf(
                targetId
            );

            if (from === -1 || to === -1) {
                return current;
            }

            const next = [...current];
            next.splice(from, 1);
            next.splice(to, 0, draggedId);

            return next;
        });

        setDraggedId(null);
    };

    const selectAll = () => {
        setSelected(
            availableWidgets.map(
                (widget) => widget.id
            )
        );
    };

    const clearAll = () => {
        setSelected([]);
    };

    const reset = () => {
        setSelected([
            ...DEFAULT_WIDGETS_BY_SCOPE[scope],
        ]);
    };

    const handleSave = async () => {
        await onSave(selected);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-widget-manager-title"
        >
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface border border-line shadow-2xl">
                <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface">
                    <div>
                        <h2
                            id="dashboard-widget-manager-title"
                            className="text-lg font-semibold text-fg"
                        >
                            Customize Dashboard
                        </h2>

                        <p className="mt-1 text-sm text-fg-subtle">
                            Select widgets and drag them to
                            change their dashboard order.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-2 text-lg text-fg-subtle hover:bg-surface-muted hover:text-fg transition"
                        aria-label="Close dashboard customization"
                    >
                        ×
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-line px-6 py-3 bg-surface-muted/50">
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={selectAll}
                    >
                        Select all
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={clearAll}
                    >
                        Clear all
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={reset}
                    >
                        Reset default
                    </Button>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2 bg-surface">
                    <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
                        <h3 className="mb-3 text-sm font-semibold text-fg">
                            Available widgets
                        </h3>

                        <div className="space-y-2">
                            {availableWidgets.map(
                                (widget) => (
                                    <label
                                        key={widget.id}
                                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3 transition hover:border-line-strong hover:bg-surface-sunken"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected(
                                                widget.id
                                            )}
                                            onChange={() =>
                                                toggle(widget.id)
                                            }
                                            className="h-4 w-4 rounded border-line text-brand focus:ring-brand/50"
                                        />

                                        <span className="flex-1">
                                            <span className="block text-sm font-medium text-fg">
                                                {widget.label}
                                            </span>

                                            <span className="block text-xs capitalize text-fg-subtle">
                                                {widget.category}
                                            </span>
                                        </span>
                                    </label>
                                )
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-surface">
                        <h3 className="mb-3 text-sm font-semibold text-fg">
                            Dashboard order
                        </h3>

                        {selected.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-fg-subtle bg-surface-muted/30">
                                No widgets selected.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {selected.map(
                                    (widgetId, index) => {
                                        const widget =
                                            availableWidgets.find(
                                                (item) =>
                                                    item.id ===
                                                    widgetId
                                            );

                                        if (!widget) {
                                            return null;
                                        }

                                        return (
                                            <div
                                                key={widget.id}
                                                draggable
                                                onDragStart={() =>
                                                    setDraggedId(
                                                        widget.id
                                                    )
                                                }
                                                onDragOver={(event) =>
                                                    event.preventDefault()
                                                }
                                                onDrop={() =>
                                                    handleDrop(
                                                        widget.id
                                                    )
                                                }
                                                className="flex cursor-grab items-center gap-2 rounded-xl border border-line bg-surface-muted px-3 py-2.5 shadow-xs active:cursor-grabbing hover:border-line-strong transition"
                                            >
                                                <span
                                                    className="select-none text-fg-subtle px-1"
                                                    aria-hidden="true"
                                                >
                                                    ⋮⋮
                                                </span>

                                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                                                    {widget.label}
                                                </span>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        index === 0
                                                    }
                                                    onClick={() =>
                                                        move(
                                                            widget.id,
                                                            "up"
                                                        )
                                                    }
                                                    className="rounded p-1.5 text-xs text-fg-subtle hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 transition"
                                                    aria-label={`Move ${widget.label} up`}
                                                >
                                                    ↑
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        index ===
                                                        selected.length -
                                                        1
                                                    }
                                                    onClick={() =>
                                                        move(
                                                            widget.id,
                                                            "down"
                                                        )
                                                    }
                                                    className="rounded p-1.5 text-xs text-fg-subtle hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 transition"
                                                    aria-label={`Move ${widget.label} down`}
                                                >
                                                    ↓
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggle(
                                                            widget.id
                                                        )
                                                    }
                                                    className="rounded p-1.5 text-xs text-danger hover:bg-danger-soft transition"
                                                    aria-label={`Remove ${widget.label}`}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-line px-6 py-4 bg-surface">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving
                            ? "Saving..."
                            : "Save Dashboard"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DashboardWidgetManager;