import { redirect } from "next/navigation";

import { getHomePath } from "@/lib/auth/rbac";
import { getPortalSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getPortalSession();
  redirect(session ? getHomePath(session.role) : "/login");
}
