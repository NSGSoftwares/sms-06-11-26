// File: src/features/tokens/TokenSelect.tsx
import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTokens } from "@/hooks/useTokens";
import { canUseTokens, visibleTokensTo } from "@/lib/permissions";
import {
  formatTokenNo,
  isActiveToken,
  oldestFirst,
} from "@/lib/tokens";
import { Field, SelectInput } from "@/components/ui/Field";
import { TOKEN_PROGRESS_LABEL } from "@/config";
import type { Token } from "@/types";

interface TokenSelectProps {
  kind?: "support" | "lead";
  mobileNo?: string;
  value: string | number | null;
  onChange: (token: Token | null) => void;
}

const TokenSelect = ({ mobileNo = "", value, onChange, kind = "support" }: TokenSelectProps) => {
  const { user } = useAuth();
  const { tokens, reload } = useTokens();
  const allowed = canUseTokens(user);

  useEffect(() => {
    if (allowed) void reload?.();
  }, [allowed, reload]);

  const active = useMemo(() => {
    if (!allowed || !Array.isArray(tokens)) return [];
    return oldestFirst(
      visibleTokensTo(user, tokens).filter(isActiveToken).filter((token) => token.kind === kind)
    );
  }, [allowed, user, tokens, kind]);

  const normalizedMobile = (mobileNo || "").replace(/\D/g, "");
  const matches = useMemo(() => {
    if (!normalizedMobile) return [];
    return active.filter(
      (token) => String(token.mobileNo || "").replace(/\D/g, "") === normalizedMobile
    );
  }, [active, normalizedMobile]);

  const matchKey = matches.map((t) => String(t.id)).join(",");

  useEffect(() => {
    if (!allowed) {
      if (value !== null && value !== "") onChange(null);
      return;
    }
    // Auto-select if exactly one match exists for the typed mobile number and none is currently selected
    if ((value === null || value === "") && matches.length === 1) {
      onChange(matches[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, normalizedMobile, matchKey]);

  if (!allowed) return null;

  return (
    <Field
      label="Token"
      hint="Optional. Selecting marks On Going; saving completes it."
    >
      {(control) => (
        <SelectInput
          {...control}
          name="token"
          value={value !== null && value !== undefined ? String(value) : ""}
          onChange={(e) => {
            const selectedId = e.target.value;
            const foundToken = active.find((token) => String(token.id) === selectedId) ?? null;
            onChange(foundToken);
          }}
        >
          <option value="">No token</option>
          {active.map((token) => (
            <option key={String(token.id)} value={String(token.id)}>
              {typeof formatTokenNo === "function" ? formatTokenNo(token.id) : token.id} · {token.customerName} · {token.mobileNo} ·{" "}
              {TOKEN_PROGRESS_LABEL[token.progress] ?? token.progress}
            </option>
          ))}
        </SelectInput>
      )}
    </Field>
  );
};

export default TokenSelect;
