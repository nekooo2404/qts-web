import type { PaginationResult } from '../../common/pagination.js';
import type {
  CreateTaskInput,
  Task,
  TaskAccess,
  TaskListQuery,
  TaskStatus,
  UpdateTaskInput,
} from './task.types.js';

export type TaskMutationResult =
  | { kind: 'updated'; task: Task }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'terminal_state' }
  | { kind: 'context_unavailable' }
  | { kind: 'assignee_unavailable' };

export type TaskCreateResult =
  | { kind: 'created'; task: Task }
  | { kind: 'context_unavailable' };

export interface TaskRepository {
  list(
    access: TaskAccess,
    query: TaskListQuery,
  ): Promise<PaginationResult<Task>>;
  findById(id: string, access: TaskAccess): Promise<Task | null>;
  create(
    input: CreateTaskInput,
    access: TaskAccess,
  ): Promise<TaskCreateResult>;
  update(
    id: string,
    input: UpdateTaskInput,
    version: number,
    access: TaskAccess,
  ): Promise<TaskMutationResult>;
  archive(id: string, access: TaskAccess): Promise<boolean>;
  assign(
    id: string,
    assigneeId: string | null,
    version: number,
    actorId: string,
  ): Promise<TaskMutationResult>;
  changeStatus(
    id: string,
    fromStatus: TaskStatus,
    status: TaskStatus,
    version: number,
    access: TaskAccess,
  ): Promise<TaskMutationResult>;
}
