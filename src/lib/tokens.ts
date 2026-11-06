// File: sms-frontend/src/lib/tokens.ts
import type { Token } from "@/types";

// Registry mapping UUID -> sequential token_number (e.g. "18fdeda7..." -> 1)
const uuidToNumMap = new Map<string, number>();

/**
 * Register a token's UUID-to-number mapping
 */
export const registerTokenNo = (uuid: string, num: number | string): void => {
  if (uuid && num) {
    const n = Number(num);
    if (!Number.isNaN(n) && n > 0) {
      uuidToNumMap.set(String(uuid), n);
    }
  }
};

/**
 * Formats token for UI display: T1, T2, T3...
 * Accepts:
 * - Token object: formatTokenNo(token)
 * - Number: formatTokenNo(1) -> "T1"
 * - Numeric string: formatTokenNo("1") -> "T1"
 * - UUID string: formatTokenNo("18fdeda7...") -> looks up registered number -> "T1"
 */
export const formatTokenNo = (
  input: Token | number | string | null | undefined
): string => {
  if (input == null || input === "") return "T-—";

  // 1. If passed a Token object
  if (typeof input === "object" && input !== null) {
    const uuid = String(input.id || "");
    const num = Number(
      (input as any).tokenNumber ??
      (input as any).token_number ??
      uuidToNumMap.get(uuid) ??
      0
    );
    if (uuid && num > 0) registerTokenNo(uuid, num);
    return num > 0 ? `T${num}` : "T-—";
  }

  // 2. If passed a number directly: 1 -> "T1"
  if (typeof input === "number") {
    return input > 0 ? `T${input}` : "T-—";
  }

  // 3. If passed a string
  const str = String(input).trim();
  if (!str) return "T-—";

  // Already formatted (e.g. "T1" or "T-0001")
  if (str.startsWith("T") || str.startsWith("t")) {
    return str;
  }

  // Check if string is a numeric string (e.g. "1", "12")
  const parsedNum = Number(str);
  if (!Number.isNaN(parsedNum) && parsedNum > 0 && str.length < 10) {
    return `T${parsedNum}`;
  }

  // Check if string is a UUID (e.g. "18fdeda7-4b7b...") registered in our lookup map
  if (uuidToNumMap.has(str)) {
    const mappedNum = uuidToNumMap.get(str)!;
    return `T${mappedNum}`;
  }

  return "T-—";
};

export const isActiveToken = (token: Token | null | undefined): boolean => {
  if (!token) return false;
  return String(token.progress || "").toLowerCase() !== "completed";
};

export const oldestFirst = (tokens: Token[]): Token[] => {
  if (!Array.isArray(tokens)) return [];

  return [...tokens].sort((a, b) => {
    const numA = Number(
      (a as any)?.tokenNumber ??
      (a as any)?.token_number ??
      uuidToNumMap.get(String(a?.id)) ??
      0
    );
    const numB = Number(
      (b as any)?.tokenNumber ??
      (b as any)?.token_number ??
      uuidToNumMap.get(String(b?.id)) ??
      0
    );

    if (numA > 0 && numB > 0) return numA - numB;

    const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
};