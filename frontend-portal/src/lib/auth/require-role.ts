import "server-only";

import { redirect } from "next/navigation";

import { getHomePath, type Role } from "@/lib/auth/rbac";
import { getPortalSession, type PortalSession } from "@/lib/auth/session";

export async function requireRole(expectedRole: Role): Promise<PortalSession> {
  const session = await getPortalSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== expectedRole) {
    redirect(getHomePath(session.role));
  }

  return session;
}
