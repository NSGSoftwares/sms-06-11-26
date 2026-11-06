export type Role = "admin" | "support" | "caller";

export interface User {
  id: string;
  name: string;
  mobileNo: string;
  username: string;
  role: Role;
  email: string;
  phone: string;
  isActive: boolean;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserPublic = Omit<User, "passwordHash" | "salt">;

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: Role;
}

export interface UserInput {
  name: string;
  mobileNo: string;
  username: string;
  password: string;
  role: Role | "";
}
