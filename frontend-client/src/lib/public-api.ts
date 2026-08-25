import "server-only";

import { cache } from "react";
import type { z } from "zod";

import {
  capabilities as capabilityFallback,
  companyInfo as companyFallback,
  projects as projectFallback,
  solutions as solutionFallback,
} from "@/data/site-content";
import {
  capabilitiesResponseSchema,
  companyInfoResponseSchema,
  type ContentFailureReason,
  type PublicContentResult,
  projectsResponseSchema,
  resolveFallbackMode,
  solutionsResponseSchema,
} from "@/lib/public-content/contracts";
import { recordServerEvent } from "@/lib/telemetry/server";
import type { PublicCompanyInfo, PublicProject, PublicSolution } from "@/types/public-content";

type ApiCapability = z.infer<typeof capabilitiesResponseSchema>["data"][number];
type ApiProject = z.infer<typeof projectsResponseSchema>["data"][number];
type ApiSolution = z.infer<typeof solutionsResponseSchema>["data"][number];
type ApiCompanyInfo = z.infer<typeof companyInfoResponseSchema>["data"];

export type PublicCompanyProfile = ApiCompanyInfo;

const capabilityIds: Record<string, string> = {
  architecture: "77777777-7777-4777-8777-777777777777",
  integration: "88888888-8888-4888-8888-888888888888",
  security: "99999999-9999-4999-8999-999999999999",
  operations: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const projectIds: Record<string, string> = {
  "security-operations-center": "11111111-1111-4111-8111-111111111111",
  "enterprise-data-center": "22222222-2222-4222-8222-222222222222",
  "smart-city-platform": "33333333-3333-4333-8333-333333333333",
};
const solutionIds: Record<string, string> = {
  cybersecurity: "44444444-4444-4444-8444-444444444444",
  infrastructure: "55555555-5555-4555-8555-555555555555",
  "data-platform": "66666666-6666-4666-8666-666666666666",
};

const requestTimeoutMs = 3500;
const retryDelayMs = 180;
const configuredAttempts = Number(process.env.CMS_FETCH_ATTEMPTS ?? 2);
const maxAttempts = Number.isInteger(configuredAttempts)
  ? Math.min(3, Math.max(1, configuredAttempts))
  : 2;

class PublicContentUnavailableError extends Error {
  constructor(
    readonly path: string,
    readonly reason: ContentFailureReason,
    options?: ErrorOptions,
  ) {
    super(`Public content unavailable for ${path}`, options);
    this.name = "PublicContentUnavailableError";
  }
}

function backendBaseUrl() {
  const configuredUrl = process.env.BACKEND_API_URL?.trim();
  if (!configuredUrl) {
    throw new PublicContentUnavailableError("configuration", "configuration");
  }

  try {
    return new URL(configuredUrl.endsWith("/") ? configuredUrl : `${configuredUrl}/`);
  } catch (error) {
    throw new PublicContentUnavailableError("configuration", "configuration", { cause: error });
  }
}

function reasonFor(error: unknown): ContentFailureReason {
  if (error instanceof PublicContentUnavailableError) return error.reason;
  if (error instanceof DOMException && error.name === "TimeoutError") return "timeout";
  return "network";
}

async function waitBeforeRetry(attempt: number) {
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
}

async function fetchValidated<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let lastError: unknown;
  const fallbackMode = resolveFallbackMode();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch(new URL(path.replace(/^\//u, ""), backendBaseUrl()), {
        headers: { "X-Request-Id": requestId },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      if (!response.ok) {
        const error = new PublicContentUnavailableError(path, "http");
        lastError = error;
        recordServerEvent({
          event: "public_content_request_failed",
          level: attempt === maxAttempts && fallbackMode === "error" ? "error" : "warn",
          requestId,
          attributes: { path, status: response.status, attempt },
          error,
        });
        if (attempt < maxAttempts && (response.status === 429 || response.status >= 500)) {
          await waitBeforeRetry(attempt);
          continue;
        }
        break;
      }

      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) {
        lastError = new PublicContentUnavailableError(path, "invalid-payload", {
          cause: parsed.error,
        });
        break;
      }

      recordServerEvent({
        event: "public_content_request_succeeded",
        requestId,
        attributes: { path, attempt },
      });
      return parsed.data;
    } catch (error) {
      lastError = error;
      recordServerEvent({
        event: "public_content_request_failed",
        level: attempt === maxAttempts && fallbackMode === "error" ? "error" : "warn",
        requestId,
        attributes: { path, reason: reasonFor(error), attempt },
        error,
      });
      if (attempt < maxAttempts) await waitBeforeRetry(attempt);
    }
  }

  throw new PublicContentUnavailableError(path, reasonFor(lastError), { cause: lastError });
}

