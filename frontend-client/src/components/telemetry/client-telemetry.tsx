"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

const telemetryEnabled = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "true";

function send(event: Record<string, string | number | boolean | undefined>) {
  const body = JSON.stringify({
    ...event,
    release: process.env.NEXT_PUBLIC_APP_RELEASE ?? "development",
    path: window.location.pathname,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export function ClientTelemetry() {
  useReportWebVitals((metric) => {
    if (!telemetryEnabled) return;
    send({
      type: "web-vital",
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });
  });

  useEffect(() => {
    if (!telemetryEnabled) return;
    const handleError = (event: ErrorEvent) => {
      send({ type: "client-error", name: event.error?.name ?? "Error", source: "window" });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      send({
        type: "client-error",
        name: event.reason instanceof Error ? event.reason.name : "UnhandledRejection",
        source: "promise",
      });
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
