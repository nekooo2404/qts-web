import type { RequestHandler } from 'express';

import { ApiError } from '../../common/api-error.js';
import type { ContactLeadRepository } from './contact.repository.js';
import { contactInputSchema } from './contact.schema.js';

export function createContactController(
  repository: ContactLeadRepository,
): RequestHandler {
  return async (request, response, next) => {
    try {
      const input = contactInputSchema.parse(request.body);
      const lead = await repository.createWithNotification(input);

      response.status(201).json({
        data: {
          id: lead.id,
          status: lead.status,
          createdAt: lead.createdAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        next(error);
        return;
      }

      next(
        new ApiError(
          503,
          'SERVICE_UNAVAILABLE',
          'The contact service is temporarily unavailable',
        ),
      );
    }
  };
}
