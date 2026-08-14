import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { requestContext } from '../../src/common/request-context.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import type { AccessManagementRepository } from '../../src/modules/access-management/access-management.repository.js';
import { createAccessTokenService } from '../../src/modules/auth/access-token.service.js';
import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import type { AuditRepository } from '../../src/modules/audit/audit.repository.js';
import type { CmsRepository } from '../../src/modules/cms/cms.repository.js';
import type { ContractRepository } from '../../src/modules/contracts/contract.repository.js';
import { createInternalPortalRouter } from '../../src/modules/internal-portal/internal-portal.router.js';
import type { LeadRepository } from '../../src/modules/leads/lead.repository.js';
import type { TaskRepository } from '../../src/modules/tasks/task.repository.js';

const userId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';

function buildApp(permissions: string[], auditRepository: AuditRepository) {
  const authRepository: AuthRepository = {
    findUserByEmail: vi.fn(),
    recordFailedLogin: vi.fn(),
    recordSuccessfulLogin: vi.fn(),
    findUserAuthorizationById: vi.fn(async () => ({
      id: userId,
      email: 'admin@qts.vn',
      displayName: 'QTS Admin',
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
  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use(
    '/api',
    createInternalPortalRouter({
      authRepository,
      tokenService,
      leadRepository: {} as LeadRepository,
      contractRepository: {} as ContractRepository,
      taskRepository: {} as TaskRepository,
      accessManagementRepository: {} as AccessManagementRepository,
      cmsRepository: {} as CmsRepository,
      auditRepository,
    }),
  );
  app.use(errorHandler);
  return { app, tokenService };
}

describe('GET /api/admin/audit-logs', () => {
  it('requires read:audit and serializes a paginated audit projection', async () => {
    const list = vi.fn(async () => ({
      items: [
        {
          id: 'a5c8e561-4f89-4a52-a704-ce6356f5d14c',
          actorUserId: userId,
          action: 'TASK.UPDATE',
          resourceType: 'TASK',
          resourceId: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
          outcome: 'SUCCESS' as const,
          requestId: 'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c',
          metadata: { method: 'PATCH', statusCode: 200 },
          occurredAt: new Date('2026-08-13T14:00:00.000Z'),
        },
      ],
      page: 1,
      pageSize: 10,
      totalItems: 1,
    }));
    const auditRepository: AuditRepository = { record: vi.fn(), list };
    const { app, tokenService } = buildApp(['read:audit'], auditRepository);
    const token = await tokenService.issue({ userId, authVersion: 1 });

    const response = await request(app)
      .get('/api/admin/audit-logs?pageSize=10&outcome=SUCCESS')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        expect.objectContaining({
          action: 'TASK.UPDATE',
          occurredAt: '2026-08-13T14:00:00.000Z',
        }),
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    });
    expect(list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      outcome: 'SUCCESS',
    });
  });

  it('returns 403 without the dynamic read:audit permission', async () => {
    const auditRepository: AuditRepository = {
      record: vi.fn(),
      list: vi.fn(),
    };
    const { app, tokenService } = buildApp([], auditRepository);
    const token = await tokenService.issue({ userId, authVersion: 1 });

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(auditRepository.list).not.toHaveBeenCalled();
  });
});
