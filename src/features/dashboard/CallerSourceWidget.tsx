import { useMemo } from "react";

import { useRecords } from "@/hooks/useRecords";
import { useAuth } from "@/hooks/useAuth";
import { visibleTo } from "@/lib/permissions";

import type { CallerRecord } from "@/types";

interface SourceCount {
    source: string;
    count: number;
}

const UNKNOWN_SOURCE = "Unknown";

const normalizeSource = (
    value: string | null | undefined
): string => {
    const source = String(
        value ?? ""
    ).trim();

    return source || UNKNOWN_SOURCE;
};

const CallerSourceWidget = () => {
    const { user } = useAuth();

    const {
        callerRecords,
        loading,
    } = useRecords();

    const visibleCallerRecords = useMemo(() => {
        if (!user) {
            return [];
        }

        /*
         * Admin:
         *   all caller records
         *
         * Caller:
         *   own caller records
         *
         * Support:
         *   this widget is not available to Support,
         *   but we still keep the calculation safe.
         */
        return visibleTo(
            user,
            callerRecords
        );
    }, [
        user,
        callerRecords,
    ]);

    const sourceCounts = useMemo<
        SourceCount[]
    >(() => {
        const counts: Record<
            string,
            number
        > = {};

        visibleCallerRecords.forEach(
            (record: CallerRecord) => {
                const source =
                    normalizeSource(
                        record.source
                    );

                counts[source] =
                    (counts[source] ?? 0) + 1;
            }
        );

        return Object.entries(counts)
            .map(
                ([source, count]) => ({
                    source,
                    count,
                })
            )
            .sort(
                (a, b) =>
                    b.count - a.count ||
                    a.source.localeCompare(
                        b.source
                    )
            );
    }, [
        visibleCallerRecords,
    ]);

    const total =
        visibleCallerRecords.length;

    const maxCount =
        sourceCounts.length > 0
            ? Math.max(
                ...sourceCounts.map(
                    (item) => item.count
                )
            )
            : 0;

    if (loading) {
        return (
            <div className="rounded-xl border border-line bg-surface p-5">
                <div className="animate-pulse">
                    <div className="h-5 w-40 rounded bg-surface-muted" />
                    <div className="mt-5 h-4 w-full rounded bg-surface-muted" />
                    <div className="mt-3 h-4 w-4/5 rounded bg-surface-muted" />
                    <div className="mt-3 h-4 w-3/5 rounded bg-surface-muted" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-base font-semibold text-fg">
                        Caller Sources
                    </h3>

                    <p className="mt-1 text-sm text-fg-subtle">
                        Caller records by source
                    </p>
                </div>

                <div className="rounded-lg bg-surface-muted px-3 py-1.5 text-sm font-semibold text-fg">
                    {total}
                </div>
            </div>

            {sourceCounts.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-line p-6 text-center">
                    <p className="text-sm font-medium text-fg-muted">
                        No caller source data yet.
                    </p>

                    <p className="mt-1 text-xs text-fg-subtle">
                        Caller records with a source will
                        appear here.
                    </p>
                </div>
            ) : (
                <div className="mt-6 space-y-4">
                    {sourceCounts.map(
                        ({
                            source,
                            count,
                        }) => {
                            const percentage =
                                total > 0
                                    ? Math.round(
                                        (count / total) *
                                        100
                                    )
                                    : 0;

                            const width =
                                maxCount > 0
                                    ? Math.max(
                                        4,
                                        Math.round(
                                            (count /
                                                maxCount) *
                                            100
                                        )
                                    )
                                    : 0;

                            return (
                                <div
                                    key={source}
                                    className="space-y-1.5"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <span
                                            className="min-w-0 truncate text-sm font-medium text-fg"
                                            title={source}
                                        >
                                            {source}
                                        </span>

                                        <span className="shrink-0 text-sm font-semibold text-fg">
                                            {count}
                                        </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                                        <div
                                            className="h-full rounded-full bg-brand"
                                            style={{
                                                width: `${width}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="text-right text-xs text-fg-subtle">
                                        {percentage}%
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );
};

export default CallerSourceWidget;