import { ApiError } from '../../common/api-error.js';
import type { DatabaseClient, DatabasePool } from '../../database/database.types.js';
import { LastActiveAdministratorError } from './access-management.errors.js';
import type { AccessManagementRepository } from './access-management.repository.js';
import type {
  CreatePermissionInput,
  CreateRoleInput,
  CreateUserInput,
  ManagedPermission,
  ManagedRole,
  ManagedUser,
  UpdatePermissionInput,
  UpdateRoleInput,
  UpdateUserInput,
  UserListQuery,
} from './access-management.types.js';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  employee_code: string;
  department: string | null;
  job_title: string | null;
  status: ManagedUser['status'];
  auth_version: number;
  roles: ManagedUser['roles'];
  created_at: Date;
  updated_at: Date;
}

interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: ManagedRole['permissions'];
  created_at: Date;
  updated_at: Date;
}

interface PermissionRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PostgresConstraintError {
  code?: unknown;
  constraint?: unknown;
}

interface AuditEntry {
  actorId: string;
  action: string;
  resourceType: 'USER' | 'ROLE' | 'PERMISSION';
  resourceId: string;
  changes: Record<string, unknown>;
}

const userSelection = `u.id, u.email, u.full_name, u.employee_code, u.department,
  u.job_title, u.status, u.auth_version, u.created_at, u.updated_at,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code,
    'name', r.name) ORDER BY r.code) FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id WHERE ur.user_id = u.id), '[]') AS roles`;
const roleSelection = `r.id, r.code, r.name, r.description, r.is_system,
  r.created_at, r.updated_at,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code,
    'name', p.name) ORDER BY p.code) FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id WHERE rp.role_id = r.id), '[]') AS permissions`;
const permissionSelection =
  'id, code, name, description, is_system, created_at, updated_at';

const uniqueConflicts: Record<string, [string, string]> = {
  users_email_unique: ['USER_EMAIL_CONFLICT', 'A user with this email already exists'],
  users_employee_code_unique_idx: [
    'USER_EMPLOYEE_CODE_CONFLICT',
    'A user with this employee code already exists',
  ],
  roles_code_unique: ['ROLE_CODE_CONFLICT', 'A role with this code already exists'],
  roles_name_unique_idx: ['ROLE_NAME_CONFLICT', 'A role with this name already exists'],
  permissions_code_unique: [
    'PERMISSION_CODE_CONFLICT',
    'A permission with this code already exists',
  ],
};

const invalidReferences: Record<string, [string, string]> = {
  user_roles_role_fk: ['ROLE_REFERENCE_INVALID', 'One or more roles do not exist'],
  role_permissions_permission_fk: [
    'PERMISSION_REFERENCE_INVALID',
    'One or more permissions do not exist',
  ],
  user_roles_user_fk: ['USER_REFERENCE_INVALID', 'The referenced user does not exist'],
  role_permissions_role_fk: ['ROLE_REFERENCE_INVALID', 'The referenced role does not exist'],
  users_created_by_fk: ['ACTOR_REFERENCE_INVALID', 'The acting user does not exist'],
  users_updated_by_fk: ['ACTOR_REFERENCE_INVALID', 'The acting user does not exist'],
  roles_created_by_fk: ['ACTOR_REFERENCE_INVALID', 'The acting user does not exist'],
  roles_updated_by_fk: ['ACTOR_REFERENCE_INVALID', 'The acting user does not exist'],
  permissions_created_by_fk: ['ACTOR_REFERENCE_INVALID', 'The acting user does not exist'],
  permissions_updated_by_fk: ['ACTOR_REFERENCE_INVALID', 'The acting user does not exist'],
  user_roles_granted_by_fk: ['ACTOR_REFERENCE_INVALID', 'The acting user does not exist'],
  role_permissions_granted_by_fk: [
    'ACTOR_REFERENCE_INVALID',
    'The acting user does not exist',
  ],
};

