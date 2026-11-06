import { useMemo } from "react";
import { useTokens } from "@/hooks/useTokens";
import { formatDateTime } from "@/lib/time";
import { formatTokenNo, isActiveToken, oldestFirst } from "@/lib/tokens";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TokenProgressBadge from "./TokenProgressBadge";

const VISIBLE = 2;

/**
 * Admin token panel: the 2 longest-waiting active tokens are shown, the rest
 * are one click away in the Tokens tab.
 */
const TokenPanel = ({ onViewAll }: { onViewAll: () => void }) => {
  const { tokens } = useTokens();

  const { active, byKind } = useMemo(() => {
    const act = oldestFirst(tokens.filter(isActiveToken));
    const summarize = (kind: "support" | "lead") => {
      const all = tokens.filter((token) => token.kind === kind);
      return {
        pending: all.filter((token) => token.progress === "pending").length,
        ongoing: all.filter((token) => token.progress === "ongoing").length,
        completed: all.filter((token) => token.progress === "completed").length,
      };
    };
    return {
      active: act,
      byKind: { support: summarize("support"), lead: summarize("lead") },
    };
  }, [tokens]);

  const shown = active.slice(0, VISIBLE);
  const hidden = active.length - shown.length;

  return (
    <Card
      className="mb-6"
      title={
  <span className="inline-flex items-center gap-2">
    Live Tokens
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  </span>
}
subtitle={`Support: ${byKind.support.pending} pending · ${byKind.support.ongoing} ongoing · ${byKind.support.completed} completed  |  Lead: ${byKind.lead.pending} pending · ${byKind.lead.ongoing} ongoing · ${byKind.lead.completed} completed`}
action={
  <Button variant="secondary" size="sm" onClick={onViewAll}>
    View all tokens
  </Button>
}
    >
      {shown.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-subtle">
          No active tokens. Customers waiting for help will appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((t) => (
            <div key={t.id} className="rounded-xl border border-line bg-surface-muted p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold text-brand">{formatTokenNo(t.id)}</span>
                <span className="ml-auto mr-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-brand">{t.kind} token</span>
                <TokenProgressBadge progress={t.progress} />
              </div>
              <p className="mt-2 font-medium text-fg">{t.customerName}</p>
              <p className="text-sm text-fg-muted">{t.mobileNo} · {t.software}</p>
              <p className="mt-2 text-xs text-fg-subtle">
                By {t.createdBy.name} · {formatDateTime(t.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 text-sm font-medium text-brand hover:underline"
        >
          + {hidden} more active token{hidden > 1 ? "s" : ""} — view all
        </button>
      )}
    </Card>
  );
};

export default TokenPanel;
