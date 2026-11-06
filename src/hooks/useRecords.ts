import { useContext } from "react";
import {
  RecordsContext,
  type RecordsContextValue,
} from "@/context/RecordsContext";

export const useRecords = (): RecordsContextValue => {
  const context = useContext(RecordsContext);

  if (!context) {
    throw new Error("useRecords must be used inside <RecordsProvider>.");
  }

  return context;
};
