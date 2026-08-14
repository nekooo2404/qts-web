import { z } from 'zod';

import { paginationSchema } from '../../common/pagination.js';
import { userStatuses } from './access-management.types.js';

const uuid = z.string().uuid();
const ids = z.array(uuid).max(100).transform((value) => [...new Set(value)]);
const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional();

export const entityIdSchema = uuid;
export const userListQuerySchema = paginationSchema.extend({
  status: z.enum(userStatuses).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

const userFields = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    fullName: z.string().trim().min(2).max(200),
    employeeCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{1,49}$/),
    department: optionalText(120),
    jobTitle: optionalText(120),
    status: z.enum(userStatuses).optional(),
  })
  .strict();

export const createUserSchema = userFields
  .extend({
    password: z.string().min(14).max(128),
    roleIds: ids.default([]),
  })
  .strict();

export const updateUserSchema = userFields
  .partial()
  .extend({ password: z.string().min(14).max(128).optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const replaceUserRolesSchema = z.object({ roleIds: ids }).strict();

const roleFields = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,79}$/),
    name: z.string().trim().min(2).max(120),
    description: optionalText(1000),
  })
  .strict();

export const createRoleSchema = roleFields
  .extend({ permissionIds: ids.default([]) })
  .strict();
export const updateRoleSchema = roleFields
  .omit({ code: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const replaceRolePermissionsSchema = z.object({ permissionIds: ids }).strict();

const permissionFields = z
  .object({
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z][a-z0-9_-]{1,39}:[a-z][a-z0-9_-]{1,79}$/),
    name: z.string().trim().min(2).max(120),
    description: optionalText(1000),
  })
  .strict();

export const createPermissionSchema = permissionFields;
export const updatePermissionSchema = permissionFields
  .omit({ code: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
