import { useAuth } from "@/hooks/useAuth";
import { useTokens } from "@/hooks/useTokens";
import { canUseTokens } from "@/lib/permissions";

const ActiveTokenCount = () => {
  const { user } = useAuth();
  const { tokens } = useTokens();

  if (!canUseTokens(user)) {
    return null;
  }

  // The token API already scopes caller/support queues by token type. Do not
  // apply record-owner visibility here: admin-generated tokens are visible to
  // staff but are not owned by the staff user.
  const count = tokens.filter((token) =>
    String(token.progress).toLowerCase() === "pending",
  ).length;

  if (count === 0) {
    return null;
  }

  return (
    <span
      className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning"
      aria-label={`${count} pending tokens`}
    >
      {count}
    </span>
  );
};

export default ActiveTokenCount;
