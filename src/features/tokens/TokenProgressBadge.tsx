import { TOKEN_PROGRESS } from "@/config";
import Badge from "@/components/ui/Badge";
import type { TokenProgress } from "@/types";

const TokenProgressBadge = ({ progress }: { progress: TokenProgress }) => {
  const meta = TOKEN_PROGRESS.find((p) => p.value === progress)!;
  return <Badge className={meta.badge}>{meta.label}</Badge>;
};

export default TokenProgressBadge;
