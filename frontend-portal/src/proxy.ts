import { NextResponse, type NextRequest } from "next/server";

import {
  DEMO_SESSION_COOKIE,
  getHomePath,
  isRole,
  isRoleAllowedPath,
} from "@/lib/auth/rbac";

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const roleValue = request.cookies.get(DEMO_SESSION_COOKIE)?.value;

  if (!isRole(roleValue)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!isRoleAllowedPath(roleValue, pathname)) {
    return NextResponse.redirect(new URL(getHomePath(roleValue), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/employee/:path*", "/admin/:path*"],
};
