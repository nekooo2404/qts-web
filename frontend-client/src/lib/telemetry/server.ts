import "server-only";

type TelemetryLevel = "info" | "warn" | "error";

interface ServerTelemetryEvent {
  event: string;
  level?: TelemetryLevel;
  requestId?: string;
  attributes?: Record<string, string | number | boolean | null | undefined>;
  error?: unknown;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }
  return error ? { message: String(error) } : undefined;
}

export function recordServerEvent({
  event,
  level = "info",
  requestId,
  attributes,
  error,
}: ServerTelemetryEvent) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: "qts-frontend-client",
    release: process.env.NEXT_PUBLIC_APP_RELEASE ?? "development",
    event,
    requestId,
    attributes,
    error: serializeError(error),
  });
  console[level](payload);
}
