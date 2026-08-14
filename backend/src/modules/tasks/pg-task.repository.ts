import type { DatabasePool } from '../../database/database.types.js';
import type {
  TaskCreateResult,
  TaskMutationResult,
  TaskRepository,
} from './task.repository.js';
import type {
  CreateTaskInput,
  Task,
  TaskAccess,
  TaskListQuery,
  TaskStatus,
  UpdateTaskInput,
} from './task.types.js';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: Task['status'];
  priority: Task['priority'];
  assigned_to: string | null;
  contract_id: string | null;
  lead_id: string | null;
  due_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  version: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface AssignmentStateRow {
  current_version: number;
  current_status: TaskStatus;
  assignee_available: boolean;
}

interface MutationStateRow {
  version: number;
  status: TaskStatus;
}

const taskColumns = `id, title, description, status, priority, assigned_to,
  contract_id, lead_id, due_at, started_at, completed_at, version, created_by,
  created_at, updated_at`;

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    contractId: row.contract_id,
    leadId: row.lead_id,
    dueAt: row.due_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgTaskRepository implements TaskRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(access: TaskAccess, query: TaskListQuery) {
    const values: unknown[] = [];
    const filters = ["status <> 'CANCELLED'"];

    if (!access.canManageAll) {
      values.push(access.actorId);
      filters.push(
        `(assigned_to = $${values.length} OR created_by = $${values.length})`,
      );
    }
    if (query.status) {
      values.push(query.status);
      filters[0] = `status = $${values.length}`;
    }
    if (query.assignedTo) {
      values.push(query.assignedTo);
      filters.push(`assigned_to = $${values.length}`);
    }
    if (query.priority) {
      values.push(query.priority);
      filters.push(`priority = $${values.length}`);
    }

    const where = filters.join(' AND ');
    const countValues = [...values];
    const limitIndex = values.push(query.pageSize);
    const offsetIndex = values.push((query.page - 1) * query.pageSize);
    const [items, count] = await Promise.all([
      this.pool.query<TaskRow>(
        `SELECT ${taskColumns}
         FROM public.tasks
         WHERE ${where}
         ORDER BY created_at DESC, id
         LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        values,
      ),
      this.pool.query<{ total: string }>(
        `SELECT count(*)::text AS total
         FROM public.tasks
         WHERE ${where}`,
        countValues,
      ),
    ]);

    return {
      items: items.rows.map(mapTask),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async findById(id: string, access: TaskAccess) {
    const result = await this.pool.query<TaskRow>(
      `SELECT ${taskColumns}
       FROM public.tasks
       WHERE id = $1
         AND ($3::boolean OR assigned_to = $2 OR created_by = $2)`,
      [id, access.actorId, access.canManageAll],
    );
    return result.rows[0] ? mapTask(result.rows[0]) : null;
  }

  async create(
    input: CreateTaskInput,
    access: TaskAccess,
  ): Promise<TaskCreateResult> {
    const result = await this.pool.query<TaskRow>(
      `INSERT INTO public.tasks
         (title, description, priority, contract_id, lead_id, due_at,
          created_by, updated_by)
       SELECT $1, $2, $3, $4, $5, $6, $7, $7
       WHERE (
         $4::uuid IS NULL OR EXISTS (
           SELECT 1 FROM public.contracts AS contract
           WHERE contract.id = $4::uuid
             AND contract.status <> 'ARCHIVED'
             AND ($8::boolean OR contract.owner_id = $7)
         )
       ) AND (
         $5::uuid IS NULL OR EXISTS (
           SELECT 1 FROM public.contact_leads AS lead
           WHERE lead.id = $5::uuid
             AND ($9::boolean OR lead.assigned_to = $7)
         )
       )
       RETURNING ${taskColumns}`,
      [
        input.title,
        input.description ?? null,
        input.priority ?? 'MEDIUM',
        input.contractId ?? null,
        input.leadId ?? null,
        input.dueAt ?? null,
        access.actorId,
        access.canManageAllContracts === true,
        access.canManageAllLeads === true,
      ],
    );
    const row = result.rows[0];
    return row
      ? { kind: 'created', task: mapTask(row) }
      : { kind: 'context_unavailable' };
  }

  async update(
    id: string,
    input: UpdateTaskInput,
    version: number,
    access: TaskAccess,
  ) {
    const columns: Record<keyof UpdateTaskInput, string> = {
      title: 'title',
      description: 'description',
      priority: 'priority',
      contractId: 'contract_id',
      leadId: 'lead_id',
      dueAt: 'due_at',
    };
    const values: unknown[] = [];
    const set = (
      Object.entries(input) as Array<
        [keyof UpdateTaskInput, UpdateTaskInput[keyof UpdateTaskInput]]
      >
    ).map(([key, value]) => {
      values.push(value);
      return `${columns[key]} = $${values.length}`;
    });
    const contractContext = Object.hasOwn(input, 'contractId')
      ? input.contractId
      : null;
    const leadContext = Object.hasOwn(input, 'leadId') ? input.leadId : null;
    const checksContractContext = Object.hasOwn(input, 'contractId');
    const checksLeadContext = Object.hasOwn(input, 'leadId');
    values.push(access.actorId, access.canManageAll, id, version);
    const actorIndex = values.length - 3;
    const manageIndex = values.length - 2;
    const idIndex = values.length - 1;
    const versionIndex = values.length;
    const checkContractIndex = values.push(checksContractContext);
    const contractIndex = values.push(contractContext);
    const checkLeadIndex = values.push(checksLeadContext);
    const leadIndex = values.push(leadContext);
    const contractManageIndex = values.push(
      access.canManageAllContracts === true,
    );
    const leadManageIndex = values.push(access.canManageAllLeads === true);

    const result = await this.pool.query<TaskRow>(
      `UPDATE public.tasks
       SET ${set.join(', ')}, updated_by = $${actorIndex},
           version = version + 1
       WHERE id = $${idIndex}
         AND version = $${versionIndex}
         AND status NOT IN ('DONE', 'CANCELLED')
         AND ($${manageIndex}::boolean
           OR assigned_to = $${actorIndex}
           OR created_by = $${actorIndex})
         AND (NOT $${checkContractIndex}::boolean
           OR $${contractIndex}::uuid IS NULL
           OR EXISTS (
             SELECT 1 FROM public.contracts AS contract
             WHERE contract.id = $${contractIndex}::uuid
               AND contract.status <> 'ARCHIVED'
               AND ($${contractManageIndex}::boolean
                 OR contract.owner_id = $${actorIndex})
           ))
         AND (NOT $${checkLeadIndex}::boolean
           OR $${leadIndex}::uuid IS NULL
           OR EXISTS (
             SELECT 1 FROM public.contact_leads AS lead
             WHERE lead.id = $${leadIndex}::uuid
               AND ($${leadManageIndex}::boolean
                 OR lead.assigned_to = $${actorIndex})
           ))
       RETURNING ${taskColumns}`,
      values,
    );
    const updated = result.rows[0];
    if (updated) return { kind: 'updated' as const, task: mapTask(updated) };

    const current = await this.findMutationState(id, access);
    if (!current) return { kind: 'not_found' as const };
    if (current.version !== version) return { kind: 'version_conflict' as const };
    if (['DONE', 'CANCELLED'].includes(current.status)) {
      return { kind: 'terminal_state' as const };
    }
    if (!(await this.contextIsAvailable(
      access,
      checksContractContext,
      contractContext,
      checksLeadContext,
      leadContext,
    ))) {
      return { kind: 'context_unavailable' as const };
    }
    return { kind: 'version_conflict' as const };
  }

  async archive(id: string, access: TaskAccess) {
    const result = await this.pool.query(
      `UPDATE public.tasks
       SET status = 'CANCELLED', updated_by = $2, version = version + 1
       WHERE id = $1
         AND status NOT IN ('DONE', 'CANCELLED')
         AND ($3::boolean OR assigned_to = $2 OR created_by = $2)`,
      [id, access.actorId, access.canManageAll],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async assign(
    id: string,
    assigneeId: string | null,
    version: number,
    actorId: string,
  ): Promise<TaskMutationResult> {
    const result = await this.pool.query<TaskRow>(
      `UPDATE public.tasks
       SET assigned_to = $1,
           assigned_by = CASE WHEN $1::uuid IS NULL THEN NULL ELSE $4::uuid END,
           assigned_at = CASE
             WHEN $1::uuid IS NULL THEN NULL
             ELSE CURRENT_TIMESTAMP
           END,
           updated_by = $4,
           version = version + 1
       WHERE id = $2
         AND version = $3
         AND status NOT IN ('DONE', 'CANCELLED')
         AND ($1::uuid IS NULL OR EXISTS (
           SELECT 1
           FROM public.users AS assignee
           JOIN public.user_roles AS user_role
             ON user_role.user_id = assignee.id
           JOIN public.role_permissions AS role_permission
             ON role_permission.role_id = user_role.role_id
           JOIN public.permissions AS permission
             ON permission.id = role_permission.permission_id
           WHERE assignee.id = $1::uuid
             AND assignee.status = 'ACTIVE'
             AND permission.code = 'read:task'
         ))
       RETURNING ${taskColumns}`,
      [assigneeId, id, version, actorId],
    );
    const updated = result.rows[0];
    if (updated) return { kind: 'updated', task: mapTask(updated) };

    const state = await this.pool.query<AssignmentStateRow>(
      `SELECT task.version AS current_version,
              task.status AS current_status,
              ($2::uuid IS NULL OR EXISTS (
                SELECT 1
                FROM public.users AS assignee
                JOIN public.user_roles AS user_role
                  ON user_role.user_id = assignee.id
                JOIN public.role_permissions AS role_permission
                  ON role_permission.role_id = user_role.role_id
                JOIN public.permissions AS permission
                  ON permission.id = role_permission.permission_id
                WHERE assignee.id = $2::uuid
                  AND assignee.status = 'ACTIVE'
                  AND permission.code = 'read:task'
              )) AS assignee_available
       FROM public.tasks AS task
       WHERE task.id = $1`,
      [id, assigneeId],
    );
    const current = state.rows[0];
    if (!current) return { kind: 'not_found' };
    if (current.current_version !== version) return { kind: 'version_conflict' };
    if (['DONE', 'CANCELLED'].includes(current.current_status)) {
      return { kind: 'terminal_state' };
    }
    if (!current.assignee_available) return { kind: 'assignee_unavailable' };
    return { kind: 'version_conflict' };
  }

  async changeStatus(
    id: string,
    fromStatus: TaskStatus,
    status: TaskStatus,
    version: number,
    access: TaskAccess,
  ) {
    const result = await this.pool.query<TaskRow>(
      `UPDATE public.tasks
       SET status = $1,
           started_at = CASE
             WHEN $1 = 'IN_PROGRESS' AND started_at IS NULL
               THEN CURRENT_TIMESTAMP
             ELSE started_at
           END,
           completed_at = CASE
             WHEN $1 = 'DONE' THEN CURRENT_TIMESTAMP
             ELSE NULL
           END,
           updated_by = $5,
           version = version + 1
       WHERE id = $2
         AND status = $3
         AND version = $4
         AND ($6::boolean OR assigned_to = $5 OR created_by = $5)
       RETURNING ${taskColumns}`,
      [
        status,
        id,
        fromStatus,
        version,
        access.actorId,
        access.canManageAll,
      ],
    );
    return this.resolveMutation(result.rows[0], id, access, version);
  }

  private async contextIsAvailable(
    access: TaskAccess,
    checksContract: boolean,
    contractId: string | null | undefined,
    checksLead: boolean,
    leadId: string | null | undefined,
  ): Promise<boolean> {
    const result = await this.pool.query<{ available: boolean }>(
      `SELECT (
         (NOT $4::boolean OR $5::uuid IS NULL OR EXISTS (
           SELECT 1 FROM public.contracts AS contract
           WHERE contract.id = $5::uuid
             AND contract.status <> 'ARCHIVED'
             AND ($2::boolean OR contract.owner_id = $1)
         )) AND
         (NOT $6::boolean OR $7::uuid IS NULL OR EXISTS (
           SELECT 1 FROM public.contact_leads AS lead
           WHERE lead.id = $7::uuid
             AND ($3::boolean OR lead.assigned_to = $1)
         ))
       ) AS available`,
      [
        access.actorId,
        access.canManageAllContracts === true,
        access.canManageAllLeads === true,
        checksContract,
        contractId ?? null,
        checksLead,
        leadId ?? null,
      ],
    );
    return result.rows[0]?.available === true;
  }

  private async resolveMutation(
    row: TaskRow | undefined,
    id: string,
    access: TaskAccess = {
      actorId: '00000000-0000-0000-0000-000000000000',
      canManageAll: true,
    },
    expectedVersion?: number,
  ): Promise<TaskMutationResult> {
    if (row) return { kind: 'updated', task: mapTask(row) };
    const current = await this.findMutationState(id, access);
    if (!current) return { kind: 'not_found' };
    if (
      expectedVersion !== undefined &&
      current.version !== expectedVersion
    ) {
      return { kind: 'version_conflict' };
    }
    return ['DONE', 'CANCELLED'].includes(current.status)
      ? { kind: 'terminal_state' }
      : { kind: 'version_conflict' };
  }

  private async findMutationState(
    id: string,
    access: TaskAccess,
  ): Promise<MutationStateRow | null> {
    const result = await this.pool.query<MutationStateRow>(
      `SELECT version, status
       FROM public.tasks
       WHERE id = $1
         AND ($3::boolean OR assigned_to = $2 OR created_by = $2)`,
      [id, access.actorId, access.canManageAll],
    );
    return result.rows[0] ?? null;
  }
}
