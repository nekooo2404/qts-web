import type { RequestHandler } from 'express';

import { ApiError } from '../../common/api-error.js';
import { toPaginatedResponse } from '../../common/pagination.js';
import type { ProjectRepository } from './project.repository.js';
import { projectIdSchema, projectListQuerySchema } from './project.schema.js';
import type { PublicProject } from './project.types.js';

function serializeProject(project: PublicProject) {
  return {
    ...project,
    publishedAt: project.publishedAt.toISOString(),
  };
}

export function listProjectsController(repository: ProjectRepository): RequestHandler {
  return async (request, response) => {
    const parsedQuery = projectListQuerySchema.parse(request.query);
    const query = {
      page: parsedQuery.page,
      pageSize: parsedQuery.pageSize,
      ...(parsedQuery.category === undefined
        ? {}
        : { category: parsedQuery.category }),
    };
    const result = await repository.listPublished(query);

    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map(serializeProject),
      }),
    );
  };
}

export function getProjectController(repository: ProjectRepository): RequestHandler {
  return async (request, response) => {
    const id = projectIdSchema.parse(request.params.id);
    const project = await repository.findPublishedById(id);

    if (!project) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found');
    }

    response.json({ data: serializeProject(project) });
  };
}
