import type { DatabasePool } from '../../database/database.types.js';
import type {
  CmsListQuery,
  CmsMetric,
  CmsProject,
  CmsRepository,
  CmsSolution,
  CompanyProfile,
  CompanyProfileUpdate,
  MetricInput,
  MetricUpdate,
  ProjectInput,
  ProjectUpdate,
  SolutionInput,
  SolutionUpdate,
} from './cms.repository.js';

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
  status: CmsProject['status'];
  sort_order: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface SolutionRow {
  id: string;
  problem: string;
  solution: string;
  description: string;
  status: CmsSolution['status'];
  sort_order: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface MetricRow {
  id: string;
  key: string;
  label: string;
  value: string;
  suffix: string | null;
  status: CmsMetric['status'];
  sort_order: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CompanyRow {
  about: string;
  vision: string;
  mission: string;
  address: string;
  hotline: string;
  updated_at: Date;
}

interface CountRow {
  total: string;
}

const projectColumns = `id, title, description, image_url, category, status,
  sort_order, published_at, created_at, updated_at`;
const solutionColumns = `id, problem, solution, description, status, sort_order,
  published_at, created_at, updated_at`;
const metricColumns = `id, key, label, value, suffix, status, sort_order,
  published_at, created_at, updated_at`;

function mapProject(row: ProjectRow): CmsProject {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    category: row.category,
    status: row.status,
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSolution(row: SolutionRow): CmsSolution {
  return {
    id: row.id,
    problem: row.problem,
    solution: row.solution,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMetric(row: MetricRow): CmsMetric {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    value: row.value,
    suffix: row.suffix,
    status: row.status,
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompany(row: CompanyRow): CompanyProfile {
  return {
    about: row.about,
    vision: row.vision,
    mission: row.mission,
    address: row.address,
    hotline: row.hotline,
    updatedAt: row.updated_at,
  };
}

function listFilter(query: CmsListQuery): { values: unknown[]; where: string } {
  return query.status === undefined
    ? { values: [], where: '' }
    : { values: [query.status], where: 'WHERE status = $1' };
}

function assignments(
  input: object,
  columnByField: Readonly<Record<string, string>>,
): { set: string[]; values: unknown[] } {
  const values: unknown[] = [];
  const set = Object.entries(input).map(([field, value]) => {
    const column = columnByField[field];
    if (!column) throw new Error(`Unsupported CMS field: ${field}`);
    values.push(value);
    return `${column} = $${values.length}`;
  });
  return { set, values };
}

function addPublicationAssignment(
  status: CmsProject['status'] | undefined,
  set: string[],
  values: unknown[],
): void {
  if (status === undefined) return;
  values.push(status);
  set.push(
    `published_at = CASE WHEN $${values.length} = 'PUBLISHED' ` +
      `THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END`,
  );
}

export class PgCmsRepository implements CmsRepository {
  constructor(private readonly database: DatabasePool) {}

  async listProjects(query: CmsListQuery) {
    const { values: filterValues, where } = listFilter(query);
    const values = [...filterValues];
    const countValues = [...filterValues];
    const limitIndex = values.push(query.pageSize);
    const offsetIndex = values.push((query.page - 1) * query.pageSize);
    const [items, count] = await Promise.all([
      this.database.query<ProjectRow>(
        `SELECT ${projectColumns} FROM public.projects ${where}
         ORDER BY sort_order, id LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        values,
      ),
      this.database.query<CountRow>(
        `SELECT count(*)::text AS total FROM public.projects ${where}`,
        countValues,
      ),
    ]);
    return {
      items: items.rows.map(mapProject),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async findProjectById(id: string) {
    const result = await this.database.query<ProjectRow>(
      `SELECT ${projectColumns} FROM public.projects WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapProject(result.rows[0]) : null;
  }

  async createProject(input: ProjectInput, actorId: string) {
    const result = await this.database.query<ProjectRow>(
      `INSERT INTO public.projects
       (title, description, image_url, category, status, sort_order, published_at,
        created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,
         CASE WHEN $5 = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE NULL END,$7,$7)
       RETURNING ${projectColumns}`,
      [
        input.title,
        input.description,
        input.imageUrl,
        input.category,
        input.status,
        input.sortOrder,
        actorId,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Project insert returned no row');
    return mapProject(row);
  }

  async updateProject(id: string, input: ProjectUpdate, actorId: string) {
    const { set, values } = assignments(input, {
      title: 'title',
      description: 'description',
      imageUrl: 'image_url',
      category: 'category',
      status: 'status',
      sortOrder: 'sort_order',
    });
    addPublicationAssignment(input.status, set, values);
    values.push(actorId, id);
    const result = await this.database.query<ProjectRow>(
      `UPDATE public.projects SET ${set.join(', ')}, updated_by = $${values.length - 1}
       WHERE id = $${values.length} RETURNING ${projectColumns}`,
      values,
    );
    return result.rows[0] ? mapProject(result.rows[0]) : null;
  }

  async archiveProject(id: string, actorId: string) {
    return this.archive('projects', id, actorId);
  }

  async listSolutions(query: CmsListQuery) {
    const { values: filterValues, where } = listFilter(query);
    const values = [...filterValues];
    const countValues = [...filterValues];
    const limitIndex = values.push(query.pageSize);
    const offsetIndex = values.push((query.page - 1) * query.pageSize);
    const [items, count] = await Promise.all([
      this.database.query<SolutionRow>(
        `SELECT ${solutionColumns} FROM public.solutions ${where}
         ORDER BY sort_order, id LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        values,
      ),
      this.database.query<CountRow>(
        `SELECT count(*)::text AS total FROM public.solutions ${where}`,
        countValues,
      ),
    ]);
    return {
      items: items.rows.map(mapSolution),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async findSolutionById(id: string) {
    const result = await this.database.query<SolutionRow>(
      `SELECT ${solutionColumns} FROM public.solutions WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapSolution(result.rows[0]) : null;
  }

  async createSolution(input: SolutionInput, actorId: string) {
    const result = await this.database.query<SolutionRow>(
      `INSERT INTO public.solutions
       (problem, solution, description, status, sort_order, published_at,
        created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,
         CASE WHEN $4 = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE NULL END,$6,$6)
       RETURNING ${solutionColumns}`,
      [
        input.problem,
        input.solution,
        input.description,
        input.status,
        input.sortOrder,
        actorId,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Solution insert returned no row');
    return mapSolution(row);
  }

  async updateSolution(id: string, input: SolutionUpdate, actorId: string) {
    const { set, values } = assignments(input, {
      problem: 'problem',
      solution: 'solution',
      description: 'description',
      status: 'status',
      sortOrder: 'sort_order',
    });
    addPublicationAssignment(input.status, set, values);
    values.push(actorId, id);
    const result = await this.database.query<SolutionRow>(
      `UPDATE public.solutions SET ${set.join(', ')}, updated_by = $${values.length - 1}
       WHERE id = $${values.length} RETURNING ${solutionColumns}`,
      values,
    );
    return result.rows[0] ? mapSolution(result.rows[0]) : null;
  }

  async archiveSolution(id: string, actorId: string) {
    return this.archive('solutions', id, actorId);
  }

  async listMetrics(query: CmsListQuery) {
    const { values: filterValues, where } = listFilter(query);
    const values = [...filterValues];
    const countValues = [...filterValues];
    const limitIndex = values.push(query.pageSize);
    const offsetIndex = values.push((query.page - 1) * query.pageSize);
    const [items, count] = await Promise.all([
      this.database.query<MetricRow>(
        `SELECT ${metricColumns} FROM public.cms_metrics ${where}
         ORDER BY sort_order, id LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        values,
      ),
      this.database.query<CountRow>(
        `SELECT count(*)::text AS total FROM public.cms_metrics ${where}`,
        countValues,
      ),
    ]);
    return {
      items: items.rows.map(mapMetric),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async findMetricById(id: string) {
    const result = await this.database.query<MetricRow>(
      `SELECT ${metricColumns} FROM public.cms_metrics WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapMetric(result.rows[0]) : null;
  }

  async createMetric(input: MetricInput, actorId: string) {
    const result = await this.database.query<MetricRow>(
      `INSERT INTO public.cms_metrics
       (key, label, value, suffix, status, sort_order, published_at,
        created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,
         CASE WHEN $5 = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE NULL END,$7,$7)
       RETURNING ${metricColumns}`,
      [
        input.key,
        input.label,
        input.value,
        input.suffix,
        input.status,
        input.sortOrder,
        actorId,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Metric insert returned no row');
    return mapMetric(row);
  }

  async updateMetric(id: string, input: MetricUpdate, actorId: string) {
    const { set, values } = assignments(input, {
      key: 'key',
      label: 'label',
      value: 'value',
      suffix: 'suffix',
      status: 'status',
      sortOrder: 'sort_order',
    });
    addPublicationAssignment(input.status, set, values);
    values.push(actorId, id);
    const result = await this.database.query<MetricRow>(
      `UPDATE public.cms_metrics SET ${set.join(', ')}, updated_by = $${values.length - 1}
       WHERE id = $${values.length} RETURNING ${metricColumns}`,
      values,
    );
    return result.rows[0] ? mapMetric(result.rows[0]) : null;
  }

  async archiveMetric(id: string, actorId: string) {
    return this.archive('cms_metrics', id, actorId);
  }

  async getCompanyProfile() {
    const result = await this.database.query<CompanyRow>(
      `SELECT about, vision, mission, address, hotline, updated_at
       FROM public.company_info WHERE singleton_key = TRUE`,
    );
    return result.rows[0] ? mapCompany(result.rows[0]) : null;
  }

  async updateCompanyProfile(input: CompanyProfileUpdate, actorId: string) {
    const { set, values } = assignments(input, {
      about: 'about',
      vision: 'vision',
      mission: 'mission',
      address: 'address',
      hotline: 'hotline',
    });
    values.push(actorId);
    const result = await this.database.query<CompanyRow>(
      `UPDATE public.company_info SET ${set.join(', ')}, updated_by = $${values.length}
       WHERE singleton_key = TRUE
       RETURNING about, vision, mission, address, hotline, updated_at`,
      values,
    );
    return result.rows[0] ? mapCompany(result.rows[0]) : null;
  }

  private async archive(
    table: 'cms_metrics' | 'projects' | 'solutions',
    id: string,
    actorId: string,
  ): Promise<boolean> {
    const result = await this.database.query(
      `UPDATE public.${table}
       SET status = 'ARCHIVED', published_at = NULL, updated_by = $2
       WHERE id = $1 AND status <> 'ARCHIVED'`,
      [id, actorId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
