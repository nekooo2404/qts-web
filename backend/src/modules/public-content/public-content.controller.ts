import type { RequestHandler } from 'express';

import { ApiError } from '../../common/api-error.js';
import { paginationSchema, toPaginatedResponse } from '../../common/pagination.js';
import type { PublicContentRepository } from './public-content.repository.js';

export function listCapabilitiesController(
  repository: PublicContentRepository,
): RequestHandler {
  return async (request, response) => {
    const query = paginationSchema.parse(request.query);
    response.json(toPaginatedResponse(await repository.listCapabilities(query)));
  };
}

export function listSolutionsController(
  repository: PublicContentRepository,
): RequestHandler {
  return async (request, response) => {
    const query = paginationSchema.parse(request.query);
    response.json(toPaginatedResponse(await repository.listSolutions(query)));
  };
}

export function listMetricsController(
  repository: PublicContentRepository,
): RequestHandler {
  return async (request, response) => {
    const query = paginationSchema.parse(request.query);
    response.json(toPaginatedResponse(await repository.listMetrics(query)));
  };
}

export function getCompanyInfoController(
  repository: PublicContentRepository,
): RequestHandler {
  return async (_request, response) => {
    const companyInfo = await repository.getCompanyInfo();
    if (!companyInfo) {
      throw new ApiError(
        404,
        'COMPANY_INFO_NOT_FOUND',
        'Company information was not found',
      );
    }

    response.json({
      data: {
        ...companyInfo,
        updatedAt: companyInfo.updatedAt.toISOString(),
      },
    });
  };
}
