import { z } from 'zod';

export const projectListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
    category: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export const projectIdSchema = z.string().uuid();
