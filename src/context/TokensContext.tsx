// File: src/context/TokensContext.tsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { canUseTokens } from "@/lib/permissions";
import {
  createToken,
  listTokens,
  claimToken as claimTokenRequest,
  completeToken as completeTokenRequest,
} from "@/services/tokenService";
import type {
  NewToken,
  RecordKind,
  Token,
} from "@/types";

export interface TokensContextValue {
  tokens: Token[];
  loading: boolean;
  loadError: string | null;
  addToken: (data: NewToken) => Promise<Token>;
  claimToken: (id: string | number) => Promise<void>;
  completeToken: (
    id: string | number,
    record: { kind: RecordKind; id: string | number }
  ) => Promise<void>;
  reload: () => Promise<void>;
}

export const TokensContext = createContext<TokensContextValue | undefined>(
  undefined
);

const CHANNEL = "sms-tokens-changed";
const NOT_ALLOWED = "You do not have permission to use tokens.";

export const TokensProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const allowed = canUseTokens(user);

  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const reload = useCallback(async () => {
    if (!allowed) {
      setTokens([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    setLoading(true);
    try {
      const list = await listTokens();
      setTokens(Array.isArray(list) ? list : []);
      setLoadError(null);
    } catch (err) {
      console.error("Failed to load tokens", err);
      setTokens([]);
      setLoadError(err instanceof Error ? err.message : "Tokens could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void reload();
  }, [reload, user?.id]);

  useEffect(() => {
    if (!allowed) {
      channelRef.current?.close();
      channelRef.current = null;
      return;
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);

    const poll = window.setInterval(() => void reload(), 8000);

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => void reload();
      channelRef.current = channel;
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [allowed, reload]);

  const requireTokenAccess = useCallback(() => {
    if (!user) throw new Error("You must be logged in to do this.");
    if (!canUseTokens(user)) throw new Error(NOT_ALLOWED);
    return user;
  }, [user]);

  const replace = useCallback((next: Token) => {
    setTokens((prev) =>
      prev.map((token) => (String(token.id) === String(next.id) ? next : token))
    );
  }, []);

  const addToken = useCallback(
    async (data: NewToken) => {
      const u = requireTokenAccess();
      const token = await createToken(
        data,
        { id: u.id, name: u.name } as any,
        u.role
      );
      // Full reload so token_number / createdBy are correct from API
      await reload();
      channelRef.current?.postMessage("changed");
      return token;
    },
    [requireTokenAccess, reload]
  );

  const claimToken = useCallback(
    async (id: string | number) => {
      requireTokenAccess();
      const updated = await claimTokenRequest(id);
      replace(updated);
      channelRef.current?.postMessage("changed");
    },
    [requireTokenAccess, replace]
  );

  const completeToken = useCallback(
    async (
      id: string | number,
      record: { kind: RecordKind; id: string | number }
    ) => {
      requireTokenAccess();
      const updated = await completeTokenRequest(id, record.id);
      replace(updated);
      channelRef.current?.postMessage("changed");
    },
    [requireTokenAccess, replace]
  );

  const value = useMemo<TokensContextValue>(
    () => ({
      tokens: allowed ? tokens : [],
      loading: allowed ? loading : false,
      loadError: allowed ? loadError : null,
      addToken,
      claimToken,
      completeToken,
      reload,
    }),
    [allowed, tokens, loading, loadError, addToken, claimToken, completeToken, reload]
  );

  return (
    <TokensContext.Provider value={value}>{children}</TokensContext.Provider>
  );
};
