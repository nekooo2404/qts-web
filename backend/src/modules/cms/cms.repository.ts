import type { PaginationResult } from '../../common/pagination.js';

export const cmsStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type CmsStatus = (typeof cmsStatuses)[number];

interface CmsRecord {
  id: string;
  status: CmsStatus;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CmsProject extends CmsRecord {
  title: string;
  description: string;
  imageUrl: string;
  category: string;
}

export interface CmsSolution extends CmsRecord {
  problem: string;
  solution: string;
  description: string;
}

export interface CmsMetric extends CmsRecord {
  key: string;
  label: string;
  value: string;
  suffix: string | null;
}

export interface CompanyProfile {
  about: string;
  vision: string;
  mission: string;
  address: string;
  hotline: string;
  updatedAt: Date;
}

export interface CmsListQuery {
  page: number;
  pageSize: number;
  status?: CmsStatus | undefined;
}

export type ProjectInput = Omit<
  CmsProject,
  'id' | 'publishedAt' | 'createdAt' | 'updatedAt'
>;
export type SolutionInput = Omit<
  CmsSolution,
  'id' | 'publishedAt' | 'createdAt' | 'updatedAt'
>;
export type MetricInput = Omit<
  CmsMetric,
  'id' | 'publishedAt' | 'createdAt' | 'updatedAt'
>;
export type ProjectUpdate = {
  [K in keyof ProjectInput]?: ProjectInput[K] | undefined;
};
export type SolutionUpdate = {
  [K in keyof SolutionInput]?: SolutionInput[K] | undefined;
};
export type MetricUpdate = {
  [K in keyof MetricInput]?: MetricInput[K] | undefined;
};
export type CompanyProfileUpdate = {
  [K in keyof Omit<CompanyProfile, 'updatedAt'>]?:
    | Omit<CompanyProfile, 'updatedAt'>[K]
    | undefined;
};

export interface CmsRepository {
  listProjects(query: CmsListQuery): Promise<PaginationResult<CmsProject>>;
  findProjectById(id: string): Promise<CmsProject | null>;
  createProject(input: ProjectInput, actorId: string): Promise<CmsProject>;
  updateProject(
    id: string,
    input: ProjectUpdate,
    actorId: string,
  ): Promise<CmsProject | null>;
  archiveProject(id: string, actorId: string): Promise<boolean>;
  listSolutions(query: CmsListQuery): Promise<PaginationResult<CmsSolution>>;
  findSolutionById(id: string): Promise<CmsSolution | null>;
  createSolution(input: SolutionInput, actorId: string): Promise<CmsSolution>;
  updateSolution(
    id: string,
    input: SolutionUpdate,
    actorId: string,
  ): Promise<CmsSolution | null>;
  archiveSolution(id: string, actorId: string): Promise<boolean>;
  listMetrics(query: CmsListQuery): Promise<PaginationResult<CmsMetric>>;
  findMetricById(id: string): Promise<CmsMetric | null>;
  createMetric(input: MetricInput, actorId: string): Promise<CmsMetric>;
  updateMetric(
    id: string,
    input: MetricUpdate,
    actorId: string,
  ): Promise<CmsMetric | null>;
  archiveMetric(id: string, actorId: string): Promise<boolean>;
  getCompanyProfile(): Promise<CompanyProfile | null>;
  updateCompanyProfile(
    input: CompanyProfileUpdate,
    actorId: string,
  ): Promise<CompanyProfile | null>;
}