async function withFallback<T>(
  path: string,
  schema: z.ZodType<T>,
  fixture: T,
  allowOperationalFallback = false,
): Promise<PublicContentResult<T>> {
  try {
    return {
      data: await fetchValidated(path, schema),
      source: "cms",
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (resolveFallbackMode() === "error" && !allowOperationalFallback) throw error;
    const reason = reasonFor(error);
    recordServerEvent({
      event: "public_content_fixture_activated",
      level: "warn",
      attributes: { path, reason },
    });
    return { data: fixture, source: "fixture", fetchedAt: new Date().toISOString(), reason };
  }
}

function emptyCmsResult<T>(response: PublicContentResult<{ data: T[] }>) {
  return response.source === "cms" && response.data.data.length === 0;
}

export const getCapabilities = cache(async (): Promise<PublicContentResult<typeof capabilityFallback>> => {
  const response = await withFallback(
    "/api/capabilities?pageSize=50",
    capabilitiesResponseSchema,
    { data: [] },
  );
  if (emptyCmsResult(response)) {
    throw new PublicContentUnavailableError("/api/capabilities?pageSize=50", "invalid-payload");
  }
  const records = new Map<string, ApiCapability>(response.data.data.map((item) => [item.id, item]));
  const data = capabilityFallback.map((item) => {
    const record = records.get(capabilityIds[item.iconKey]);
    return record ? { ...item, title: record.title, description: record.description } : item;
  });
  return { ...response, data };
});

export const getProjects = cache(async (): Promise<PublicContentResult<PublicProject[]>> => {
  const response = await withFallback(
    "/api/projects?pageSize=50",
    projectsResponseSchema,
    { data: [] },
  );
  if (emptyCmsResult(response)) {
    throw new PublicContentUnavailableError("/api/projects?pageSize=50", "invalid-payload");
  }
  const records = new Map<string, ApiProject>(response.data.data.map((item) => [item.id, item]));
  const data = projectFallback.map((item) => {
    const record = records.get(projectIds[item.id]);
    return record
      ? { ...item, title: record.title, description: record.description, category: record.category }
      : item;
  });
  return { ...response, data };
});

export const getSolutions = cache(async (): Promise<PublicContentResult<PublicSolution[]>> => {
  const response = await withFallback(
    "/api/solutions?pageSize=50",
    solutionsResponseSchema,
    { data: [] },
  );
  if (emptyCmsResult(response)) {
    throw new PublicContentUnavailableError("/api/solutions?pageSize=50", "invalid-payload");
  }
  const records = new Map<string, ApiSolution>(response.data.data.map((item) => [item.id, item]));
  const data = solutionFallback.map((item) => {
    const record = records.get(solutionIds[item.id]);
    return record ? { ...item, problem: record.problem, desiredState: record.description } : item;
  });
  return { ...response, data };
});

export const getCompanyInfo = cache(async (): Promise<PublicContentResult<PublicCompanyInfo>> => {
  const response = await withFallback(
    "/api/company-info",
    companyInfoResponseSchema,
    { data: companyFallback },
    true,
  );
  return { ...response, data: { ...companyFallback, ...response.data.data } };
});

export const getCompanyProfile = cache(async (): Promise<PublicContentResult<PublicCompanyProfile | null>> => {
  const response = await withFallback(
    "/api/company-info",
    companyInfoResponseSchema,
    { data: companyFallback },
    true,
  );
  return { ...response, data: response.data.data };
});
