import type { DatabasePool } from '../../database/database.types.js';
import type { ProjectRepository } from './project.repository.js';
import type { ProjectListQuery, PublicProject } from './project.types.js';

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
  published_at: Date;
}

interface CountRow {
  total: string;
}

function mapProject(row: ProjectRow): PublicProject {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    category: row.category,
    publishedAt: row.published_at,
  };
}

export class PgProjectRepository implements ProjectRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listPublished(query: ProjectListQuery) {
    const values: unknown[] = [];
    const filters = ["status = 'PUBLISHED'"];
    if (query.category !== undefined) {
      values.push(query.category);
      filters.push(`lower(category) = lower($${values.length})`);
    }
    const whereClause = filters.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const pageSizeParameter = values.push(query.pageSize);
    const offsetParameter = values.push(offset);

    const [itemsResult, countResult] = await Promise.all([
      this.pool.query<ProjectRow>(
        `SELECT id, title, description, image_url, category, published_at
         FROM public.projects
         WHERE ${whereClause}
         ORDER BY sort_order ASC, published_at DESC, id ASC
         LIMIT $${pageSizeParameter} OFFSET $${offsetParameter}`,
        values,
      ),
      this.pool.query<CountRow>(
        `SELECT count(*)::text AS total
         FROM public.projects
         WHERE ${whereClause}`,
        values.slice(0, values.length - 2),
      ),
    ]);

    return {
      items: itemsResult.rows.map(mapProject),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async findPublishedById(id: string): Promise<PublicProject | null> {
    const result = await this.pool.query<ProjectRow>(
      `SELECT id, title, description, image_url, category, published_at
       FROM public.projects
       WHERE id = $1 AND status = 'PUBLISHED'`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapProject(row) : null;
  }
}
