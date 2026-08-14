import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { requestContext } from '../../src/common/request-context.js';
import type { AuthenticationLocals } from '../../src/middleware/authenticate.js';
import {
  createInternalAuditMiddleware,
  createLoginAuditMiddleware,
} from '../../src/modules/audit/audit.middleware.js';
import type { AuditRepository } from '../../src/modules/audit/audit.repository.js';

const actorId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';

function repositoryWith(record: AuditRepository['record']): AuditRepository {
  return { record, list: vi.fn() };
}

async function nextTurn(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('audit middleware', () => {
  it('uses the full URL when mounted on a protected route prefix', async () => {
    const record = vi.fn<AuditRepository['record']>(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.use((_request, response, next) => {
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(['write:task']),
      };
      next();
    });
    app.use(
      '/api/tasks',
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
    );
    app.patch('/api/tasks/:id', (_request, response) => {
      response.status(204).send();
    });

    await request(app).patch(
      '/api/tasks/51f96baa-8e5c-4261-b6fb-4234d0fb422b',
    );
    await nextTurn();

    expect(record).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'TASK.UPDATE',
        resourceType: 'TASK',
        resourceId: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
        outcome: 'ATTEMPT',
      }),
    );
  });

  it('durably records an attempt before next even when the response never finishes', async () => {
    const order: string[] = [];
    const record = vi.fn<AuditRepository['record']>(async (event) => {
      order.push(`audit:${event.outcome}`);
    });
    const once = vi.fn();
    const response = {
      locals: {
        requestId: 'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c',
        auth: {
          userId: actorId,
          email: 'admin@qts.vn',
          displayName: 'QTS Admin',
          authVersion: 1,
          permissions: new Set(['write:task']),
        },
      },
      once,
      statusCode: 200,
    } as unknown as Response;
    const request = {
      method: 'POST',
      path: '/api/tasks',
      originalUrl: '/api/tasks',
      ip: '127.0.0.1',
      socket: {},
    } as Request;
    const next = vi.fn(() => {
      order.push('next');
    }) as unknown as NextFunction;

    await Promise.resolve(
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      })(request, response, next),
    );

    expect(order).toEqual(['audit:ATTEMPT', 'next']);
    expect(once).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('audits archive downloads without storing a filename or file bytes', async () => {
    const record = vi.fn<AuditRepository['record']>(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.use((_request, response, next) => {
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(['read:file']),
      };
      next();
    });
    app.use(
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
    );
    app.get('/api/files/archives/:id/download', (_request, response) => {
      response.type('application/zip').send(Buffer.from('PK\x03\x04secret'));
    });

    const response = await request(app).get(
      '/api/files/archives/51f96baa-8e5c-4261-b6fb-4234d0fb422b/download',
    );
    await nextTurn();

    expect(response.status).toBe(200);
    expect(record).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'FILE.DOWNLOAD',
        resourceType: 'FILE',
        resourceId: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
        outcome: 'ATTEMPT',
      }),
    );
    expect(record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'FILE.DOWNLOAD',
        outcome: 'SUCCESS',
      }),
    );
    expect(JSON.stringify(record.mock.calls)).not.toContain('secret');
  });

  it('records a successful authenticated mutation without raw request data', async () => {
    const record = vi.fn<AuditRepository['record']>(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.use(express.json());
    app.use((request, response, next) => {
      void request;
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(['write:task']),
      };
      next();
    });
    app.use(
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
    );
    app.patch('/api/tasks/:id', (_request, response) => {
      response.json({ data: { id: _request.params.id } });
    });

    const response = await request(app)
      .patch('/api/tasks/51f96baa-8e5c-4261-b6fb-4234d0fb422b')
      .set('Authorization', 'Bearer secret-token')
      .set('X-Forwarded-For', '203.0.113.42')
      .send({ title: 'Confidential contract task' });
    await nextTurn();

    expect(response.status).toBe(200);
    expect(record).toHaveBeenCalledTimes(2);
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      actorUserId: actorId,
      action: 'TASK.UPDATE',
      outcome: 'ATTEMPT',
      metadata: {
        method: 'PATCH',
        ipHashAlgorithm: 'HMAC-SHA256',
      },
    });
    const event = record.mock.calls[1]?.[0];
    expect(event).toMatchObject({
      actorUserId: actorId,
      action: 'TASK.UPDATE',
      resourceType: 'TASK',
      resourceId: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
      outcome: 'SUCCESS',
      requestId: response.headers['x-request-id'],
      metadata: {
        method: 'PATCH',
        statusCode: 200,
        ipHashAlgorithm: 'HMAC-SHA256',
      },
    });
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain('Confidential contract task');
    expect(serialized).not.toContain('admin@qts.vn');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('203.0.113.42');
  });

  it('records denied login without persisting submitted credentials', async () => {
    const record = vi.fn<AuditRepository['record']>(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.use(express.json());
    app.post(
      '/api/auth/login',
      createLoginAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
      (_request, response) => {
        response.status(401).json({ error: { code: 'INVALID_CREDENTIALS' } });
      },
    );

    await request(app).post('/api/auth/login').send({
      email: 'unknown@qts.vn',
      password: 'do-not-store-this-password',
    });
    await nextTurn();

    expect(record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'AUTH.LOGIN',
        resourceType: 'AUTHENTICATION',
        outcome: 'DENIED',
      }),
    );
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'unknown@qts.vn',
    );
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      'do-not-store-this-password',
    );
  });

  it('links a successful login to the authenticated internal user id', async () => {
    const record = vi.fn(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.post(
      '/api/auth/login',
      createLoginAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
      (_request, response) => {
        (response.locals as { auditActorUserId?: string }).auditActorUserId =
          actorId;
        response.json({ data: { accessToken: 'not-inspected-by-audit' } });
      },
    );

    await request(app).post('/api/auth/login');
    await nextTurn();

    expect(record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actorUserId: actorId,
        action: 'AUTH.LOGIN',
        outcome: 'SUCCESS',
      }),
    );
  });

  it('fails closed before the login handler when its attempt cannot be audited', async () => {
    const downstream = vi.fn((_request: Request, response: Response) => {
      response.json({ data: { accessToken: 'must-not-be-issued' } });
    });
    const app = express();
    app.use(requestContext);
    app.post(
      '/api/auth/login',
      createLoginAuditMiddleware({
        repository: repositoryWith(
          vi.fn(async () => {
            throw new Error('audit storage unavailable');
          }),
        ),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
      downstream,
    );
    app.use(
      (
        _error: unknown,
        _request: Request,
        response: Response,
        _next: NextFunction,
      ) => {
      response.status(503).json({ error: { code: 'AUDIT_UNAVAILABLE' } });
      },
    );

    const response = await request(app).post('/api/auth/login');

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AUDIT_UNAVAILABLE');
    expect(downstream).not.toHaveBeenCalled();
  });

  it('fails closed before a mutation when the attempt audit cannot be persisted', async () => {
    const warn = vi.fn();
    const downstream = vi.fn((_request: Request, response: Response) => {
      response.status(204).send();
    });
    const app = express();
    app.use(requestContext);
    app.use((request, response, next) => {
      void request;
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(),
      };
      next();
    });
    app.use(
      createInternalAuditMiddleware({
        repository: repositoryWith(
          vi.fn(async () => {
            throw new Error('database contains sensitive diagnostics');
          }),
        ),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
        logger: { warn },
      }),
    );
    app.delete('/api/tasks/:id', downstream);
    app.use(
      (
        _error: unknown,
        _request: Request,
        response: Response,
        _next: NextFunction,
      ) => {
        response.status(503).json({ error: { code: 'AUDIT_UNAVAILABLE' } });
      },
    );

    const response = await request(app).delete(
      '/api/tasks/51f96baa-8e5c-4261-b6fb-4234d0fb422b',
    );
    await nextTurn();

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AUDIT_UNAVAILABLE');
    expect(downstream).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'audit_attempt_write_failed',
        errorType: 'Error',
      }),
      'audit attempt log write failed',
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      'database contains sensitive diagnostics',
    );
  });

  it('records the result asynchronously without changing an already successful response', async () => {
    const warn = vi.fn();
    const record = vi
      .fn<AuditRepository['record']>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('result audit unavailable'));
    const app = express();
    app.use(requestContext);
    app.use((_request, response, next) => {
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(['write:task']),
      };
      next();
    });
    app.use(
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
        logger: { warn },
      }),
    );
    app.patch('/api/tasks/:id', (_request, response) => {
      response.status(204).send();
    });

    const response = await request(app).patch(
      '/api/tasks/51f96baa-8e5c-4261-b6fb-4234d0fb422b',
    );
    await nextTurn();

    expect(response.status).toBe(204);
    expect(record.mock.calls[0]?.[0].outcome).toBe('ATTEMPT');
    expect(record.mock.calls[1]?.[0].outcome).toBe('SUCCESS');
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'audit_write_failed' }),
      'audit log write failed',
    );
  });

  it('uses replacement actions only for the bounded RBAC routes', async () => {
    const record = vi.fn<AuditRepository['record']>(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.use((request, response, next) => {
      void request;
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(['manage:role']),
      };
      next();
    });
    app.use(
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
    );
    app.post('/api/admin/permissions', (_request, response) => {
      response.status(422).send();
    });
    app.put(
      '/api/admin/roles/:id/permissions',
      (_request, response) => {
        response.status(422).send();
      },
    );
    app.put('/api/admin/users/:id/roles', (_request, response) => {
      response.status(422).send();
    });
    app.put('/api/admin/permissions', (_request, response) => {
      response.status(422).send();
    });
    app.put('/api/admin/roles/:id', (_request, response) => {
      response.status(422).send();
    });

    await request(app).post('/api/admin/permissions');
    await request(app).put(
      '/api/admin/roles/51f96baa-8e5c-4261-b6fb-4234d0fb422b/permissions',
    );
    await request(app).put(
      '/api/admin/users/51f96baa-8e5c-4261-b6fb-4234d0fb422b/roles',
    );
    await request(app).put('/api/admin/permissions');
    await request(app).put(
      '/api/admin/roles/51f96baa-8e5c-4261-b6fb-4234d0fb422b',
    );
    await nextTurn();

    const resultEvents = record.mock.calls
      .map(([event]) => event)
      .filter((event) => event.outcome !== 'ATTEMPT');
    expect(resultEvents.map((event) => event.action)).toEqual([
      'PERMISSION.CREATE',
      'ROLE.PERMISSIONS_REPLACE',
      'USER.ROLES_REPLACE',
      'PERMISSION.UPDATE',
      'ROLE.UPDATE',
    ]);
    expect(resultEvents.every((event) => event.outcome === 'FAILURE')).toBe(
      true,
    );
  });

  it('does not duplicate successful access-management transaction audits', async () => {
    const record = vi.fn<AuditRepository['record']>(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.use((request, response, next) => {
      void request;
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(['manage:user', 'manage:role']),
      };
      next();
    });
    app.use(
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
    );
    app.patch('/api/admin/users/:id', (_request, response) => {
      response.json({ data: { updated: true } });
    });
    app.put(
      '/api/admin/roles/:id/permissions',
      (_request, response) => {
        response.status(204).send();
      },
    );

    await request(app).patch(
      '/api/admin/users/51f96baa-8e5c-4261-b6fb-4234d0fb422b',
    );
    await request(app).put(
      '/api/admin/roles/51f96baa-8e5c-4261-b6fb-4234d0fb422b/permissions',
    );
    await nextTurn();

    expect(record).toHaveBeenCalledTimes(2);
    expect(record.mock.calls.map(([event]) => event.outcome)).toEqual([
      'ATTEMPT',
      'ATTEMPT',
    ]);
  });

  it('records failed access-management mutations as a non-transactional fallback', async () => {
    const record = vi.fn(async () => undefined);
    const app = express();
    app.use(requestContext);
    app.use((request, response, next) => {
      void request;
      (response.locals as AuthenticationLocals).auth = {
        userId: actorId,
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        authVersion: 1,
        permissions: new Set(['manage:user']),
      };
      next();
    });
    app.use(
      createInternalAuditMiddleware({
        repository: repositoryWith(record),
        ipHashSecret: 'audit-test-secret-that-is-at-least-32-bytes',
      }),
    );
    app.patch('/api/admin/users/:id', (_request, response) => {
      response.status(409).json({ error: { code: 'CONFLICT' } });
    });

    await request(app).patch(
      '/api/admin/users/51f96baa-8e5c-4261-b6fb-4234d0fb422b',
    );
    await nextTurn();

    expect(record).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: 'USER.UPDATE',
        resourceType: 'USER',
        outcome: 'ATTEMPT',
      }),
    );
    expect(record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'USER.UPDATE',
        resourceType: 'USER',
        outcome: 'FAILURE',
      }),
    );
  });
});
