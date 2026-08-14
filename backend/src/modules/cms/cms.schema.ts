import { z } from 'zod';

import { paginationSchema } from '../../common/pagination.js';
import { cmsStatuses } from './cms.repository.js';

export const cmsIdSchema = z.string().uuid();
export const cmsListSchema = paginationSchema.extend({
  status: z.enum(cmsStatuses).optional(),
});

const commonFields = {
  status: z.enum(cmsStatuses),
  sortOrder: z.number().int().min(0).max(100_000),
};
const httpUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'URL must use HTTP or HTTPS',
  });
const nonEmptyUpdate = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema
    .partial()
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
    });

const projectFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(10_000),
    imageUrl: httpUrl,
    category: z.string().trim().min(1).max(100),
    ...commonFields,
  })
  .strict();
export const projectInputSchema = projectFieldsSchema.extend({
  status: commonFields.status.default('DRAFT'),
  sortOrder: commonFields.sortOrder.default(0),
});
export const projectUpdateSchema = nonEmptyUpdate(projectFieldsSchema);

const solutionFieldsSchema = z
  .object({
    problem: z.string().trim().min(1).max(500),
    solution: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(10_000),
    ...commonFields,
  })
  .strict();
export const solutionInputSchema = solutionFieldsSchema.extend({
  status: commonFields.status.default('DRAFT'),
  sortOrder: commonFields.sortOrder.default(0),
});
export const solutionUpdateSchema = nonEmptyUpdate(solutionFieldsSchema);

const metricFieldsSchema = z
  .object({
    key: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z][a-z0-9_-]{1,79}$/),
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(80),
    suffix: z.string().trim().min(1).max(30).nullable(),
    ...commonFields,
  })
  .strict();
export const metricInputSchema = metricFieldsSchema.extend({
  suffix: z.string().trim().min(1).max(30).nullable().default(null),
  status: commonFields.status.default('DRAFT'),
  sortOrder: commonFields.sortOrder.default(0),
});
export const metricUpdateSchema = nonEmptyUpdate(metricFieldsSchema);

export const companyProfileUpdateSchema = z
  .object({
    about: z.string().trim().min(1).max(10_000).optional(),
    vision: z.string().trim().min(1).max(5000).optional(),
    mission: z.string().trim().min(1).max(5000).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    hotline: z.string().regex(/^\+[1-9][0-9]{7,14}$/).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