const mapUser = (row: UserRow): ManagedUser => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  employeeCode: row.employee_code,
  department: row.department,
  jobTitle: row.job_title,
  status: row.status,
  authVersion: row.auth_version,
  roles: row.roles,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRole = (row: RoleRow): ManagedRole => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  isSystem: row.is_system,
  permissions: row.permissions,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPermission = (row: PermissionRow): ManagedPermission => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  isSystem: row.is_system,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function constraintDetails(error: unknown): { code: string; constraint: string } | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as PostgresConstraintError;
  if (typeof candidate.code !== 'string') return null;
  return {
    code: candidate.code,
    constraint: typeof candidate.constraint === 'string' ? candidate.constraint : '',
  };
}

function translateDatabaseError(error: unknown): unknown {
  if (error instanceof ApiError || error instanceof LastActiveAdministratorError) {
    return error;
  }
  const details = constraintDetails(error);
  if (!details) return error;

  if (details.code === '23505') {
    const [code, message] = uniqueConflicts[details.constraint] ?? [
      'ACCESS_RESOURCE_CONFLICT',
      'The resource conflicts with existing access-management data',
    ];
    return new ApiError(409, code, message);
  }
  if (details.code === '23503') {
    const [code, message] = invalidReferences[details.constraint] ?? [
      'ACCESS_REFERENCE_INVALID',
      'A referenced access-management resource does not exist',
    ];
    return new ApiError(422, code, message);
  }
  return error;
}

async function inTransaction<T>(
  pool: DatabasePool,
  task: (client: DatabaseClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await task(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw translateDatabaseError(error);
  } finally {
    client.release();
  }
}

async function writeAudit(client: DatabaseClient, entry: AuditEntry): Promise<void> {
  await client.query(
    `INSERT INTO public.audit_logs
       (actor_user_id, action, resource_type, resource_id, outcome, changes)
     VALUES ($1, $2, $3, $4, 'SUCCESS', $5::jsonb)`,
    [
      entry.actorId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      JSON.stringify(entry.changes),
    ],
  );
}

async function lockAdministratorInvariant(client: DatabaseClient): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(1903241087, 1145528769)');
}

