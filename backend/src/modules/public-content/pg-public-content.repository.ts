import type { PaginationResult } from '../../common/pagination.js';
import type { DatabasePool } from '../../database/database.types.js';
import type {
  PublicContentRepository,
  PublicListQuery,
} from './public-content.repository.js';
import type {
  CompanyInfo,
  PublicCapability,
  PublicMetric,
  PublicSolution,
} from './public-content.types.js';

interface CountRow {
  total: string;
}

interface CapabilityRow {
  id: string;
  title: string;
  description: string;
  icon_url: string | null;
}

interface SolutionRow {
  id: string;
  problem: string;
  solution: string;
  description: string;
}

interface MetricRow {
  id: string;
  key: string;
  label: string;
  value: string;
  suffix: string | null;
}

interface CompanyInfoRow {
  about: string;
  vision: string;
  mission: string;
  address: string;
  hotline: string;
  updated_at: Date;
}

export class PgPublicContentRepository implements PublicContentRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listCapabilities(
    query: PublicListQuery,
  ): Promise<PaginationResult<PublicCapability>> {
    const offset = (query.page - 1) * query.pageSize;
    const [items, count] = await Promise.all([
      this.pool.query<CapabilityRow>(
        `SELECT id, title, description, icon_url
         FROM public.capabilities
         WHERE status = 'PUBLISHED'
         ORDER BY sort_order ASC, published_at DESC, id ASC
         LIMIT $1 OFFSET $2`,
        [query.pageSize, offset],
      ),
      this.pool.query<CountRow>(
        "SELECT count(*)::text AS total FROM public.capabilities WHERE status = 'PUBLISHED'",
      ),
    ]);

    return {
      items: items.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        iconUrl: row.icon_url,
      })),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async listSolutions(
    query: PublicListQuery,
  ): Promise<PaginationResult<PublicSolution>> {
    const offset = (query.page - 1) * query.pageSize;
    const [items, count] = await Promise.all([
      this.pool.query<SolutionRow>(
        `SELECT id, problem, solution, description
         FROM public.solutions
         WHERE status = 'PUBLISHED'
         ORDER BY sort_order ASC, published_at DESC, id ASC
         LIMIT $1 OFFSET $2`,
        [query.pageSize, offset],
      ),
      this.pool.query<CountRow>(
        "SELECT count(*)::text AS total FROM public.solutions WHERE status = 'PUBLISHED'",
      ),
    ]);

    return {
      items: items.rows,
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async listMetrics(
    query: PublicListQuery,
  ): Promise<PaginationResult<PublicMetric>> {
    const offset = (query.page - 1) * query.pageSize;
    const [items, count] = await Promise.all([
      this.pool.query<MetricRow>(
        `SELECT id, key, label, value, suffix
         FROM public.cms_metrics
         WHERE status = 'PUBLISHED'
         ORDER BY sort_order ASC, published_at DESC, id ASC
         LIMIT $1 OFFSET $2`,
        [query.pageSize, offset],
      ),
      this.pool.query<CountRow>(
        "SELECT count(*)::text AS total FROM public.cms_metrics WHERE status = 'PUBLISHED'",
      ),
    ]);

    return {
      items: items.rows,
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async getCompanyInfo(): Promise<CompanyInfo | null> {
    const result = await this.pool.query<CompanyInfoRow>(
      `SELECT about, vision, mission, address, hotline, updated_at
       FROM public.company_info
       WHERE singleton_key = TRUE`,
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      about: row.about,
      vision: row.vision,
      mission: row.mission,
      address: row.address,
      hotline: row.hotline,
      updatedAt: row.updated_at,
    };
  }
}
