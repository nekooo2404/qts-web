export type Role = "EMPLOYEE" | "ADMIN";

export const DEMO_SESSION_COOKIE = "qts_portal_session";

const ROLE_HOME: Record<Role, string> = {
  EMPLOYEE: "/employee/leads",
  ADMIN: "/admin/contracts",
};

const ROLE_ROOT: Record<Role, string> = {
  EMPLOYEE: "/employee",
  ADMIN: "/admin",
};

export function isRole(value: string | undefined): value is Role {
  return value === "EMPLOYEE" || value === "ADMIN";
}

export function getHomePath(role: Role): string {
  return ROLE_HOME[role];
}

export function isRoleAllowedPath(role: Role, pathname: string): boolean {
  const root = ROLE_ROOT[role];
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function getPostLoginPath(role: Role, returnTo?: string | null): string {
  if (
    !returnTo ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    !isRoleAllowedPath(role, returnTo)
  ) {
    return getHomePath(role);
  }

  return returnTo;
}
