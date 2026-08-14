import type { DatabasePool } from '../../database/database.types.js';
import type {
  ContractCreateResult,
  ContractRepository,
  ContractUpdateResult,
} from './contract.repository.js';
import type {
  Contract,
  ContractAccess,
  ContractListQuery,
  CreateContractInput,
  UpdateContractInput,
} from './contract.types.js';

interface ContractRow {
  id: string;
  contract_number: string;
  title: string;
  client_name: string;
  owner_id: string;
  template_id: string | null;
  status: Contract['status'];
  currency: string;
  value_amount: string | null;
  effective_date: string | null;
  expires_at: string | null;
  data: Record<string, unknown>;
  version: number;
  created_at: Date;
  updated_at: Date;
}

interface CountRow {
  total: string;
}

interface ContractStateRow {
  version: number;
}

const selection = `id, contract_number, title, client_name, owner_id, template_id,
  status, currency, value_amount::text, effective_date::text, expires_at::text,
  data, version, created_at, updated_at`;

function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    contractNumber: row.contract_number,
    title: row.title,
    clientName: row.client_name,
    ownerId: row.owner_id,
    templateId: row.template_id,
    status: row.status,
    currency: row.currency,
    valueAmount: row.value_amount,
    effectiveDate: row.effective_date,
    expiresAt: row.expires_at,
    data: row.data,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgContractRepository implements ContractRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(access: ContractAccess, query: ContractListQuery) {
    const values: unknown[] = [access.actorId, access.canManageAll];
    const filters = [
      `($2::boolean OR owner_id = $1)`,
      "status <> 'ARCHIVED'",
    ];
    if (query.status !== undefined) {
      values.push(query.status);
      filters[1] = `status = $${values.length}`;
    }
    if (query.ownerId !== undefined) {
      values.push(query.ownerId);
      filters.push(`owner_id = $${values.length}`);
    }
    if (query.search !== undefined) {
      values.push(`%${query.search}%`);
      filters.push(
        `(contract_number ILIKE $${values.length} OR title ILIKE $${values.length} OR client_name ILIKE $${values.length})`,
      );
    }
    const where = filters.join(' AND ');
    const countValues = [...values];
    const limitIndex = values.push(query.pageSize);
    const offsetIndex = values.push((query.page - 1) * query.pageSize);
    const [items, count] = await Promise.all([
      this.pool.query<ContractRow>(
        `SELECT ${selection} FROM public.contracts WHERE ${where}
         ORDER BY updated_at DESC, id ASC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        values,
      ),
      this.pool.query<CountRow>(
        `SELECT count(*)::text AS total FROM public.contracts WHERE ${where}`,
        countValues,
      ),
    ]);
    return {
      items: items.rows.map(mapContract),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async findById(id: string, access: ContractAccess): Promise<Contract | null> {
    const result = await this.pool.query<ContractRow>(
      `SELECT ${selection} FROM public.contracts
       WHERE id = $1 AND ($3::boolean OR owner_id = $2)`,
      [id, access.actorId, access.canManageAll],
    );
    return result.rows[0] ? mapContract(result.rows[0]) : null;
  }

  async create(
    input: CreateContractInput,
    access: ContractAccess,
  ): Promise<ContractCreateResult> {
    const ownerId = access.canManageAll ? input.ownerId : access.actorId;
    const result = await this.pool.query<ContractRow>(
      `INSERT INTO public.contracts
       (contract_number, title, client_name, owner_id, template_id, status,
        currency, value_amount, effective_date, expires_at, data, created_by, updated_by)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12
       WHERE EXISTS (
         SELECT 1
         FROM public.users AS owner
         JOIN public.user_roles AS user_role ON user_role.user_id = owner.id
         JOIN public.role_permissions AS role_permission
           ON role_permission.role_id = user_role.role_id
         JOIN public.permissions AS permission
           ON permission.id = role_permission.permission_id
         WHERE owner.id = $4
           AND owner.status = 'ACTIVE'
           AND permission.code = 'read:contract'
       )
       AND ($5::uuid IS NULL OR EXISTS (
         SELECT 1 FROM public.contract_templates AS template
         WHERE template.id = $5::uuid AND template.is_active = TRUE
       ))
       RETURNING ${selection}`,
      [
        input.contractNumber,
        input.title,
        input.clientName,
        ownerId,
        input.templateId ?? null,
        input.status ?? 'DRAFT',
        input.currency ?? 'VND',
        input.valueAmount ?? null,
        input.effectiveDate ?? null,
        input.expiresAt ?? null,
        input.data ?? {},
        access.actorId,
      ],
    );
    const row = result.rows[0];
    return row
      ? { kind: 'created', contract: mapContract(row) }
      : { kind: 'context_unavailable' };
  }

  async update(
    id: string,
    input: UpdateContractInput,
    expectedVersion: number,
    access: ContractAccess,
  ): Promise<ContractUpdateResult> {
    const scopedInput =
      !access.canManageAll && input.ownerId !== undefined
        ? { ...input, ownerId: access.actorId }
        : input;
    const entries = Object.entries(scopedInput);
    if (entries.length === 0) {
      const current = await this.findById(id, access);
      if (!current) return { kind: 'not_found' };
      return current.version === expectedVersion
        ? { kind: 'updated', contract: current }
        : { kind: 'version_conflict' };
    }

    const columnByField: Record<string, string> = {
      contractNumber: 'contract_number',
      title: 'title',
      clientName: 'client_name',
      ownerId: 'owner_id',
      templateId: 'template_id',
      status: 'status',
      currency: 'currency',
      valueAmount: 'value_amount',
      effectiveDate: 'effective_date',
      expiresAt: 'expires_at',
      data: 'data',
    };
    const values: unknown[] = [];
    const assignments = entries.map(([field, value]) => {
      const column = columnByField[field];
      if (!column) throw new Error(`Unsupported contract field: ${field}`);
      values.push(value);
      return `${column} = $${values.length}`;
    });
    values.push(access.actorId, access.canManageAll, id, expectedVersion);
    const actorIndex = values.length - 3;
    const manageIndex = values.length - 2;
    const idIndex = values.length - 1;
    const versionIndex = values.length;
    const checksOwner = Object.hasOwn(scopedInput, 'ownerId');
    const ownerId = checksOwner ? scopedInput.ownerId : null;
    const checksTemplate = Object.hasOwn(scopedInput, 'templateId');
    const templateId = checksTemplate ? scopedInput.templateId : null;
    const checkOwnerIndex = values.push(checksOwner);
    const ownerIndex = values.push(ownerId);
    const checkTemplateIndex = values.push(checksTemplate);
    const templateIndex = values.push(templateId);
    const result = await this.pool.query<ContractRow>(
      `UPDATE public.contracts SET ${assignments.join(', ')},
        updated_by = $${actorIndex}, version = version + 1
       WHERE id = $${idIndex} AND version = $${versionIndex}
         AND ($${manageIndex}::boolean OR owner_id = $${actorIndex})
         AND status <> 'ARCHIVED'
         AND (NOT $${checkOwnerIndex}::boolean OR EXISTS (
           SELECT 1
           FROM public.users AS owner
           JOIN public.user_roles AS user_role ON user_role.user_id = owner.id
           JOIN public.role_permissions AS role_permission
             ON role_permission.role_id = user_role.role_id
           JOIN public.permissions AS permission
             ON permission.id = role_permission.permission_id
           WHERE owner.id = $${ownerIndex}::uuid
             AND owner.status = 'ACTIVE'
             AND permission.code = 'read:contract'
         ))
         AND (NOT $${checkTemplateIndex}::boolean
           OR $${templateIndex}::uuid IS NULL
           OR EXISTS (
             SELECT 1 FROM public.contract_templates AS template
             WHERE template.id = $${templateIndex}::uuid
               AND template.is_active = TRUE
           ))
       RETURNING ${selection}`,
      values,
    );
    if (result.rows[0]) {
      return { kind: 'updated', contract: mapContract(result.rows[0]) };
    }
    const state = await this.pool.query<ContractStateRow>(
      `SELECT version
       FROM public.contracts
       WHERE id = $1 AND status <> 'ARCHIVED'
         AND ($3::boolean OR owner_id = $2)`,
      [id, access.actorId, access.canManageAll],
    );
    const current = state.rows[0];
    if (!current) return { kind: 'not_found' };
    if (current.version !== expectedVersion) return { kind: 'version_conflict' };

    const context = await this.pool.query<{ available: boolean }>(
      `SELECT (
         (NOT $1::boolean OR EXISTS (
           SELECT 1
           FROM public.users AS owner
           JOIN public.user_roles AS user_role ON user_role.user_id = owner.id
           JOIN public.role_permissions AS role_permission
             ON role_permission.role_id = user_role.role_id
           JOIN public.permissions AS permission
             ON permission.id = role_permission.permission_id
           WHERE owner.id = $2::uuid
             AND owner.status = 'ACTIVE'
             AND permission.code = 'read:contract'
         )) AND
         (NOT $3::boolean OR $4::uuid IS NULL OR EXISTS (
           SELECT 1 FROM public.contract_templates AS template
           WHERE template.id = $4::uuid AND template.is_active = TRUE
         ))
       ) AS available`,
      [checksOwner, ownerId, checksTemplate, templateId],
    );
    return context.rows[0]?.available === true
      ? { kind: 'version_conflict' }
      : { kind: 'context_unavailable' };
  }

  async archive(id: string, access: ContractAccess): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE public.contracts
       SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP,
           updated_by = $2, version = version + 1
       WHERE id = $1 AND status <> 'ARCHIVED'
         AND ($3::boolean OR owner_id = $2)`,
      [id, access.actorId, access.canManageAll],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
