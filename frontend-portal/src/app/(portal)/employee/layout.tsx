import { PortalShell } from "@/components/portal/portal-shell";
import { requireRole } from "@/lib/auth/require-role";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("EMPLOYEE");
  return <PortalShell session={session}>{children}</PortalShell>;
}
