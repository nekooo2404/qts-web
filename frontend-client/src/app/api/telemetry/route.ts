import { NextResponse } from "next/server";
import { z } from "zod";

import { recordServerEvent } from "@/lib/telemetry/server";

const telemetrySchema = z
  .object({
    type: z.enum(["web-vital", "client-error"]),
    name: z.string().min(1).max(80),
    path: z.string().min(1).max(300),
    release: z.string().min(1).max(120),
    source: z.string().max(40).optional(),
    id: z.string().max(120).optional(),
    rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
    value: z.number().finite().optional(),
  })
  .strict();

export async function POST(request: Request) {
  if (process.env.TELEMETRY_INGEST_ENABLED !== "true") {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) return new NextResponse(null, { status: 413 });

  const parsed = telemetrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  recordServerEvent({
    event: parsed.data.type,
    attributes: {
      name: parsed.data.name,
      path: parsed.data.path,
      release: parsed.data.release,
      source: parsed.data.source,
      id: parsed.data.id,
      rating: parsed.data.rating,
      value: parsed.data.value,
    },
  });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
