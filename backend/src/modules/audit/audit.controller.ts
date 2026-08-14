import type { RequestHandler } from 'express';

import { toPaginatedResponse } from '../../common/pagination.js';
import type { AuditRepository } from './audit.repository.js';
import { auditListQuerySchema } from './audit.schema.js';

export function listAuditLogsController(
  repository: AuditRepository,
): RequestHandler {
  return async (request, response) => {
    const result = await repository.list(
      auditListQuerySchema.parse(request.query),
    );
    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map((entry) => ({
          ...entry,
          occurredAt: entry.occurredAt.toISOString(),
        })),
      }),
    );
  };
}
