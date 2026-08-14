import "server-only";

import { cookies } from "next/headers";

import { DEMO_SESSION_COOKIE, isRole, type Role } from "@/lib/auth/rbac";

export interface PortalSession {
  id: string;
  name: string;
  email: string;
  department: string;
  role: Role;
}

const DEMO_USERS: Record<Role, PortalSession> = {
  EMPLOYEE: {
    id: "employee-demo",
    name: "Nguyễn Minh Anh",
    email: "minh.anh@qts.vn",
    department: "Giải pháp số",
    role: "EMPLOYEE",
  },
  ADMIN: {
    id: "admin-demo",
    name: "Phạm Thu Hà",
    email: "thu.ha@qts.vn",
    department: "Vận hành",
    role: "ADMIN",
  },
};

export function getDemoSession(role: Role): PortalSession {
  return DEMO_USERS[role];
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
  return isRole(value) ? getDemoSession(value) : null;
}
