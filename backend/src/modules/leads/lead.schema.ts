import { z } from 'zod';

export const leadIdSchema = z.string().uuid();

export const assignLeadSchema = z
  .object({
    assigneeId: z.string().uuid().nullable(),
    version: z.number().int().min(1),
  })
  .strict();
