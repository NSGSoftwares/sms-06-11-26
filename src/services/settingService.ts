// File: sms-frontend/src/services/settingService.ts

import { api } from "./api";
import type { CustomerImportRow } from "@/lib/customerImport";

export const lookupCustomerBySerial = async (serialNo: string) => {
  const response = await api.get("/settings/customers/lookup", { serial_no: serialNo });
  return response.data as { serial_no: string; customer_name: string; mobile_no: string; product: string | null } | null;
};

export const importCustomers = async (rows: CustomerImportRow[]) => {
  const response = await api.post("/settings/customers/import", { rows });
  return response.data as { imported: number };
};

export interface AppSettings {
  products: string[];
  offers: string[];
  serial_entry_deadline_seconds: number;
  auto_signout_days: number;
  signout_on_browser_close: boolean;
  wa_url: string;
  wa_vendor_uid: string;
  wa_token: string;
  wa_template_name: string;
  wa_template_lang: string;
  wa_template_variables: string[];
}

export interface WhatsAppTestResponse {
  success: boolean;
  ok: boolean;
  message: string;
  data?: {
    ok?: boolean;
    mode?: "text" | "template";
    http_code?: number;
    response?: unknown;
    preview?: string;
    request_url?: string;
    request_body?: unknown;
    details?: unknown;
  };
}

export const getSettings = async (): Promise<AppSettings> => {
  const res = await api.get("/settings");

  const response = (res as any).data ?? res;
  const data = response?.data ?? response;

  return {
    products: Array.isArray(data.products) ? data.products : [],
    offers: Array.isArray(data.offers) ? data.offers : [],
    serial_entry_deadline_seconds: Math.max(5, Math.min(300, Number(data.serial_entry_deadline_seconds) || 15)),
    auto_signout_days: Math.max(0, Math.min(7, Number(data.auto_signout_days) || 0)),
    signout_on_browser_close: Boolean(Number(data.signout_on_browser_close ?? 0)),
    wa_url: data.wa_url || "https://wabstack.in/api",
    wa_vendor_uid: data.wa_vendor_uid ?? "",
    wa_token: data.wa_token ?? "",
    wa_template_name: data.wa_template_name ?? "",
    wa_template_lang: data.wa_template_lang || "en",
    wa_template_variables: Array.isArray(data.wa_template_variables)
      ? data.wa_template_variables
      : typeof data.wa_template_variables === "string"
        ? data.wa_template_variables.split(",").map((name: string) => name.trim()).filter(Boolean)
        : [],
  };
};

export const updateSettings = async (
  data: AppSettings
): Promise<AppSettings> => {
  // Shared hosting/WAF rules can reject PUT with an HTML 403 before PHP runs.
  // POST is allowed by the API router and is more compatible with those hosts.
  const res = await api.post("/settings", data);

  const response = (res as any).data ?? res;

  return response?.data ?? response;
};

export const testWhatsApp = async (payload: {
  phone: string;
  message?: string;
  wa_url?: string;
  wa_vendor_uid?: string;
  wa_token?: string;
  wa_template_name?: string;
  wa_template_lang?: string;
  wa_template_variables?: string[];
  wa_template_params?: string[];
}): Promise<WhatsAppTestResponse> => {
  const res = await api.post("/settings/whatsapp-test", payload);
  const body = (res as any)?.data ?? res;

  const success = body?.success === true || body?.ok === true;

  return { ...body, success, ok: success };
};

