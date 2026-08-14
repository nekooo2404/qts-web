import type { PaginationResult } from '../../common/pagination.js';
import type {
  CompanyInfo,
  PublicCapability,
  PublicMetric,
  PublicSolution,
} from './public-content.types.js';

export interface PublicListQuery {
  page: number;
  pageSize: number;
}

export interface PublicContentRepository {
  listCapabilities(query: PublicListQuery): Promise<PaginationResult<PublicCapability>>;
  listSolutions(query: PublicListQuery): Promise<PaginationResult<PublicSolution>>;
  listMetrics(query: PublicListQuery): Promise<PaginationResult<PublicMetric>>;
  getCompanyInfo(): Promise<CompanyInfo | null>;
}
