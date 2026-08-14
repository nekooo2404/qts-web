import { NextResponse } from "next/server";

import {
  DEMO_SESSION_COOKIE,
  getPostLoginPath,
  isRole,
} from "@/lib/auth/rbac";

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const roleValue = formData.get("role");
  const role = typeof roleValue === "string" ? roleValue : undefined;
  const returnToValue = formData.get("returnTo");
  const returnTo = typeof returnToValue === "string" ? returnToValue : null;

  if (!isRole(role)) {
    return new NextResponse(null, {
      headers: { Location: "/login?error=invalid-role" },
      status: 303,
    });
  }

  const response = new NextResponse(null, {
    headers: { Location: getPostLoginPath(role, returnTo) },
    status: 303,
  });
  response.cookies.set(DEMO_SESSION_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE(): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
