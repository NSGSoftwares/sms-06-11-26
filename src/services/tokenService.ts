// File: src/services/tokenService.ts
import type { NewToken, RecordOwner, Role, Token } from "@/types";
import { registerTokenNo } from "@/lib/tokens";
import { api } from "./api";

const assertCanCreateToken = (role?: Role): void => {
  void role;
};

/** Keep UUID strings — never Number(uuid) */
const asOwnerId = (value: unknown): string => {
  if (value == null || value === "") return "";
  if (typeof value === "object" && value !== null && "id" in (value as object)) {
    return String((value as { id: unknown }).id ?? "");
  }
  return String(value);
};

const mapProgress = (raw: unknown): Token["progress"] => {
  const s = String(raw || "Pending").toLowerCase();
  if (s === "on going" || s === "ongoing") return "ongoing";
  if (s === "completed") return "completed";
  return "pending";
};

export const mapToken = (t: any): Token => {
  const tokenNum = Number(t.token_number ?? t.tokenNumber ?? 0);
  const createdById = asOwnerId(t.created_by ?? t.createdBy?.id ?? t.createdBy);
  const createdByName = t.created_by_name || t.createdBy?.name || "Staff";

  if (t.id && tokenNum > 0) {
    registerTokenNo(String(t.id), tokenNum);
  }

  return {
    id: t.id,
    tokenNumber: tokenNum,
    customerName: t.customer_name || t.customerName || "",
    mobileNo: t.phone || t.mobileNo || "",
    software: t.software || "",
    kind: t.token_type === "lead" ? "lead" : "support",
    address: t.address || "",
    contactPersonName: t.contact_person_name || "",
    gstNumber: t.gst_number || "",
    progress: mapProgress(t.progress),
    progressDisplay: t.progress || "Pending",
    notes: t.notes || "",
    linkedRecord: t.linked_record_id ?? t.linkedRecord ?? null,
    createdBy: {
      id: createdById,
      name: createdByName,
    } as unknown as RecordOwner,
    createdByRole: (t.created_by_role || t.createdByRole || "support") as Role,
    createdAt: t.created_at || t.createdAt || new Date().toISOString(),
    updatedAt: t.updated_at || t.updatedAt || new Date().toISOString(),
    updatedBy:
      t.updated_by != null
        ? ({
            id: asOwnerId(t.updated_by),
            name: t.updated_by_name || "Staff",
          } as unknown as RecordOwner)
        : null,
    completedAt: t.completed_at ?? null,
  } as unknown as Token;
};

export const listTokens = async (): Promise<Token[]> => {
  const res = await api.get("/tokens");
  const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return list.map(mapToken);
};

export const createToken = async (
  data: NewToken,
  _by?: RecordOwner,
  role?: Role
): Promise<Token> => {
  assertCanCreateToken(role);

  const res = await api.post("/tokens", {
    customer_name: (data.customerName || "").trim(),
    token_type: data.kind,
    phone: data.mobileNo || (data as any).phone || "",
    software: data.software || null,
    notes: (data as any).notes || null,
    address: data.address || null,
    contact_person_name: data.contactPersonName || null,
    gst_number: data.gstNumber || null,
  });
  return mapToken(res.data);
};

export const claimToken = async (id: number | string): Promise<Token> => {
  const res = await api.post(`/tokens/${id}/claim`);
  return mapToken(res.data);
};

export const completeToken = async (
  id: number | string,
  recordId: number | string,
): Promise<Token> => {
  const res = await api.post(`/tokens/${id}/complete`, {
    linked_record_id: recordId,
  });
  return mapToken(res.data);
};

export const deleteToken = async (id: number | string): Promise<void> => {
  await api.post(`/tokens/${id}/discard`);
};

export const getLiveTokens = async (limit = 2, offset = 0) => {
  const res = await api.get("/tokens/live", { limit, offset });
  const items = Array.isArray(res.data?.data) ? res.data.data : [];
  return {
    data: items.map(mapToken),
    total: res.data?.total || items.length,
  };
};
