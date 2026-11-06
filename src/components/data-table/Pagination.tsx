import { PAGE_SIZES } from "@/config";
import { cn } from "@/lib/cn";
import Icon from "@/components/ui/Icon";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/** 1 … 4 5 6 … 20 */
export const pageWindow = (page: number, totalPages: number): (number | "gap")[] => {
  const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push("gap");
    result.push(p);
  });
  return result;
};

const pageButton =
  "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition";

const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-fg-subtle md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span>
          Showing {first}–{last} of {total}
        </span>

        <label className="flex items-center gap-2">
          <span className="sr-only md:not-sr-only">Rows</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-line-strong bg-surface px-2 py-1 text-sm text-fg"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(pageButton, "hover:bg-surface-sunken disabled:opacity-40")}
        >
          <Icon name="chevronLeft" size={16} />
        </button>

        {pageWindow(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-1" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                pageButton,
                item === page
                  ? "bg-brand font-semibold text-brand-fg"
                  : "hover:bg-surface-sunken"
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(pageButton, "hover:bg-surface-sunken disabled:opacity-40")}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
