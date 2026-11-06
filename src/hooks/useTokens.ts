import { useContext } from "react";
import { TokensContext, type TokensContextValue } from "@/context/TokensContext";

export const useTokens = (): TokensContextValue => {
  const context = useContext(TokensContext);
  if (!context) throw new Error("useTokens must be used inside <TokensProvider>.");
  return context;
};
