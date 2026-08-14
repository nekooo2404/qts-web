import { z } from 'zod';

import { paginationSchema } from '../../common/pagination.js';
import { auditOutcomes } from './audit.types.js';

const auditActionSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[A-Z][A-Z0-9_.-]+$/u);

const auditResourceTypeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]+$/u);

export const auditListQuerySchema = paginationSchema
  .extend({
    actorUserId: z.uuid().optional(),
    action: auditActionSchema.optional(),
    resourceType: auditResourceTypeSchema.optional(),
    resourceId: z.uuid().optional(),
    outcome: z.enum(auditOutcomes).optional(),
    requestId: z.uuid().optional(),
    occurredFrom: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
    occurredTo: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  })
  .refine(
    ({ occurredFrom, occurredTo }) =>
      occurredFrom === undefined ||
      occurredTo === undefined ||
      occurredFrom <= occurredTo,
    {
      path: ['occurredTo'],
      message: 'occurredTo must be on or after occurredFrom',
    },
  );
