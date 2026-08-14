import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middleware/error-handler.js';
import type { AccessManagementRepository } from '../../src/modules/access-management/access-management.repository.js';
import { createAccessTokenService } from '../../src/modules/auth/access-token.service.js';
import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import type { CmsRepository } from '../../src/modules/cms/cms.repository.js';
import type { ContractRepository } from '../../src/modules/contracts/contract.repository.js';
import { createInternalPortalRouter } from '../../src/modules/internal-portal/internal-portal.router.js';
import type { LeadRepository } from '../../src/modules/leads/lead.repository.js';
import type { TaskRepository } from '../../src/modules/tasks/task.repository.js';

const userId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';

function appWithPermissions(
  permissions: string[],
  accessManagementRepository = {} as AccessManagementRepository,
  contractRepository = {} as ContractRepository,
) {
  const authRepository: AuthRepository = {
    findUserByEmail: vi.fn(),
    recordFailedLogin: vi.fn(),
    recordSuccessfulLogin: vi.fn(),
    findUserAuthorizationById: vi.fn(async () => ({
      id: userId,
      email: 'employee@qts.vn',
      displayName: 'QTS Employee',
      authVersion: 1,
      isActive: true,
      permissions,
    })),
  };
  const tokenService = createAccessTokenService({
    secret: 'test-secret-that-is-at-least-32-bytes-long',
    issuer: 'qts-test',
    audience: 'qts-test-client',
    expiresInSeconds: 900,
  });
  const leadRepository: LeadRepository = {
    listAssigned: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, totalItems: 0 })),
    assign: vi.fn(async () => ({ kind: 'not_found' as const })),
  };

  const app = express();
  app.use(express.json());
  app.use(
    '/api',
    createInternalPortalRouter({
      authRepository,
      tokenService,
      leadRepository,
      contractRepository,
      taskRepository: {} as TaskRepository,
      accessManagementRepository,
      cmsRepository: {} as CmsRepository,
    }),
  );
  app.use(errorHandler);
  return { app, tokenService, leadRepository, contractRepository };
}

describe('internal portal route authorization', () => {
  it('returns 401 when a protected route has no bearer token', async () => {
    const { app } = appWithPermissions(['read:lead']);
    const response = await request(app).get('/api/leads/assigned');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 when the current database permissions do not allow access', async () => {
    const { app, tokenService } = appWithPermissions([]);
    const token = await tokenService.issue({ userId, authVersion: 1 });
    const response = await request(app)
      .get('/api/leads/assigned')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('uses the permissions reloaded for the current request', async () => {
    const permissions: string[] = [];
    const { app, tokenService, leadRepository } = appWithPermissions(permissions);
    const token = await tokenService.issue({ userId, authVersion: 1 });

    permissions.push('read:lead');
    const response = await request(app)
      .get('/api/leads/assigned')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(leadRepository.listAssigned).toHaveBeenCalledWith(
      userId,
      { page: 1, pageSize: 20 },
    );
  });

  it('requires the dynamic assign:lead permission for admin assignment', async () => {
    const { app, tokenService } = appWithPermissions(['read:lead']);
    const token = await tokenService.issue({ userId, authVersion: 1 });

    const response = await request(app)
      .put('/api/admin/leads/cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c/assignee')
      .set('Authorization', `Bearer ${token}`)
      .send({
        assigneeId: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
        version: 1,
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('requires both manage:user and manage:role to create users', async () => {
    for (const permissions of [['manage:user'], ['manage:role']]) {
      const { app, tokenService } = appWithPermissions(permissions);
      const token = await tokenService.issue({ userId, authVersion: 1 });

      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('requires both manage:user and manage:role to update user credentials', async () => {
    const updateUser = vi.fn(async () => undefined);
    const accessManagementRepository = {
      updateUser,
    } as unknown as AccessManagementRepository;

    for (const permissions of [['manage:user'], ['manage:role']]) {
      const { app, tokenService } = appWithPermissions(
        permissions,
        accessManagementRepository,
      );
      const token = await tokenService.issue({ userId, authVersion: 1 });

      const response = await request(app)
        .patch('/api/admin/users/51f96baa-8e5c-4261-b6fb-4234d0fb422b')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'New-strong-password-2026!' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('requires both manage:user and manage:role to replace user roles', async () => {
    const replaceUserRoles = vi.fn(async () => true);
    const accessManagementRepository = {
      replaceUserRoles,
    } as unknown as AccessManagementRepository;

    for (const permissions of [['manage:user'], ['manage:role']]) {
      const { app, tokenService } = appWithPermissions(
        permissions,
        accessManagementRepository,
      );
      const token = await tokenService.issue({ userId, authVersion: 1 });

      const response = await request(app)
        .put('/api/admin/users/51f96baa-8e5c-4261-b6fb-4234d0fb422b/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({ roleIds: [] });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
    expect(replaceUserRoles).not.toHaveBeenCalled();
  });

  it('gives read:contract users an owner-scoped contract list', async () => {
    const list = vi.fn(async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
    }));
    const contractRepository = { list } as unknown as ContractRepository;
    const { app, tokenService } = appWithPermissions(
      ['read:contract'],
      {} as AccessManagementRepository,
      contractRepository,
    );
    const token = await tokenService.issue({ userId, authVersion: 1 });

    const response = await request(app)
      .get('/api/contracts')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(
      { actorId: userId, canManageAll: false },
      { page: 1, pageSize: 20 },
    );
  });

  it('requires write:contract for contract mutations', async () => {
    const { app, tokenService } = appWithPermissions(['read:contract']);
    const token = await tokenService.issue({ userId, authVersion: 1 });

    const response = await request(app)
      .delete('/api/contracts/7f9a956f-48ec-45f1-9300-7086f8aaf406')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('marks manage:contract actors as company-wide contract managers', async () => {
    const list = vi.fn(async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
    }));
    const contractRepository = { list } as unknown as ContractRepository;
    const { app, tokenService } = appWithPermissions(
      ['read:contract', 'manage:contract'],
      {} as AccessManagementRepository,
      contractRepository,
    );
    const token = await tokenService.issue({ userId, authVersion: 1 });

    const response = await request(app)
      .get('/api/contracts')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(
      { actorId: userId, canManageAll: true },
      { page: 1, pageSize: 20 },
    );
  });
});
