import type { Request, RequestHandler, Response } from 'express';

import { ApiError } from '../../common/api-error.js';
import { toPaginatedResponse } from '../../common/pagination.js';
import type { CmsRepository } from './cms.repository.js';
import {
  cmsIdSchema,
  cmsListSchema,
  companyProfileUpdateSchema,
  metricInputSchema,
  metricUpdateSchema,
  projectInputSchema,
  projectUpdateSchema,
  solutionInputSchema,
  solutionUpdateSchema,
} from './cms.schema.js';

type ActorProvider = (request: Request, response: Response) => string;

function serializeCmsEntity<
  T extends { createdAt: Date; publishedAt: Date | null; updatedAt: Date },
>(entity: T) {
  return {
    ...entity,
    publishedAt: entity.publishedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function listCmsProjectsController(
  repository: CmsRepository,
): RequestHandler {
  return async (request, response) => {
    const result = await repository.listProjects(cmsListSchema.parse(request.query));
    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map(serializeCmsEntity),
      }),
    );
  };
}

export function getCmsProjectController(
  repository: CmsRepository,
): RequestHandler {
  return async (request, response) => {
    const project = await repository.findProjectById(
      cmsIdSchema.parse(request.params.id),
    );
    if (!project) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found');
    }
    response.json({ data: serializeCmsEntity(project) });
  };
}

export function createCmsProjectController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const project = await repository.createProject(
      projectInputSchema.parse(request.body),
      getActorId(request, response),
    );
    response.status(201).json({ data: serializeCmsEntity(project) });
  };
}

export function updateCmsProjectController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const project = await repository.updateProject(
      cmsIdSchema.parse(request.params.id),
      projectUpdateSchema.parse(request.body),
      getActorId(request, response),
    );
    if (!project) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found');
    }
    response.json({ data: serializeCmsEntity(project) });
  };
}

export function deleteCmsProjectController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const archived = await repository.archiveProject(
      cmsIdSchema.parse(request.params.id),
      getActorId(request, response),
    );
    if (!archived) {
      throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found');
    }
    response.status(204).send();
  };
}

export function listCmsSolutionsController(
  repository: CmsRepository,
): RequestHandler {
  return async (request, response) => {
    const result = await repository.listSolutions(cmsListSchema.parse(request.query));
    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map(serializeCmsEntity),
      }),
    );
  };
}

export function getCmsSolutionController(
  repository: CmsRepository,
): RequestHandler {
  return async (request, response) => {
    const solution = await repository.findSolutionById(
      cmsIdSchema.parse(request.params.id),
    );
    if (!solution) {
      throw new ApiError(404, 'SOLUTION_NOT_FOUND', 'Solution was not found');
    }
    response.json({ data: serializeCmsEntity(solution) });
  };
}

export function createCmsSolutionController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const solution = await repository.createSolution(
      solutionInputSchema.parse(request.body),
      getActorId(request, response),
    );
    response.status(201).json({ data: serializeCmsEntity(solution) });
  };
}

export function updateCmsSolutionController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const solution = await repository.updateSolution(
      cmsIdSchema.parse(request.params.id),
      solutionUpdateSchema.parse(request.body),
      getActorId(request, response),
    );
    if (!solution) {
      throw new ApiError(404, 'SOLUTION_NOT_FOUND', 'Solution was not found');
    }
    response.json({ data: serializeCmsEntity(solution) });
  };
}

export function deleteCmsSolutionController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const archived = await repository.archiveSolution(
      cmsIdSchema.parse(request.params.id),
      getActorId(request, response),
    );
    if (!archived) {
      throw new ApiError(404, 'SOLUTION_NOT_FOUND', 'Solution was not found');
    }
    response.status(204).send();
  };
}

export function listCmsMetricsController(
  repository: CmsRepository,
): RequestHandler {
  return async (request, response) => {
    const result = await repository.listMetrics(cmsListSchema.parse(request.query));
    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map(serializeCmsEntity),
      }),
    );
  };
}

export function getCmsMetricController(repository: CmsRepository): RequestHandler {
  return async (request, response) => {
    const metric = await repository.findMetricById(
      cmsIdSchema.parse(request.params.id),
    );
    if (!metric) {
      throw new ApiError(404, 'METRIC_NOT_FOUND', 'Metric was not found');
    }
    response.json({ data: serializeCmsEntity(metric) });
  };
}

export function createCmsMetricController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const metric = await repository.createMetric(
      metricInputSchema.parse(request.body),
      getActorId(request, response),
    );
    response.status(201).json({ data: serializeCmsEntity(metric) });
  };
}

export function updateCmsMetricController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const metric = await repository.updateMetric(
      cmsIdSchema.parse(request.params.id),
      metricUpdateSchema.parse(request.body),
      getActorId(request, response),
    );
    if (!metric) {
      throw new ApiError(404, 'METRIC_NOT_FOUND', 'Metric was not found');
    }
    response.json({ data: serializeCmsEntity(metric) });
  };
}

export function deleteCmsMetricController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const archived = await repository.archiveMetric(
      cmsIdSchema.parse(request.params.id),
      getActorId(request, response),
    );
    if (!archived) {
      throw new ApiError(404, 'METRIC_NOT_FOUND', 'Metric was not found');
    }
    response.status(204).send();
  };
}

export function getCompanyProfileController(
  repository: CmsRepository,
): RequestHandler {
  return async (_request, response) => {
    const profile = await repository.getCompanyProfile();
    if (!profile) {
      throw new ApiError(
        404,
        'COMPANY_PROFILE_NOT_FOUND',
        'Company profile was not found',
      );
    }
    response.json({
      data: { ...profile, updatedAt: profile.updatedAt.toISOString() },
    });
  };
}

export function updateCompanyProfileController(
  repository: CmsRepository,
  getActorId: ActorProvider,
): RequestHandler {
  return async (request, response) => {
    const profile = await repository.updateCompanyProfile(
      companyProfileUpdateSchema.parse(request.body),
      getActorId(request, response),
    );
    if (!profile) {
      throw new ApiError(
        404,
        'COMPANY_PROFILE_NOT_FOUND',
        'Company profile was not found',
      );
    }
    response.json({
      data: { ...profile, updatedAt: profile.updatedAt.toISOString() },
    });
  };
}
