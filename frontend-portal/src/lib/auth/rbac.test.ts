import { describe, expect, it } from "vitest";

import {
  getHomePath,
  getPostLoginPath,
  isRoleAllowedPath,
} from "@/lib/auth/rbac";

describe("portal route grants", () => {
  it("keeps employee and admin workspaces isolated", () => {
    expect(isRoleAllowedPath("EMPLOYEE", "/employee/contracts/new")).toBe(true);
    expect(isRoleAllowedPath("EMPLOYEE", "/admin/contracts")).toBe(false);
    expect(isRoleAllowedPath("ADMIN", "/admin/contracts/contract-01")).toBe(true);
    expect(isRoleAllowedPath("ADMIN", "/employee/leads")).toBe(false);
  });

  it("does not allow prefix lookalikes", () => {
    expect(isRoleAllowedPath("ADMIN", "/administrator/contracts")).toBe(false);
    expect(isRoleAllowedPath("EMPLOYEE", "/employee-records")).toBe(false);
  });

  it("returns safe role homes and rejects external post-login redirects", () => {
    expect(getHomePath("EMPLOYEE")).toBe("/employee/leads");
    expect(getHomePath("ADMIN")).toBe("/admin/contracts");
    expect(getPostLoginPath("ADMIN", "https://example.com")).toBe("/admin/contracts");
    expect(getPostLoginPath("EMPLOYEE", "//example.com")).toBe("/employee/leads");
    expect(getPostLoginPath("ADMIN", "/admin/tasks")).toBe("/admin/tasks");
  });
});
