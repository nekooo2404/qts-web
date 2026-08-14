import { describe, expect, it, vi } from 'vitest';

import type { ApiError } from '../../src/common/api-error.js';
import type { DatabasePool } from '../../src/database/database.types.js';
import { LastActiveAdministratorError } from '../../src/modules/access-management/access-management.errors.js';
import { PgAccessManagementRepository } from '../../src/modules/access-management/pg-access-management.repository.js';

const actorId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';
const userId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';
const roleId = 'd61e6f22-428d-41ad-823b-43a3b9419dad';
const permissionId = '9547da57-3751-47d4-8848-bb93d008deaf';
const now = new Date('2026-08-13T12:00:00.000Z');

const userRow = {
  id: userId,
  email: 'employee@qts.vn',
  full_name: 'QTS Employee',
  employee_code: 'QTS-001',
  department: 'Security',
  job_title: 'Engineer',
  status: 'ACTIVE' as const,
  auth_version: 2,
  roles: [],
  created_at: now,
  updated_at: now,
};
const roleRow = {
  id: roleId,
  code: 'CUSTOM_ADMIN',
  name: 'Custom admin',
  description: null,
  is_system: false,
  permissions: [],
  created_at: now,
  updated_at: now,
};
const permissionRow = {
  id: permissionId,
  code: 'read:custom',
  name: 'Read custom',
  description: null,
  is_system: false,
  created_at: now,
  updated_at: now,
};

interface FakeDatabaseOptions {
  hasEffectiveAdmin?: boolean;
  actorHasRole?: boolean;
  fail?: (sql: string) => Error | undefined;
}