async function assertEffectiveAdministrator(client: DatabaseClient): Promise<void> {
  const result = await client.query<{ has_effective_admin: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM public.users u
       JOIN public.user_roles ur ON ur.user_id = u.id
       JOIN public.role_permissions rp ON rp.role_id = ur.role_id
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE u.status = 'ACTIVE'
         AND p.code IN ('manage:user', 'manage:role')
       GROUP BY u.id
       HAVING COUNT(DISTINCT p.code) = 2
     ) AS has_effective_admin`,
  );
  if (result.rows[0]?.has_effective_admin !== true) {
    throw new LastActiveAdministratorError();
  }
}

async function replaceRelations(
  client: DatabaseClient,
  table: 'user_roles' | 'role_permissions',
  ownerColumn: 'user_id' | 'role_id',
  relatedColumn: 'role_id' | 'permission_id',
  ownerId: string,
  ids: string[],
  actorId: string,
): Promise<void> {
  await client.query(`DELETE FROM public.${table} WHERE ${ownerColumn} = $1`, [
    ownerId,
  ]);
  if (ids.length > 0) {
    await client.query(
      `INSERT INTO public.${table} (${ownerColumn}, ${relatedColumn}, granted_by)
       SELECT $1, value, $3 FROM unnest($2::uuid[]) value`,
      [ownerId, ids, actorId],
    );
  }
}

function userAuditChanges(input: UpdateUserInput): Record<string, unknown> {
  const changedFields = Object.keys(input)
    .filter((field) => field !== 'passwordHash')
    .sort();
  return {
    ...(changedFields.length === 0 ? {} : { changedFields }),
    ...(input.passwordHash === undefined ? {} : { passwordChanged: true }),
  };
}

export class PgAccessManagementRepository implements AccessManagementRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listUsers(query: UserListQuery) {
    const values: unknown[] = [];
    const filters: string[] = [];
    if (query.status) {
      values.push(query.status);
      filters.push(`u.status = $${values.length}`);
    }
    if (query.search) {
      values.push(`%${query.search}%`);
      filters.push(
        `(u.email ILIKE $${values.length} OR u.full_name ILIKE $${values.length} OR u.employee_code ILIKE $${values.length})`,
      );
    }
    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const countValues = [...values];
    const limit = values.push(query.pageSize);
    const offset = values.push((query.page - 1) * query.pageSize);
    const [items, count] = await Promise.all([
      this.pool.query<UserRow>(
        `SELECT ${userSelection} FROM public.users u ${where}
         ORDER BY u.created_at DESC, u.id LIMIT $${limit} OFFSET $${offset}`,
        values,
      ),
      this.pool.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM public.users u ${where}`,
        countValues,
      ),
    ]);
    return {
      items: items.rows.map(mapUser),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(count.rows[0]?.total ?? 0),
    };
  }

  async findUserById(id: string) {
    const result = await this.pool.query<UserRow>(
      `SELECT ${userSelection} FROM public.users u WHERE u.id = $1`,
      [id],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async createUser(
    input: CreateUserInput,
    passwordHash: string,
    roleIds: string[],
    actorId: string,
  ) {
    return inTransaction(this.pool, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.users
           (email, password_hash, full_name, employee_code, department, job_title,
            status, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id`,
        [
          input.email,
          passwordHash,
          input.fullName,
          input.employeeCode,
          input.department ?? null,
          input.jobTitle ?? null,
          input.status ?? 'ACTIVE',
          actorId,
        ],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error('User insert returned no row');
      await replaceRelations(
        client,
        'user_roles',
        'user_id',
        'role_id',
        id,
        roleIds,
        actorId,
      );
      const result = await client.query<UserRow>(
        `SELECT ${userSelection} FROM public.users u WHERE u.id = $1`,
        [id],
      );
      if (!result.rows[0]) throw new Error('Created user was not found');
      await writeAudit(client, {
        actorId,
        action: 'USER.CREATED',
        resourceType: 'USER',
        resourceId: id,
        changes: {
          changedFields: Object.keys(input).sort(),
          roleIds,
          passwordChanged: true,
        },
      });
      return mapUser(result.rows[0]);
    });
  }

  async updateUser(id: string, input: UpdateUserInput, actorId: string) {
    return inTransaction(this.pool, async (client) => {
      if (input.status !== undefined) await lockAdministratorInvariant(client);
      const columns: Record<keyof UpdateUserInput, string> = {
        email: 'email',
        fullName: 'full_name',
        employeeCode: 'employee_code',
        department: 'department',
        jobTitle: 'job_title',
        status: 'status',
        passwordHash: 'password_hash',
      };
      const entries = Object.entries(input) as Array<
        [keyof UpdateUserInput, UpdateUserInput[keyof UpdateUserInput]]
      >;
      const values: unknown[] = [];
      const set = entries.map(([key, value]) => {
        values.push(value);
        return `${columns[key]} = $${values.length}`;
      });
      if (input.passwordHash !== undefined) {
        set.push('password_changed_at = CURRENT_TIMESTAMP');
      }
      values.push(actorId, id);
      const authChanged = input.passwordHash !== undefined || input.status !== undefined;
      const result = await client.query<UserRow>(
        `UPDATE public.users u SET ${set.join(', ')},
         updated_by = $${values.length - 1}${
           authChanged ? ', auth_version = auth_version + 1' : ''
         }
         WHERE u.id = $${values.length}
         RETURNING ${userSelection}`,
        values,
      );
      const row = result.rows[0];
      if (!row) return null;
      if (input.status !== undefined) await assertEffectiveAdministrator(client);
      await writeAudit(client, {
        actorId,
        action: 'USER.UPDATED',
        resourceType: 'USER',
        resourceId: id,
        changes: userAuditChanges(input),
      });
      return mapUser(row);
    });
  }

  async deactivateUser(id: string, actorId: string) {
    return inTransaction(this.pool, async (client) => {
      await lockAdministratorInvariant(client);
      const result = await client.query<{ id: string }>(
        `UPDATE public.users SET status='DISABLED',
         auth_version = auth_version + 1, updated_by = $2
         WHERE id = $1 AND status <> 'DISABLED'
         RETURNING id`,
        [id, actorId],
      );
      if (!result.rows[0]) return false;
      await assertEffectiveAdministrator(client);
      await writeAudit(client, {
        actorId,
        action: 'USER.DEACTIVATED',
        resourceType: 'USER',
        resourceId: id,
        changes: { status: 'DISABLED' },
      });
      return true;
    });
  }

  async replaceUserRoles(id: string, roleIds: string[], actorId: string) {
    return inTransaction(this.pool, async (client) => {
      await lockAdministratorInvariant(client);
      const locked = await client.query<{ id: string }>(
        'SELECT id FROM public.users WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!locked.rows[0]) return false;
      await replaceRelations(
        client,
        'user_roles',
        'user_id',
        'role_id',
        id,
        roleIds,
        actorId,
      );
      await client.query('UPDATE public.users SET updated_by = $2 WHERE id = $1', [
        id,
        actorId,
      ]);
      await assertEffectiveAdministrator(client);
      await writeAudit(client, {
        actorId,
        action: 'USER.ROLES_REPLACED',
        resourceType: 'USER',
        resourceId: id,
        changes: { roleIds },
      });
      return true;
    });
  }

  async listRoles() {
    const result = await this.pool.query<RoleRow>(
      `SELECT ${roleSelection} FROM public.roles r ORDER BY r.code`,
    );
    return result.rows.map(mapRole);
  }

  async findRoleById(id: string) {
    const result = await this.pool.query<RoleRow>(
      `SELECT ${roleSelection} FROM public.roles r WHERE r.id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRole(row) : null;
  }

  async createRole(
    input: CreateRoleInput,
    permissionIds: string[],
    actorId: string,
  ) {
    return inTransaction(this.pool, async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.roles (code, name, description, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        [input.code, input.name, input.description ?? null, actorId],
      );
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error('Role insert returned no row');
      await replaceRelations(
        client,
        'role_permissions',
        'role_id',
        'permission_id',
        id,
        permissionIds,
        actorId,
      );
      const result = await client.query<RoleRow>(
        `SELECT ${roleSelection} FROM public.roles r WHERE r.id = $1`,
        [id],
      );
      if (!result.rows[0]) throw new Error('Created role was not found');
      await writeAudit(client, {
        actorId,
        action: 'ROLE.CREATED',
        resourceType: 'ROLE',
        resourceId: id,
        changes: { ...input, permissionIds },
      });
      return mapRole(result.rows[0]);
    });
  }

  async updateRole(id: string, input: UpdateRoleInput, actorId: string) {
    return inTransaction(this.pool, async (client) => {
      const entries = Object.entries(input);
      const values: unknown[] = [];
      const columns: Record<string, string> = {
        name: 'name',
        description: 'description',
      };
      const set = entries.map(([key, value]) => {
        values.push(value);
        return `${columns[key]} = $${values.length}`;
      });
      values.push(actorId, id);
      const result = await client.query<RoleRow>(
        `UPDATE public.roles r SET ${set.join(', ')},
         updated_by = $${values.length - 1}
         WHERE r.id = $${values.length} AND r.is_system = FALSE
         RETURNING ${roleSelection}`,
        values,
      );
      const row = result.rows[0];
      if (!row) return null;
      await writeAudit(client, {
        actorId,
        action: 'ROLE.UPDATED',
        resourceType: 'ROLE',
        resourceId: id,
        changes: { ...input },
      });
      return mapRole(row);
    });
  }

  async deleteRole(id: string, actorId: string) {
    return inTransaction(this.pool, async (client) => {
      await lockAdministratorInvariant(client);
      const result = await client.query<{ id: string }>(
        `DELETE FROM public.roles
         WHERE id = $1 AND is_system = FALSE
         RETURNING id`,
        [id],
      );
      if (!result.rows[0]) return false;
      await assertEffectiveAdministrator(client);
      await writeAudit(client, {
        actorId,
        action: 'ROLE.DELETED',
        resourceType: 'ROLE',
        resourceId: id,
        changes: {},
      });
      return true;
    });
  }

  async listPermissions() {
    const result = await this.pool.query<PermissionRow>(
      `SELECT ${permissionSelection} FROM public.permissions ORDER BY code`,
    );
    return result.rows.map(mapPermission);
  }

  async findPermissionById(id: string) {
    const result = await this.pool.query<PermissionRow>(
      `SELECT ${permissionSelection} FROM public.permissions WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapPermission(row) : null;
  }

  async createPermission(input: CreatePermissionInput, actorId: string) {
    return inTransaction(this.pool, async (client) => {
      const result = await client.query<PermissionRow>(
        `INSERT INTO public.permissions
           (code, name, description, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING ${permissionSelection}`,
        [input.code, input.name, input.description ?? null, actorId],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Permission insert returned no row');
      await writeAudit(client, {
        actorId,
        action: 'PERMISSION.CREATED',
        resourceType: 'PERMISSION',
        resourceId: row.id,
        changes: { ...input },
      });
      return mapPermission(row);
    });
  }

  async updatePermission(
    id: string,
    input: UpdatePermissionInput,
    actorId: string,
  ) {
    return inTransaction(this.pool, async (client) => {
      const entries = Object.entries(input);
      const values: unknown[] = [];
      const columns: Record<string, string> = {
        name: 'name',
        description: 'description',
      };
      const set = entries.map(([key, value]) => {
        values.push(value);
        return `${columns[key]} = $${values.length}`;
      });
      values.push(actorId, id);
      const result = await client.query<PermissionRow>(
        `UPDATE public.permissions SET ${set.join(', ')},
         updated_by = $${values.length - 1}
         WHERE id = $${values.length} AND is_system = FALSE
         RETURNING ${permissionSelection}`,
        values,
      );
      const row = result.rows[0];
      if (!row) return null;
      await writeAudit(client, {
        actorId,
        action: 'PERMISSION.UPDATED',
        resourceType: 'PERMISSION',
        resourceId: id,
        changes: { ...input },
      });
      return mapPermission(row);
    });
  }

  async deletePermission(id: string, actorId: string) {
    return inTransaction(this.pool, async (client) => {
      const result = await client.query<{ id: string }>(
        `DELETE FROM public.permissions
         WHERE id = $1 AND is_system = FALSE
         RETURNING id`,
        [id],
      );
      if (!result.rows[0]) return false;
      await writeAudit(client, {
        actorId,
        action: 'PERMISSION.DELETED',
        resourceType: 'PERMISSION',
        resourceId: id,
        changes: {},
      });
      return true;
    });
  }

  async replaceRolePermissions(
    id: string,
    permissionIds: string[],
    actorId: string,
  ) {
    return inTransaction(this.pool, async (client) => {
      await lockAdministratorInvariant(client);
      const locked = await client.query<{ is_system: boolean }>(
        'SELECT is_system FROM public.roles WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!locked.rows[0] || locked.rows[0].is_system) return false;
      const actorAssignment = await client.query<{ actor_has_role: boolean }>(
        `SELECT EXISTS (
           SELECT 1
           FROM public.user_roles
           WHERE user_id = $1 AND role_id = $2
         ) AS actor_has_role`,
        [actorId, id],
      );
      if (actorAssignment.rows[0]?.actor_has_role === true) {
        throw new ApiError(
          409,
          'SELF_ROLE_PERMISSION_CHANGE_FORBIDDEN',
          'You cannot change permissions for a role assigned to your account',
        );
      }
      await replaceRelations(
        client,
        'role_permissions',
        'role_id',
        'permission_id',
        id,
        permissionIds,
        actorId,
      );
      await assertEffectiveAdministrator(client);
      await writeAudit(client, {
        actorId,
        action: 'ROLE.PERMISSIONS_REPLACED',
        resourceType: 'ROLE',
        resourceId: id,
        changes: { permissionIds },
      });
      return true;
    });
  }
}
