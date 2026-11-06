import { useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PAGE_SIZE } from "@/config";
import { cn } from "@/lib/cn";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import Pagination from "./Pagination";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  /** Give a value to make the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "center" | "right";
  className?: string;
  /** Skip the column (e.g. "Created By" for non-admins). */
  hidden?: boolean;
}

interface SortState {
  key: string;
  dir: "asc" | "desc";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Accessible name for the table. */
  caption: string;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  minWidth?: string;
}

const compare = (a: string | number, b: string | number): number =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: "base",
    });

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" };

/**
 * Sortable, paginated table. Click a header: ascending, descending, then back
 * to the original order. Row numbers (#) follow the visible order.
 */
function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  emptyTitle = "Nothing to show yet.",
  emptyMessage,
  minWidth = "900px",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const visibleColumns = columns.filter((c) => !c.hidden);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;

    const getValue = column.sortValue;
    const factor = sort.dir === "asc" ? 1 : -1;
    // Array.prototype.sort is stable, so equal values keep their order.
    return [...rows].sort((a, b) => factor * compare(getValue(a), getValue(b)));
  }, [rows, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const toggleSort = (key: string) => {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>

          <thead>
            <tr className="bg-surface-muted">
              {visibleColumns.map((column) => {
                const sortable = Boolean(column.sortValue);
                const active = sort?.key === column.key;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort?.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "border-b border-line px-4 py-3 text-xs font-medium text-fg-subtle",
                      ALIGN[column.align ?? "left"]
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded hover:text-fg",
                          active && "text-fg"
                        )}
                      >
                        {column.header}
                        <span className="flex h-4 w-4 items-center justify-center">
                          {active ? (
                            <Icon
                              name={sort?.dir === "asc" ? "chevronUp" : "chevronDown"}
                              size={14}
                            />
                          ) : (
                            <span className="text-fg-subtle/50" aria-hidden="true">
                              ↕
                            </span>
                          )}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {pageRows.map((row, index) => (
              <tr key={rowKey(row)} className="hover:bg-surface-muted">
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-fg",
                      ALIGN[column.align ?? "left"],
                      column.className
                    )}
                  >
                    {column.render(row, start + index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <Spinner label="Loading..." />}

      {!loading && sorted.length === 0 && (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      )}

      {!loading && sorted.length > 0 && (
        <Pagination
          page={safePage}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

export default DataTable;
