export const taskStatuses = [
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
] as const;
export const taskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  contractId: string | null;
  leadId: string | null;
  dueAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskListQuery {
  page: number;
  pageSize: number;
  status?: TaskStatus | undefined;
  assignedTo?: string | undefined;
  priority?: TaskPriority | undefined;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null | undefined;
  priority?: TaskPriority | undefined;
  contractId?: string | null | undefined;
  leadId?: string | null | undefined;
  dueAt?: string | null | undefined;
}

export interface UpdateTaskInput {
  title?: string | undefined;
  description?: string | null | undefined;
  priority?: TaskPriority | undefined;
  contractId?: string | null | undefined;
  leadId?: string | null | undefined;
  dueAt?: string | null | undefined;
}

export interface TaskAccess {
  actorId: string;
  canManageAll: boolean;
  canManageAllContracts?: boolean;
  canManageAllLeads?: boolean;
}
