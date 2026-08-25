import { z } from "zod";

export const fallbackModeSchema = z.enum(["error", "fixture"]);

export function resolveFallbackMode(
  nodeEnv = process.env.NODE_ENV,
  configuredMode = process.env.CMS_FALLBACK_MODE,
) {
  if (configuredMode) return fallbackModeSchema.parse(configuredMode);
  return nodeEnv === "production" ? "error" : "fixture";
}

const paginated = <T extends z.ZodType>(itemSchema: T) =>
  z.object({ data: z.array(itemSchema).max(100) });

export const capabilitiesResponseSchema = paginated(
  z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(1200),
  }),
);

export const projectsResponseSchema = paginated(
  z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(1600),
    imageUrl: z.string().min(1).max(2048),
    category: z.string().trim().min(1).max(120),
  }),
);

export const solutionsResponseSchema = paginated(
  z.object({
    id: z.string().min(1),
    problem: z.string().trim().min(1).max(1200),
    solution: z.string().trim().min(1).max(1200),
    description: z.string().trim().min(1).max(1600),
  }),
);

export const companyInfoResponseSchema = z.object({
  data: z.object({
    about: z.string().trim().min(1).max(2400),
    address: z.string().trim().min(1).max(500),
    hotline: z.string().trim().min(1).max(64),
    mission: z.string().trim().min(1).max(1600),
    vision: z.string().trim().min(1).max(1600),
    email: z.string().trim().email().optional(),
    hours: z.string().trim().min(1).max(240).optional(),
  }),
});

export type ContentSource = "cms" | "fixture";
export type ContentFailureReason =
  | "configuration"
  | "http"
  | "invalid-payload"
  | "network"
  | "timeout";

export interface PublicContentResult<T> {
  data: T;
  source: ContentSource;
  fetchedAt: string;
  reason?: ContentFailureReason;
}
