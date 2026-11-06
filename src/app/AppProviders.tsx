import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { RecordsProvider } from "@/context/RecordsContext";
import { TokensProvider } from "@/context/TokensContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/ui/ToastProvider";

// Provider order matters: RecordsProvider reads the logged-in user from
// AuthProvider. Put the Router OUTSIDE this component (see main.tsx).
const AppProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <RecordsProvider>
          <TokensProvider>{children}</TokensProvider>
        </RecordsProvider>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
);

export default AppProviders;
