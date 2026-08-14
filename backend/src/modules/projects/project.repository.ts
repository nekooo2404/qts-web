import type { PaginationResult } from '../../common/pagination.js';
import type { ProjectListQuery, PublicProject } from './project.types.js';

export interface ProjectRepository {
  listPublished(query: ProjectListQuery): Promise<PaginationResult<PublicProject>>;
  findPublishedById(id: string): Promise<PublicProject | null>;
}
