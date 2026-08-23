import "server-only";

import {
  capabilities as capabilityFallback,
  companyInfo as companyFallback,
  projects as projectFallback,
  solutions as solutionFallback,
} from "@/data/site-content";
import type {
  PublicCompanyInfo,
  PublicProject,
  PublicSolution,
} from "@/types/public-content";

interface PaginatedResponse<T> {
  data: T[];
}

interface ApiCapability {
  id: string;
  title: string;
  description: string;
}

interface ApiProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
}

interface ApiSolution {
  id: string;
  problem: string;
  solution: string;
  description: string;
}

interface ApiCompanyInfo {
  about: string;
  address: string;
  hotline: string;
  mission: string;
  vision: string;
}

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

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const baseUrl = process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    const response = await fetch(new URL(path, baseUrl), { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Public API unavailable for ${path}`, error);
    return null;
  }
}

export async function getCapabilities(): Promise<typeof capabilityFallback> {
  const response = await getJson<PaginatedResponse<ApiCapability>>("/api/capabilities?pageSize=50");
  const records = new Map(response?.data.map((item) => [item.id, item]) ?? []);
  return capabilityFallback.map((item) => {
    const record = records.get(capabilityIds[item.iconKey]);
    return record ? { ...item, title: record.title, description: record.description } : item;
  });
}

export async function getProjects(): Promise<PublicProject[]> {
  const response = await getJson<PaginatedResponse<ApiProject>>("/api/projects?pageSize=50");
  const records = new Map(response?.data.map((item) => [item.id, item]) ?? []);
  return projectFallback.map((item) => {
    const record = records.get(projectIds[item.id]);
    return record
      ? { ...item, title: record.title, description: record.description, category: record.category }
      : item;
  });
}

export async function getSolutions(): Promise<PublicSolution[]> {
  const response = await getJson<PaginatedResponse<ApiSolution>>("/api/solutions?pageSize=50");
  const records = new Map(response?.data.map((item) => [item.id, item]) ?? []);
  return solutionFallback.map((item) => {
    const record = records.get(solutionIds[item.id]);
    return record ? { ...item, problem: record.problem, desiredState: record.description } : item;
  });
}

export async function getCompanyInfo(): Promise<PublicCompanyInfo> {
  const response = await getJson<{ data: ApiCompanyInfo }>("/api/company-info");
  return response ? { ...companyFallback, ...response.data } : companyFallback;
}

export async function getCompanyProfile(): Promise<PublicCompanyProfile | null> {
  const response = await getJson<{ data: ApiCompanyInfo }>("/api/company-info");
  return response?.data ?? null;
}
