// File: sms-frontend/src/services/userService.ts
import type { User } from "@/types";
import type { Role } from "@/types";
import { api } from "./api";
import { getPresenceClientId } from "./presenceService";

const normalizeUser = (user: any): User =>
  ({
    id: String(user.id),
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email || "",
    phone: user.phone || user.mobileNo || "",
    mobileNo: user.phone || user.mobileNo || "",
    isProtected: user.role === "admin",
    isActive: Boolean(user.is_active ?? true),
    createdAt: user.created_at || new Date().toISOString(),
    updatedAt: user.updated_at || new Date().toISOString(),
  } as unknown as User);

export const authenticate = async (
  username: string,
  password: string
): Promise<User | null> => {
  try {
    const res = await api.post("/auth/login", { username, password });
    if (res.success && res.data) {
      localStorage.setItem("auth_token", res.data.token);
      localStorage.setItem("auth_user", JSON.stringify(res.data.user));
      localStorage.setItem("auth_signed_in_at", String(Date.now()));
      return normalizeUser(res.data.user);
    }
    return null;
  } catch (error) {
    console.error("Authentication failed:", error);
    throw error;
  }
};

export const getSessionUser = async (): Promise<User | null> => {
  const token = localStorage.getItem("auth_token");
  if (!token) return null;

  try {
    const res = await api.get("/auth/me");
    if (res.success && res.data) {
      localStorage.setItem("auth_user", JSON.stringify(res.data));
      if (!localStorage.getItem("auth_signed_in_at")) {
        localStorage.setItem("auth_signed_in_at", String(Date.now()));
      }
      return normalizeUser(res.data);
    }
  } catch (error) {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_signed_in_at");
    sessionStorage.removeItem("auth_browser_session");
    return null;
  }
  return null;
};

export const logoutUser = async (): Promise<void> => {
  try {
    await api.post("/auth/logout", {
      presence_client_id: getPresenceClientId(),
    });
  } finally {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_signed_in_at");
    sessionStorage.removeItem("auth_browser_session");
    sessionStorage.removeItem("sms_presence_client_id");
  }
};

export const listUsers = async (): Promise<User[]> => {
  const res = await api.get("/users?pageSize=100");
  const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return list.map(normalizeUser);
};

export const listStaff = async (role: Extract<Role, "support" | "caller">): Promise<Array<{ id: string; name: string; role: Role }>> => {
  const res = await api.get("/users/staff-list", { role });
  const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return list.map((staff: any) => ({
    id: String(staff.id),
    name: String(staff.name ?? staff.username ?? "Staff"),
    role: staff.role as Role,
  }));
};

export const createUser = async (data: any): Promise<User> => {
  const res = await api.post("/users", {
    username: data.username.trim(),
    password: data.password,
    name: data.name.trim(),
    role: data.role,
    email: data.email || null,
    phone: data.phone || data.mobileNo || null,
    mobileNo: data.mobileNo || data.phone || null,
  });
  return normalizeUser(res.data);
};

export const updateUser = async (
  id: string | number,
  patch: any
): Promise<User> => {
  const payload: any = {};
  if (patch.username) payload.username = patch.username.trim();
  if (patch.password && patch.password.trim() !== "") payload.password = patch.password;
  if (patch.name) payload.name = patch.name.trim();
  if (patch.role) payload.role = patch.role;
  if (patch.email !== undefined) payload.email = patch.email;
  if (patch.phone !== undefined || patch.mobileNo !== undefined) {
    payload.phone = patch.phone || patch.mobileNo;
  }
  if (patch.isActive !== undefined) payload.is_active = patch.isActive ? 1 : 0;

  // POST action routes are supported by cPanel/LiteSpeed setups that block
  // PUT requests before they reach the PHP API.
  const res = await api.post(`/users/${id}/update`, payload);
  return normalizeUser(res.data);
};

export const deleteUser = async (id: string | number): Promise<void> => {
  await api.post(`/users/${id}/delete`);
};
