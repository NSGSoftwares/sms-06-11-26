import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authenticate, getSessionUser, logoutUser } from "@/services/userService";
import type { SessionUser } from "@/types";
import { getSettings } from "@/services/settingService";

export type LoginResult = { ok: true } | { ok: false; error: string };

export interface AuthContextValue {
  user: SessionUser | null;
  /** True while a saved session is being restored after a refresh. */
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

// The bearer token is persisted by userService and validated by the API on restore.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const savedToken = localStorage.getItem("auth_token");
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const settings = await getSettings();
        if (settings.signout_on_browser_close && sessionStorage.getItem("auth_browser_session") !== savedToken) {
          await logoutUser();
          if (!cancelled) setLoading(false);
          return;
        }
        sessionStorage.setItem("auth_browser_session", savedToken);
        const restored = await getSessionUser();
        if (!cancelled) setUser(restored);
        if (!restored) localStorage.removeItem("auth_token");
      } catch {
        // Could not read the database - treat as logged out.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  // Poll the centrally managed absolute session duration. Server middleware
  // enforces the same limit on every API request; this signs out idle tabs too.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const check = async () => {
      try {
        const settings = await getSettings();
        const days = Number(settings.auto_signout_days) || 0;
        let signedInAt = Number(localStorage.getItem("auth_signed_in_at"));
        if (!signedInAt) {
          signedInAt = Date.now();
          localStorage.setItem("auth_signed_in_at", String(signedInAt));
        }
        if (!cancelled && days > 0 && Date.now() - signedInAt >= days * 86_400_000) {
          setUser(null);
          void logoutUser();
        }
      } catch {
        // 401 clears the token in api.ts; also clear the stale authenticated UI.
        if (!cancelled && !localStorage.getItem("auth_token")) setUser(null);
      }
    };
    void check();
    const interval = window.setInterval(() => void check(), 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [user?.id]);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      try {
        const found = await authenticate(username, password);

        if (!found) {
          return { ok: false, error: "Invalid username or password." };
        }

        const token = localStorage.getItem("auth_token");
        if (token) sessionStorage.setItem("auth_browser_session", token);
        setUser(found);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Login failed. Please try again.",
        };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    void logoutUser().catch(() => {
      // Local credentials are cleared by logoutUser even if the API is unavailable.
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const refreshed = await getSessionUser();
    setUser(refreshed);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
