import { z } from 'zod';

import { paginationSchema } from '../../common/pagination.js';
import { contractStatuses } from './contract.types.js';

const uuidSchema = z.string().uuid();
const mutableContractStatuses = [
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
] as const;
const optionalDateSchema = z.iso.date().nullable();
const moneySchema = z
  .string()
  .regex(/^\d{1,16}(?:\.\d{1,2})?$/, 'Must be a non-negative decimal amount')
  .nullable();

export const contractIdSchema = uuidSchema;

export const contractListQuerySchema = paginationSchema.extend({
  status: z.enum(contractStatuses).optional(),
  ownerId: uuidSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

const contractFieldsSchema = z
  .object({
    contractNumber: z.string().trim().min(1).max(80),
    title: z.string().trim().min(2).max(300),
    clientName: z.string().trim().min(2).max(300),
    ownerId: uuidSchema,
    templateId: uuidSchema.nullable().optional(),
    status: z.enum(mutableContractStatuses).optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
    valueAmount: moneySchema.optional(),
    effectiveDate: optionalDateSchema.optional(),
    expiresAt: optionalDateSchema.optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function validateDateRange(
  value: {
    effectiveDate?: string | null | undefined;
    expiresAt?: string | null | undefined;
  },
  context: z.RefinementCtx,
) {
    if (
      value.effectiveDate &&
      value.expiresAt &&
      value.expiresAt < value.effectiveDate
    ) {
      context.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'expiresAt must be on or after effectiveDate',
      });
    }
}

export const createContractSchema = contractFieldsSchema.superRefine(validateDateRange);

export const updateContractSchema = contractFieldsSchema
  .partial()
  .extend({ version: z.number().int().min(1) })
  .strict()
  .superRefine(validateDateRange);
