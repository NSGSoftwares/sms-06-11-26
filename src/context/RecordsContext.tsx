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
import { canManageRecord } from "@/lib/permissions";
import {
  createCallerRecord,
  createSupportRecord,
  deleteCallerRecord,
  deleteSupportRecord,
  listCallerRecords,
  listSupportRecords,
  updateCallerRecord,
  updateRecordStatus,
  updateSupportRecord,
} from "@/services/recordService";
import type {
  CallerRecord,
  CallerRecordPatch,
  NewCallerRecord,
  NewSupportRecord,
  RecordKind,
  RecordStatus,
  SupportRecord,
  SupportRecordPatch,
} from "@/types";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

export interface RecordsContextValue {
  supportRecords: SupportRecord[];
  callerRecords: CallerRecord[];
  loading: boolean;
  error: string | null;
  addSupportRecord: (data: NewSupportRecord) => Promise<SupportRecord>;
  addCallerRecord: (data: NewCallerRecord) => Promise<CallerRecord>;
  editSupportRecord: (
    id: string,
    patch: SupportRecordPatch,
  ) => Promise<SupportRecord>;
  editCallerRecord: (
    id: string,
    patch: CallerRecordPatch,
  ) => Promise<CallerRecord>;
  removeSupportRecord: (id: string) => Promise<void>;
  removeCallerRecord: (id: string) => Promise<void>;
  changeStatus: (
    kind: RecordKind,
    id: string,
    status: RecordStatus,
  ) => Promise<void>;
  reload: () => Promise<void>;
}

export const RecordsContext = createContext<RecordsContextValue | undefined>(
  undefined,
);

const CHANNEL_NAME = "sms-records-changed";
const NOT_ALLOWED = "You do not have permission to change this record.";

const replaceById = <T extends { id: string }>(rows: T[], next: T): T[] =>
  rows.map((row) => (row.id === next.id ? next : row));

export const RecordsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  usePresenceHeartbeat();
  const [supportRecords, setSupportRecords] = useState<SupportRecord[]>([]);
  const [callerRecords, setCallerRecords] = useState<CallerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const reload = useCallback(async () => {
    try {
      const [support, caller] = await Promise.all([
        listSupportRecords(),
        listCallerRecords(),
      ]);
      setSupportRecords(support);
      setCallerRecords(caller);
      setError(null);
    } catch {
      setError("Could not load records from the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, user?.id]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };

    document.addEventListener("visibilitychange", onVisible);

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = () => void reload();
      channelRef.current = channel;
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [reload]);

  const notifyOtherTabs = useCallback(() => {
    channelRef.current?.postMessage("changed");
  }, []);

  const requireUser = useCallback(() => {
    if (!user) throw new Error("You must be logged in to do this.");
    return { id: user.id, name: user.name };
  }, [user]);

  const addSupportRecord = useCallback(
    async (data: NewSupportRecord) => {
      const saved = await createSupportRecord(data, requireUser());
      setSupportRecords((prev) => [saved, ...prev]);
      notifyOtherTabs();
      return saved;
    },
    [requireUser, notifyOtherTabs],
  );

  const addCallerRecord = useCallback(
    async (data: NewCallerRecord) => {
      const saved = await createCallerRecord(data, requireUser());
      setCallerRecords((prev) => [saved, ...prev]);
      if (data.sourceSupportId) {
        setSupportRecords((prev) => prev.map((record) =>
          record.id === data.sourceSupportId
            ? { ...record, feedbackCompleted: true }
            : record
        ));
      }
      notifyOtherTabs();
      return saved;
    },
    [requireUser, notifyOtherTabs],
  );

  const editSupportRecord = useCallback(
    async (id: string, patch: SupportRecordPatch) => {
      const by = requireUser();
      const existing = supportRecords.find((r) => r.id === id);

      if (existing && !canManageRecord(user, existing)) {
        throw new Error(NOT_ALLOWED);
      }

      const saved = await updateSupportRecord(id, patch, by);
      setSupportRecords((prev) => replaceById(prev, saved));
      notifyOtherTabs();
      return saved;
    },
    [requireUser, supportRecords, user, notifyOtherTabs],
  );

  const editCallerRecord = useCallback(
    async (id: string, patch: CallerRecordPatch) => {
      const by = requireUser();
      const existing = callerRecords.find((r) => r.id === id);

      if (existing && !canManageRecord(user, existing)) {
        throw new Error(NOT_ALLOWED);
      }

      const saved = await updateCallerRecord(id, patch, by);
      setCallerRecords((prev) => replaceById(prev, saved));
      notifyOtherTabs();
      return saved;
    },
    [requireUser, callerRecords, user, notifyOtherTabs],
  );

  const removeSupportRecord = useCallback(
    async (id: string) => {
      requireUser();
      const existing = supportRecords.find((r) => r.id === id);

      if (existing && !canManageRecord(user, existing)) {
        throw new Error(NOT_ALLOWED);
      }

      await deleteSupportRecord(id);
      setSupportRecords((prev) => prev.filter((r) => r.id !== id));
      notifyOtherTabs();
    },
    [requireUser, supportRecords, user, notifyOtherTabs],
  );

  const removeCallerRecord = useCallback(
    async (id: string) => {
      requireUser();
      const existing = callerRecords.find((r) => r.id === id);

      if (existing && !canManageRecord(user, existing)) {
        throw new Error(NOT_ALLOWED);
      }

      await deleteCallerRecord(id);
      setCallerRecords((prev) => prev.filter((r) => r.id !== id));
      notifyOtherTabs();
    },
    [requireUser, callerRecords, user, notifyOtherTabs],
  );

  const changeStatus = useCallback(
    async (kind: RecordKind, id: string, status: RecordStatus) => {
      if (!user || user.role !== "admin") {
        throw new Error(NOT_ALLOWED);
      }
      const saved = await updateRecordStatus(kind, id, status);
      if (kind === "support") {
        setSupportRecords((prev) => replaceById(prev, saved as SupportRecord));
      } else {
        setCallerRecords((prev) => replaceById(prev, saved as CallerRecord));
      }
      notifyOtherTabs();
    },
    [user, notifyOtherTabs],
  );

  const value = useMemo(
    () => ({
      supportRecords,
      callerRecords,
      loading,
      error,
      addSupportRecord,
      addCallerRecord,
      editSupportRecord,
      editCallerRecord,
      removeSupportRecord,
      removeCallerRecord,
      changeStatus,
      reload,
    }),
    [
      supportRecords,
      callerRecords,
      loading,
      error,
      addSupportRecord,
      addCallerRecord,
      editSupportRecord,
      editCallerRecord,
      removeSupportRecord,
      removeCallerRecord,
      changeStatus,
      reload,
    ],
  );

  return (
    <RecordsContext.Provider value={value}>
      {children}
    </RecordsContext.Provider>
  );
};
