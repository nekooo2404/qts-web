import { NextResponse } from "next/server";
import { z } from "zod";

import { PRIVACY_NOTICE_VERSION } from "@/lib/privacy";
import { recordServerEvent } from "@/lib/telemetry/server";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(8).max(24),
    message: z.string().trim().min(10).max(4800),
    privacyConsent: z.literal(true),
    privacyNoticeVersion: z.literal(PRIVACY_NOTICE_VERSION),
  })
  .strict();

function backendUrl() {
  const baseUrl = process.env.BACKEND_API_URL?.trim();
  if (!baseUrl) return null;
  try {
    return new URL("/api/contact", baseUrl);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" }, requestId },
      { status: 413 },
    );
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 16_384) {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" }, requestId },
      { status: 413 },
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON" }, requestId },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(decoded);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid contact request" }, requestId },
      { status: 422 },
    );
  }

  const targetUrl = backendUrl();
  if (!targetUrl) {
    recordServerEvent({
      event: "contact_proxy_unavailable",
      level: "error",
      requestId,
      attributes: { reason: "configuration" },
    });
    return NextResponse.json(
      { error: { code: "SERVICE_UNAVAILABLE", message: "Contact service unavailable" }, requestId },
      { status: 503 },
    );
  }

  const consentAt = new Date().toISOString();
  const message = [
    parsed.data.message,
    "",
    "PRIVACY CONSENT",
    `Notice version: ${PRIVACY_NOTICE_VERSION}`,
    `Accepted at: ${consentAt}`,
  ].join("\n");

  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
      },
      body: JSON.stringify({
        customerName: parsed.data.customerName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const body = await response.json().catch(() => ({
      error: { code: "INVALID_UPSTREAM_RESPONSE", message: "Invalid upstream response" },
      requestId,
    }));
    recordServerEvent({
      event: response.ok ? "contact_proxy_succeeded" : "contact_proxy_failed",
      level: response.ok ? "info" : "warn",
      requestId,
      attributes: { status: response.status },
    });

    return NextResponse.json(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
        ...(response.headers.get("retry-after")
          ? { "Retry-After": response.headers.get("retry-after") as string }
          : {}),
      },
    });
  } catch (error) {
    recordServerEvent({
      event: "contact_proxy_failed",
      level: "error",
      requestId,
      attributes: { reason: error instanceof DOMException ? error.name : "network" },
      error,
    });
    return NextResponse.json(
      { error: { code: "SERVICE_UNAVAILABLE", message: "Contact service unavailable" }, requestId },
      { status: 503, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  }
}
