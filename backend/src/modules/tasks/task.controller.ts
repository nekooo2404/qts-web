import type { Request, RequestHandler, Response } from 'express';

import { ApiError } from '../../common/api-error.js';
import { omitUndefined } from '../../common/omit-undefined.js';
import { toPaginatedResponse } from '../../common/pagination.js';
import type {
  TaskMutationResult,
  TaskRepository,
} from './task.repository.js';
import {
  assignTaskSchema,
  changeTaskStatusSchema,
  createTaskSchema,
  taskIdSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from './task.schema.js';
import type { Task, TaskAccess } from './task.types.js';

type ActorProvider = (request: Request, response: Response) => string;
type AccessProvider = (request: Request, response: Response) => TaskAccess;

function serializeTask(task: Task) {
  return {
    ...task,
    dueAt: task.dueAt?.toISOString() ?? null,
    startedAt: task.startedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function taskOrThrow(result: TaskMutationResult) {
  if (result.kind === 'not_found') {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task was not found');
  }
  if (result.kind === 'version_conflict') {
    throw new ApiError(
      409,
      'TASK_VERSION_CONFLICT',
      'Task was changed by another request',
    );
  }
  if (result.kind === 'terminal_state') {
    throw new ApiError(
      409,
      'TASK_TERMINAL_STATE',
      'A completed or cancelled task cannot be changed',
    );
  }
  if (result.kind === 'context_unavailable') {
    throw new ApiError(
      422,
      'TASK_CONTEXT_UNAVAILABLE',
      'The selected contract or lead is not available',
    );
  }
  if (result.kind === 'assignee_unavailable') {
    throw new ApiError(
      422,
      'TASK_ASSIGNEE_UNAVAILABLE',
      'The selected assignee is not available',
    );
  }
  return result.task;
}

export const listTasksController =
  (repository: TaskRepository, access: AccessProvider): RequestHandler =>
  async (request, response) => {
    const result = await repository.list(
      access(request, response),
      taskListQuerySchema.parse(request.query),
    );
    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map(serializeTask),
      }),
    );
  };

export const getTaskController =
  (repository: TaskRepository, access: AccessProvider): RequestHandler =>
  async (request, response) => {
    const task = await repository.findById(
      taskIdSchema.parse(request.params.id),
      access(request, response),
    );
    if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', 'Task was not found');
    response.json({ data: serializeTask(task) });
  };

export const createTaskController =
  (repository: TaskRepository, access: AccessProvider): RequestHandler =>
  async (request, response) => {
    const result = await repository.create(
      createTaskSchema.parse(request.body),
      access(request, response),
    );
    if (result.kind === 'context_unavailable') {
      throw new ApiError(
        422,
        'TASK_CONTEXT_UNAVAILABLE',
        'The selected contract or lead is not available',
      );
    }
    response.status(201).json({ data: serializeTask(result.task) });
  };

export const updateTaskController =
  (repository: TaskRepository, access: AccessProvider): RequestHandler =>
  async (request, response) => {
    const { version, ...rawInput } = updateTaskSchema.parse(request.body);
    const result = await repository.update(
      taskIdSchema.parse(request.params.id),
      omitUndefined(rawInput),
      version,
      access(request, response),
    );
    response.json({ data: serializeTask(taskOrThrow(result)) });
  };

export const deleteTaskController =
  (repository: TaskRepository, access: AccessProvider): RequestHandler =>
  async (request, response) => {
    const archived = await repository.archive(
      taskIdSchema.parse(request.params.id),
      access(request, response),
    );
    if (!archived) throw new ApiError(404, 'TASK_NOT_FOUND', 'Task was not found');
    response.status(204).send();
  };

export const assignTaskController =
  (repository: TaskRepository, actor: ActorProvider): RequestHandler =>
  async (request, response) => {
    const input = assignTaskSchema.parse(request.body);
    const result = await repository.assign(
      taskIdSchema.parse(request.params.id),
      input.assigneeId,
      input.version,
      actor(request, response),
    );
    response.json({ data: serializeTask(taskOrThrow(result)) });
  };

export const changeTaskStatusController =
  (repository: TaskRepository, access: AccessProvider): RequestHandler =>
  async (request, response) => {
    const input = changeTaskStatusSchema.parse(request.body);
    const result = await repository.changeStatus(
      taskIdSchema.parse(request.params.id),
      input.fromStatus,
      input.status,
      input.version,
      access(request, response),
    );
    response.json({ data: serializeTask(taskOrThrow(result)) });
  };
