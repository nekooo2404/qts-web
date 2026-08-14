import { PortalShell } from "@/components/portal/portal-shell";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return <PortalShell session={session}>{children}</PortalShell>;
}
