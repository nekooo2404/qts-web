import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import { ApiError } from '../../common/api-error.js';
import { paginationSchema, toPaginatedResponse } from '../../common/pagination.js';
import type {
  LeadAssignmentResult,
  LeadRepository,
} from './lead.repository.js';
import { leadStatuses } from './lead.repository.js';
import { assignLeadSchema, leadIdSchema } from './lead.schema.js';

const assignedLeadQuerySchema = paginationSchema.extend({
  status: z.enum(leadStatuses).optional(),
});

function assignmentOrThrow(result: LeadAssignmentResult) {
  if (result.kind === 'not_found') {
    throw new ApiError(404, 'LEAD_NOT_FOUND', 'Lead was not found');
  }
  if (result.kind === 'version_conflict') {
    throw new ApiError(
      409,
      'LEAD_VERSION_CONFLICT',
      'Lead assignment was changed by another request',
    );
  }
  if (result.kind === 'assignee_unavailable') {
    throw new ApiError(
      422,
      'LEAD_ASSIGNEE_UNAVAILABLE',
      'The selected assignee is not available',
    );
  }
  return result.assignment;
}

export function listAssignedLeadsController(
  repository: LeadRepository,
  getActorId: (request: Request, response: Response) => string,
): RequestHandler {
  return async (request, response) => {
    const query = assignedLeadQuerySchema.parse(request.query);
    const result = await repository.listAssigned(
      getActorId(request, response),
      query,
    );
    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map((lead) => ({
          ...lead,
          assignedAt: lead.assignedAt.toISOString(),
          createdAt: lead.createdAt.toISOString(),
        })),
      }),
    );
  };
}

export function assignLeadController(
  repository: LeadRepository,
  getActorId: (request: Request, response: Response) => string,
): RequestHandler {
  return async (request, response) => {
    const leadId = leadIdSchema.parse(request.params.id);
    const input = assignLeadSchema.parse(request.body);
    const assignment = assignmentOrThrow(
      await repository.assign(
        leadId,
        input.assigneeId,
        input.version,
        getActorId(request, response),
      ),
    );
    response.json({
      data: {
        ...assignment,
        assignedAt: assignment.assignedAt?.toISOString() ?? null,
      },
    });
  };
}
