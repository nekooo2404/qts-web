import type { DatabasePool } from '../../database/database.types.js';
import type {
  AssignedLead,
  LeadAssignment,
  LeadAssignmentResult,
  LeadListQuery,
  LeadRepository,
} from './lead.repository.js';

interface LeadRow {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  message: string;
  status: AssignedLead['status'];
  assigned_at: Date;
  version: number;
  created_at: Date;
}

interface LeadAssignmentRow {
  lead_id: string;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: Date | null;
  version: number;
}

function mapLead(row: LeadRow): AssignedLead {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    status: row.status,
    assignedAt: row.assigned_at,
    version: row.version,
    createdAt: row.created_at,
  };
}

function mapAssignment(row: LeadAssignmentRow): LeadAssignment {
  return {
    leadId: row.lead_id,
    assignedTo: row.assigned_to,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    version: row.version,
  };
}

export class PgLeadRepository implements LeadRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listAssigned(employeeId: string, query: LeadListQuery) {
    const values: unknown[] = [employeeId];
    const filters = ['assigned_to = $1'];
    if (query.status !== undefined) {
      values.push(query.status);
      filters.push(`status = $${values.length}`);
    }
    const countValues = [...values];
    const limitIndex = values.push(query.pageSize);
    const offsetIndex = values.push((query.page - 1) * query.pageSize);
    const where = filters.join(' AND ');
    const [items, count] = await Promise.all([
      this.pool.query<LeadRow>(
        `SELECT id, customer_name, phone, email, message, status,
                assigned_at, version, created_at
         FROM public.contact_leads WHERE ${where}
         ORDER BY created_at DESC, id ASC
         LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        values,
      ),
      this.pool.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM public.contact_leads WHERE ${where}`,
        countValues,
      ),
    ]);
    return {
      items: items.rows.map(mapLead),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async assign(
    leadId: string,
    assigneeId: string | null,
    version: number,
    actorId: string,
  ): Promise<LeadAssignmentResult> {
    const updated = await this.pool.query<LeadAssignmentRow>(
      `UPDATE public.contact_leads AS lead
       SET assigned_to = $1::uuid,
           assigned_by = CASE
             WHEN $1::uuid IS NULL THEN NULL
             ELSE $4::uuid
           END,
           assigned_at = CASE
             WHEN $1::uuid IS NULL THEN NULL
             ELSE CURRENT_TIMESTAMP
           END,
           version = lead.version + 1
       WHERE lead.id = $2
         AND lead.version = $3
         AND (
           $1::uuid IS NULL
           OR EXISTS (
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
               AND permission.code = 'read:lead'
           )
         )
       RETURNING lead.id AS lead_id, lead.assigned_to, lead.assigned_by,
                 lead.assigned_at, lead.version`,
      [assigneeId, leadId, version, actorId],
    );
    const row = updated.rows[0];
    if (row) {
      return { kind: 'updated', assignment: mapAssignment(row) };
    }

    const state = await this.pool.query<{
      current_version: number | null;
      assignee_available: boolean;
    }>(
      `SELECT
         (
           SELECT version FROM public.contact_leads WHERE id = $1
         ) AS current_version,
         (
           $2::uuid IS NULL
           OR EXISTS(
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
               AND permission.code = 'read:lead'
           )
      ) AS assignee_available`,
      [leadId, assigneeId],
    );
    const currentState = state.rows[0];
    if (currentState?.current_version === null || currentState === undefined) {
      return { kind: 'not_found' };
    }
    if (currentState.current_version !== version) {
      return { kind: 'version_conflict' };
    }
    if (!currentState.assignee_available) {
      return { kind: 'assignee_unavailable' };
    }
    // A concurrent update can occur between the failed UPDATE and state check.
    return { kind: 'version_conflict' };
  }
}
