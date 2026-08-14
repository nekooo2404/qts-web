import { z } from 'zod';

import { paginationSchema } from '../../common/pagination.js';
import {
  taskPriorities,
  taskStatuses,
  type TaskStatus,
} from './task.types.js';

const uuidSchema = z.string().uuid();
export const taskIdSchema = uuidSchema;
export const taskListQuerySchema = paginationSchema.extend({
  status: z.enum(taskStatuses).optional(),
  assignedTo: uuidSchema.optional(),
  priority: z.enum(taskPriorities).optional(),
});

const taskFieldsSchema = z
  .object({
    title: z.string().trim().min(2).max(300),
    description: z.string().trim().min(1).max(10_000).nullable().optional(),
    priority: z.enum(taskPriorities).optional(),
    contractId: uuidSchema.nullable().optional(),
    leadId: uuidSchema.nullable().optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict();

export const createTaskSchema = taskFieldsSchema;
export const updateTaskSchema = taskFieldsSchema
  .partial()
  .extend({ version: z.number().int().min(1) })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== 'version'), {
    message: 'At least one task field is required',
  });
export const assignTaskSchema = z
  .object({
    assigneeId: uuidSchema.nullable(),
    version: z.number().int().min(1),
  })
  .strict();

const allowedTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['BLOCKED', 'DONE', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
};

export const changeTaskStatusSchema = z
  .object({
    fromStatus: z.enum(taskStatuses),
    status: z.enum(taskStatuses),
    version: z.number().int().min(1),
  })
  .strict()
  .refine((value) => allowedTransitions[value.fromStatus].includes(value.status), {
    path: ['status'],
    message: 'Invalid task status transition',
  });