function fakeDatabase(options: FakeDatabaseOptions = {}) {
  const query = vi.fn(async (sql: string) => {
    const failure = options.fail?.(sql);
    if (failure) throw failure;
    if (sql.includes('AS has_effective_admin')) {
      return { rows: [{ has_effective_admin: options.hasEffectiveAdmin ?? true }] };
    }
    if (sql.includes('AS actor_has_role')) {
      return { rows: [{ actor_has_role: options.actorHasRole ?? false }] };
    }
    if (sql.includes('INSERT INTO public.users')) return { rows: [{ id: userId }] };
    if (/UPDATE public\.users u\s+SET/.test(sql)) return { rows: [userRow], rowCount: 1 };
    if (/UPDATE public\.users\s+SET status\s*=\s*'DISABLED'/.test(sql)) {
      return { rows: [{ id: userId }], rowCount: 1 };
    }
    if (sql.includes('SELECT id FROM public.users') && sql.includes('FOR UPDATE')) {
      return { rows: [{ id: userId }] };
    }
    if (sql.includes('FROM public.users u WHERE u.id')) return { rows: [userRow] };
    if (sql.includes('INSERT INTO public.roles')) return { rows: [{ id: roleId }] };
    if (/UPDATE public\.roles r\s+SET/.test(sql)) return { rows: [roleRow], rowCount: 1 };
    if (sql.includes('DELETE FROM public.roles')) return { rows: [{ id: roleId }], rowCount: 1 };
    if (sql.includes('SELECT is_system FROM public.roles')) {
      return { rows: [{ is_system: false }] };
    }
    if (sql.includes('FROM public.roles r WHERE r.id')) return { rows: [roleRow] };
    if (sql.includes('INSERT INTO public.permissions')) return { rows: [permissionRow] };
    if (/UPDATE public\.permissions\s+SET/.test(sql)) {
      return { rows: [permissionRow], rowCount: 1 };
    }
    if (sql.includes('DELETE FROM public.permissions')) {
      return { rows: [{ id: permissionId }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }));
  const pool = { connect, query: vi.fn(), end: vi.fn() } as unknown as DatabasePool;
  return { query, release, repository: new PgAccessManagementRepository(pool) };
}

function auditCall(query: ReturnType<typeof vi.fn>) {
  return query.mock.calls.find(([sql]) =>
    String(sql).includes('INSERT INTO public.audit_logs'),
  );
}

describe('PgAccessManagementRepository hardening', () => {
  it('updates password_changed_at and audits only a password-changed marker', async () => {
    const { query, repository } = fakeDatabase();

    await repository.updateUser(
      userId,
      { passwordHash: 'scrypt$secret-password-hash' },
      actorId,
    );

    const update = query.mock.calls.find(([sql]) =>
      /UPDATE public\.users u\s+SET/.test(String(sql)),
    );
    expect(String(update?.[0])).toContain('password_changed_at = CURRENT_TIMESTAMP');
    const audit = auditCall(query);
    expect(audit?.[1]).toEqual([
      actorId,
      'USER.UPDATED',
      'USER',
      userId,
      JSON.stringify({ passwordChanged: true }),
    ]);
    expect(JSON.stringify(audit)).not.toContain('secret-password-hash');
  });

  it.each([
    {
      action: 'USER.CREATED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.createUser(
          {
            email: 'employee@qts.vn',
            fullName: 'QTS Employee',
            employeeCode: 'QTS-001',
          },
          'scrypt$secret-password-hash',
          [roleId],
          actorId,
        ),
    },
    {
      action: 'USER.DEACTIVATED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.deactivateUser(userId, actorId),
    },
    {
      action: 'USER.ROLES_REPLACED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.replaceUserRoles(userId, [roleId], actorId),
    },
    {
      action: 'ROLE.CREATED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.createRole(
          { code: 'CUSTOM_ADMIN', name: 'Custom admin' },
          [permissionId],
          actorId,
        ),
    },
    {
      action: 'ROLE.UPDATED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.updateRole(roleId, { name: 'Updated role' }, actorId),
    },
    {
      action: 'ROLE.DELETED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.deleteRole(roleId, actorId),
    },
    {
      action: 'ROLE.PERMISSIONS_REPLACED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.replaceRolePermissions(roleId, [permissionId], actorId),
    },
    {
      action: 'PERMISSION.CREATED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.createPermission(
          { code: 'read:custom', name: 'Read custom' },
          actorId,
        ),
    },
    {
      action: 'PERMISSION.UPDATED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.updatePermission(permissionId, { name: 'Read updated' }, actorId),
    },
    {
      action: 'PERMISSION.DELETED',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.deletePermission(permissionId, actorId),
    },
  ])('writes a transactional $action success audit row', async ({ action, mutate }) => {
    const { query, repository } = fakeDatabase();

    await mutate(repository);

    const audit = auditCall(query);
    expect(audit?.[1]?.[1]).toBe(action);
    expect(JSON.stringify(audit)).not.toContain('secret-password-hash');
    const auditIndex = query.mock.calls.findIndex(([sql]) =>
      String(sql).includes('INSERT INTO public.audit_logs'),
    );
    const commitIndex = query.mock.calls.findIndex(([sql]) => sql === 'COMMIT');
    expect(auditIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(auditIndex);
  });

  it('records changed user field names without duplicating personnel PII', async () => {
    const { query, repository } = fakeDatabase();

    await repository.createUser(
      {
        email: 'employee@qts.vn',
        fullName: 'QTS Employee',
        employeeCode: 'QTS-001',
        department: 'Security',
      },
      'scrypt$secret-password-hash',
      [roleId],
      actorId,
    );

    const audit = auditCall(query);
    expect(audit?.[1]?.[4]).toBe(
      JSON.stringify({
        changedFields: ['department', 'email', 'employeeCode', 'fullName'],
        roleIds: [roleId],
        passwordChanged: true,
      }),
    );
    expect(JSON.stringify(audit)).not.toContain('employee@qts.vn');
    expect(JSON.stringify(audit)).not.toContain('QTS Employee');
    expect(JSON.stringify(audit)).not.toContain('QTS-001');
  });

  it('rolls back a deactivation that would remove the last effective admin', async () => {
    const { query, repository } = fakeDatabase({ hasEffectiveAdmin: false });

    await expect(repository.deactivateUser(userId, actorId)).rejects.toBeInstanceOf(
      LastActiveAdministratorError,
    );

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements.findIndex((sql) => sql.includes('pg_advisory_xact_lock'))).toBeLessThan(
      statements.findIndex((sql) => /status\s*=\s*'DISABLED'/.test(sql)),
    );
    expect(statements).toContain('ROLLBACK');
    expect(auditCall(query)).toBeUndefined();
  });

  it.each([
    {
      name: 'status update',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.updateUser(userId, { status: 'SUSPENDED' }, actorId),
    },
    {
      name: 'user role replacement',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.replaceUserRoles(userId, [], actorId),
    },
    {
      name: 'role permission replacement',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.replaceRolePermissions(roleId, [], actorId),
    },
    {
      name: 'custom role deletion',
      mutate: (repository: PgAccessManagementRepository) =>
        repository.deleteRole(roleId, actorId),
    },
  ])('serializes and verifies the invariant for $name', async ({ mutate }) => {
    const { query, repository } = fakeDatabase();

    await mutate(repository);

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements.some((sql) => sql.includes('pg_advisory_xact_lock'))).toBe(true);
    expect(statements.some((sql) => sql.includes('AS has_effective_admin'))).toBe(true);
  });

  it('maps a duplicate user email to a stable conflict', async () => {
    const duplicate = Object.assign(new Error('duplicate'), {
      code: '23505',
      constraint: 'users_email_unique',
    });
    const { repository } = fakeDatabase({
      fail: (sql) => (sql.includes('INSERT INTO public.users') ? duplicate : undefined),
    });

    const operation = repository.createUser(
      {
        email: 'employee@qts.vn',
        fullName: 'QTS Employee',
        employeeCode: 'QTS-001',
      },
      'scrypt$secret-password-hash',
      [],
      actorId,
    );

    await expect(operation).rejects.toMatchObject({
      statusCode: 409,
      code: 'USER_EMAIL_CONFLICT',
    } satisfies Partial<ApiError>);
  });

  it('maps an unknown role grant to a stable validation error', async () => {
    const missingRole = Object.assign(new Error('foreign key'), {
      code: '23503',
      constraint: 'user_roles_role_fk',
    });
    const { repository } = fakeDatabase({
      fail: (sql) =>
        sql.includes('INSERT INTO public.user_roles') ? missingRole : undefined,
    });

    const operation = repository.replaceUserRoles(userId, [roleId], actorId);

    await expect(operation).rejects.toMatchObject({
      statusCode: 422,
      code: 'ROLE_REFERENCE_INVALID',
    } satisfies Partial<ApiError>);
  });

  it('prevents an actor from changing permissions on their own assigned role', async () => {
    const { query, repository } = fakeDatabase({ actorHasRole: true });

    await expect(
      repository.replaceRolePermissions(roleId, [permissionId], actorId),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'SELF_ROLE_PERMISSION_CHANGE_FORBIDDEN',
    } satisfies Partial<ApiError>);

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain('ROLLBACK');
    expect(
      statements.some((sql) => sql.includes('DELETE FROM public.role_permissions')),
    ).toBe(false);
    expect(auditCall(query)).toBeUndefined();
  });

  it('rolls back the mutation when its success audit cannot be written', async () => {
    const auditFailure = new Error('audit storage unavailable');
    const { query, repository } = fakeDatabase({
      fail: (sql) =>
        sql.includes('INSERT INTO public.audit_logs') ? auditFailure : undefined,
    });

    await expect(
      repository.updatePermission(
        permissionId,
        { name: 'Read updated' },
        actorId,
      ),
    ).rejects.toBe(auditFailure);

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements).toContain('ROLLBACK');
    expect(statements).not.toContain('COMMIT');
  });
});
