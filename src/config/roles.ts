import type { Role } from "@/types";

/** Where each role lands after login. */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  support: "/support",
  caller: "/caller",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  support: "Support Staff",
  caller: "Caller User",
};

export const DEMO_CREDENTIALS = [
  { role: "Admin", username: "admin", password: "admin123" },
  { role: "Support Staff", username: "support1", password: "support123" },
  { role: "Caller User", username: "caller1", password: "caller123" },
];
