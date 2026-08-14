import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { AccessManagementRepository } from '../../src/modules/access-management/access-management.repository.js';
import type { AuditRepository } from '../../src/modules/audit/audit.repository.js';
import { createAccessTokenService } from '../../src/modules/auth/access-token.service.js';
import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import type { CmsRepository } from '../../src/modules/cms/cms.repository.js';
import type { ContractRepository } from '../../src/modules/contracts/contract.repository.js';
import type { LeadRepository } from '../../src/modules/leads/lead.repository.js';
import type { ProjectRepository } from '../../src/modules/projects/project.repository.js';
import type { PublicContentRepository } from '../../src/modules/public-content/public-content.repository.js';
import type { TaskRepository } from '../../src/modules/tasks/task.repository.js';

describe('createApp public and internal route boundaries', () => {
  it('keeps public routes anonymous while protecting internal routes', async () => {
    const findUserAuthorizationById = vi.fn();
    const authRepository: AuthRepository = {
      findUserByEmail: vi.fn(),
      findUserAuthorizationById,
      recordFailedLogin: vi.fn(),
      recordSuccessfulLogin: vi.fn(),
    };
    const projectRepository: ProjectRepository = {
      listPublished: vi.fn(async ({ page, pageSize }) => ({
        items: [],
        page,
        pageSize,
        totalItems: 0,
      })),
      findPublishedById: vi.fn(),
    };
    const publicContentRepository: PublicContentRepository = {
      listCapabilities: vi.fn(),
      listSolutions: vi.fn(),
      listMetrics: vi.fn(),
      getCompanyInfo: vi.fn(),
    };

    const app = createApp({
      contactRepository: {
        createWithNotification: vi.fn(),
      },
      projectRepository,
      publicContentRepository,
      contactRateLimit: false,
      enableRequestLogging: false,
      internalPortal: {
        authRepository,
        tokenService: createAccessTokenService({
          secret: 'test-secret-that-is-at-least-32-bytes-long',
          issuer: 'qts-test',
          audience: 'qts-test-client',
          expiresInSeconds: 900,
        }),
        leadRepository: {} as LeadRepository,
        contractRepository: {} as ContractRepository,
        taskRepository: {} as TaskRepository,
        accessManagementRepository: {} as AccessManagementRepository,
        cmsRepository: {} as CmsRepository,
        loginRateLimit: false,
      },
    });

    const publicResponse = await request(app).get('/api/projects');
    const internalResponse = await request(app).get('/api/leads/assigned');

    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.pagination).toEqual({
      page: 1,
      pageSize: 12,
      totalItems: 0,
      totalPages: 0,
    });
    expect(internalResponse.status).toBe(401);
    expect(internalResponse.body.error.code).toBe('UNAUTHENTICATED');
    expect(findUserAuthorizationById).not.toHaveBeenCalled();
  });

  it('rate-limits login before writing a fail-closed audit attempt', async () => {
    const record = vi.fn<AuditRepository['record']>(async () => undefined);
    const authRepository: AuthRepository = {
      findUserByEmail: vi.fn(),
      findUserAuthorizationById: vi.fn(),
      recordFailedLogin: vi.fn(),
      recordSuccessfulLogin: vi.fn(),
    };
    const app = createApp({
      contactRepository: { createWithNotification: vi.fn() },
      projectRepository: {} as ProjectRepository,
      publicContentRepository: {} as PublicContentRepository,
      contactRateLimit: false,
      enableRequestLogging: false,
      internalPortal: {
        authRepository,
        tokenService: createAccessTokenService({
          secret: 'test-secret-that-is-at-least-32-bytes-long',
          issuer: 'qts-test',
          audience: 'qts-test-client',
          expiresInSeconds: 900,
        }),
        leadRepository: {} as LeadRepository,
        contractRepository: {} as ContractRepository,
        taskRepository: {} as TaskRepository,
        accessManagementRepository: {} as AccessManagementRepository,
        cmsRepository: {} as CmsRepository,
        auditRepository: { record, list: vi.fn() },
        auditIpHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      },
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post('/api/auth/login');
      expect(response.status).toBe(415);
    }
    const callsBeforeLimit = record.mock.calls.length;

    const limitedResponse = await request(app).post('/api/auth/login');

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.error.code).toBe('RATE_LIMITED');
    expect(record).toHaveBeenCalledTimes(callsBeforeLimit);
    expect(authRepository.findUserByEmail).not.toHaveBeenCalled();
  });
});
