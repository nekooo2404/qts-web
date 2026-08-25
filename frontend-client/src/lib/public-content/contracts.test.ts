import { describe, expect, it } from "vitest";

import {
  capabilitiesResponseSchema,
  companyInfoResponseSchema,
  resolveFallbackMode,
} from "./contracts";

describe("public content contracts", () => {
  it("fails closed by default in production", () => {
    expect(resolveFallbackMode("production", undefined)).toBe("error");
  });

  it("uses fixtures by default only outside production", () => {
    expect(resolveFallbackMode("development", undefined)).toBe("fixture");
    expect(resolveFallbackMode("test", undefined)).toBe("fixture");
  });

  it("allows an explicit preview fixture policy", () => {
    expect(resolveFallbackMode("production", "fixture")).toBe("fixture");
  });

  it("rejects unknown fallback policies", () => {
    expect(() => resolveFallbackMode("production", "silent")).toThrow();
  });

  it("validates bounded CMS payloads", () => {
    expect(
      capabilitiesResponseSchema.parse({
        data: [{ id: "capability", title: "Architecture", description: "Bounded content" }],
      }).data,
    ).toHaveLength(1);
    expect(() => capabilitiesResponseSchema.parse({ data: [{ id: "", title: "", description: "" }] })).toThrow();
  });

  it("rejects malformed company contact data", () => {
    expect(() => companyInfoResponseSchema.parse({ data: { about: "QTS" } })).toThrow();
  });
});
