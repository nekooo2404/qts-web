import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middleware/error-handler.js';
import { LastActiveAdministratorError } from '../../src/modules/access-management/access-management.errors.js';
import {
  createRoleController,
  createUserController,
  deleteUserController,
  getPermissionController,
  getRoleController,
  replaceRolePermissionsController,
  replaceUserRolesController,
  updateUserController,
} from '../../src/modules/access-management/access-management.controller.js';
import type { AccessManagementRepository } from '../../src/modules/access-management/access-management.repository.js';

function repository(
  overrides: Partial<AccessManagementRepository> = {},
): AccessManagementRepository {
  return {
    listUsers: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn(),
    replaceUserRoles: vi.fn(),
    listRoles: vi.fn(),
    findRoleById: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    listPermissions: vi.fn(),
    findPermissionById: vi.fn(),
    createPermission: vi.fn(),
    updatePermission: vi.fn(),
    deletePermission: vi.fn(),
    replaceRolePermissions: vi.fn(),
    ...overrides,
  };
}

const actorId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';

function appFor(register: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  register(app);
  app.use(errorHandler);
  return app;
}

describe('access management controllers', () => {
  it('creates a user using a password hash and never returns it', async () => {
    const createUser = vi.fn(async () => ({
      id: '67048d7d-d3a2-4a13-8cf1-e27c258325e1',
      email: 'employee@qts.vn',
      fullName: 'QTS Employee',
      employeeCode: 'QTS-001',
      department: 'Security',
      jobTitle: 'Engineer',
      status: 'ACTIVE' as const,
      authVersion: 1,
      roles: [],
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      updatedAt: new Date('2026-08-13T12:00:00.000Z'),
    }));
    const hashPassword = vi.fn(async () => 'scrypt$hash-value');
    const repo = repository({ createUser });
    const app = appFor((instance) => {
      instance.post(
        '/users',
        createUserController(repo, hashPassword, () => actorId),
      );
    });

    const response = await request(app).post('/users').send({
      email: 'Employee@QTS.vn',
      password: 'a-very-strong-password',
      fullName: 'QTS Employee',
      employeeCode: 'QTS-001',
      department: 'Security',
      jobTitle: 'Engineer',
      roleIds: ['d61e6f22-428d-41ad-823b-43a3b9419dad'],
    });

    expect(response.status).toBe(201);
    expect(JSON.stringify(response.body)).not.toContain('hash-value');
    expect(hashPassword).toHaveBeenCalledWith('a-very-strong-password');
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'employee@qts.vn' }),
      'scrypt$hash-value',
      ['d61e6f22-428d-41ad-823b-43a3b9419dad'],
      actorId,
    );
  });

  it('atomically replaces all roles assigned to a user', async () => {
    const replaceUserRoles = vi.fn(async () => true);
    const repo = repository({ replaceUserRoles });
    const app = appFor((instance) => {
      instance.put(
        '/users/:id/roles',
        replaceUserRolesController(repo, () => actorId),
      );
    });

    const response = await request(app)
      .put('/users/67048d7d-d3a2-4a13-8cf1-e27c258325e1/roles')
      .send({ roleIds: ['d61e6f22-428d-41ad-823b-43a3b9419dad'] });

    expect(response.status).toBe(204);
    expect(replaceUserRoles).toHaveBeenCalledWith(
      '67048d7d-d3a2-4a13-8cf1-e27c258325e1',
      ['d61e6f22-428d-41ad-823b-43a3b9419dad'],
      actorId,
    );
  });

  it.each(['SUSPENDED', 'DISABLED'] as const)(
    'rejects changing the current actor status to %s',
    async (status) => {
      const updateUser = vi.fn();
      const hashPassword = vi.fn(async () => 'scrypt$hash-value');
      const repo = repository({ updateUser });
      const app = appFor((instance) => {
        instance.patch(
          '/users/:id',
          updateUserController(repo, hashPassword, () => actorId),
        );
      });

      const response = await request(app)
        .patch(`/users/${actorId}`)
        .send({ status });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SELF_DEACTIVATION_FORBIDDEN');
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();
    },
  );

  it('rejects replacing the current actor roles', async () => {
    const replaceUserRoles = vi.fn();
    const repo = repository({ replaceUserRoles });
    const app = appFor((instance) => {
      instance.put(
        '/users/:id/roles',
        replaceUserRolesController(repo, () => actorId),
      );
    });

    const response = await request(app)
      .put(`/users/${actorId}/roles`)
      .send({ roleIds: ['d61e6f22-428d-41ad-823b-43a3b9419dad'] });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SELF_ROLE_CHANGE_FORBIDDEN');
    expect(replaceUserRoles).not.toHaveBeenCalled();
  });

  it('returns a stable conflict when a mutation would remove the last admin', async () => {
    const deactivateUser = vi.fn(async () => {
      throw new LastActiveAdministratorError();
    });
    const repo = repository({ deactivateUser });
    const app = appFor((instance) => {
      instance.delete(
        '/users/:id',
        deleteUserController(repo, () => actorId),
      );
    });

    const response = await request(app).delete(
      '/users/67048d7d-d3a2-4a13-8cf1-e27c258325e1',
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LAST_ACTIVE_ADMIN_REQUIRED');
  });

  it('creates a flexible role with a stable machine code', async () => {
    const createRole = vi.fn(async () => ({
      id: 'd61e6f22-428d-41ad-823b-43a3b9419dad',
      code: 'CONTRACT_REVIEWER',
      name: 'Contract reviewer',
      description: null,
      isSystem: false,
      permissions: [],
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      updatedAt: new Date('2026-08-13T12:00:00.000Z'),
    }));
    const repo = repository({ createRole });
    const app = appFor((instance) => {
      instance.post('/roles', createRoleController(repo, () => actorId));
    });

    const response = await request(app).post('/roles').send({
      code: 'contract_reviewer',
      name: 'Contract reviewer',
      permissionIds: [],
    });

    expect(response.status).toBe(201);
    expect(createRole).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CONTRACT_REVIEWER' }),
      [],
      actorId,
    );
  });

  it('returns one role with its current permissions', async () => {
    const roleId = 'd61e6f22-428d-41ad-823b-43a3b9419dad';
    const findRoleById = vi.fn(async () => ({
      id: roleId,
      code: 'CONTRACT_REVIEWER',
      name: 'Contract reviewer',
      description: null,
      isSystem: false,
      permissions: [],
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      updatedAt: new Date('2026-08-13T12:00:00.000Z'),
    }));
    const app = appFor((instance) => {
      instance.get('/roles/:id', getRoleController(repository({ findRoleById })));
    });

    const response = await request(app).get(`/roles/${roleId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: roleId, permissions: [] });
    expect(findRoleById).toHaveBeenCalledWith(roleId);
  });

  it('returns a stable 404 for an unknown permission', async () => {
    const permissionId = '9547da57-3751-47d4-8848-bb93d008deaf';
    const findPermissionById = vi.fn(async () => null);
    const app = appFor((instance) => {
      instance.get(
        '/permissions/:id',
        getPermissionController(repository({ findPermissionById })),
      );
    });

    const response = await request(app).get(`/permissions/${permissionId}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PERMISSION_NOT_FOUND');
    expect(findPermissionById).toHaveBeenCalledWith(permissionId);
  });

  it('replaces role permissions as one operation', async () => {
    const replaceRolePermissions = vi.fn(async () => true);
    const repo = repository({ replaceRolePermissions });
    const app = appFor((instance) => {
      instance.put(
        '/roles/:id/permissions',
        replaceRolePermissionsController(repo, () => actorId),
      );
    });

    const response = await request(app)
      .put('/roles/d61e6f22-428d-41ad-823b-43a3b9419dad/permissions')
      .send({ permissionIds: ['9547da57-3751-47d4-8848-bb93d008deaf'] });

    expect(response.status).toBe(204);
    expect(replaceRolePermissions).toHaveBeenCalledWith(
      'd61e6f22-428d-41ad-823b-43a3b9419dad',
      ['9547da57-3751-47d4-8848-bb93d008deaf'],
      actorId,
    );
  });
});
