import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  authorize,
  requireAllPermissions,
  requireAnyPermission,
} from '../../src/middleware/authorize.js';
import type { AuthenticationLocals } from '../../src/middleware/authenticate.js';
import { errorHandler } from '../../src/middleware/error-handler.js';

function buildApp(permissions?: readonly string[]) {
  const app = express();
  if (permissions !== undefined) {
    app.use((_request, response, next) => {
      (response.locals as AuthenticationLocals).auth = {
        userId: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        email: 'employee@qts.vn',
        displayName: 'QTS Employee',
        authVersion: 1,
        permissions: new Set(permissions),
      };
      next();
    });
  }
  return app;
}

describe('authorization middleware', () => {
  it('allows a request that has every required permission', async () => {
    const app = buildApp(['read:contract', 'write:contract']);
    app.get(
      '/contracts',
      requireAllPermissions('read:contract', 'write:contract'),
      (_request, response) => response.sendStatus(204),
    );
    app.use(errorHandler);

    await request(app).get('/contracts').expect(204);
  });

  it('allows a request that has one of the accepted permissions', async () => {
    const app = buildApp(['approve:contract']);
    app.get(
      '/contracts',
      requireAnyPermission('write:contract', 'approve:contract'),
      (_request, response) => response.sendStatus(204),
    );
    app.use(errorHandler);

    await request(app).get('/contracts').expect(204);
  });

  it('requires both allOf and anyOf groups when both are configured', async () => {
    const app = buildApp(['read:contract', 'approve:contract']);
    app.get(
      '/contracts',
      authorize({
        allOf: ['read:contract'],
        anyOf: ['write:contract', 'approve:contract'],
      }),
      (_request, response) => response.sendStatus(204),
    );
    app.use(errorHandler);

    await request(app).get('/contracts').expect(204);
  });

  it('returns 403 when an actor lacks a required permission', async () => {
    const app = buildApp(['read:contract']);
    app.get(
      '/contracts',
      requireAllPermissions('read:contract', 'write:contract'),
      (_request, response) => response.sendStatus(204),
    );
    app.use(errorHandler);

    const response = await request(app).get('/contracts');

    expect(response.status).toBe(403);
    expect(response.text).toContain('"code":"FORBIDDEN"');
  });

  it('returns 401 when authentication has not populated an actor', async () => {
    const app = buildApp();
    app.get(
      '/contracts',
      requireAnyPermission('read:contract'),
      (_request, response) => response.sendStatus(204),
    );
    app.use(errorHandler);

    const response = await request(app).get('/contracts');

    expect(response.status).toBe(401);
    expect(response.text).toContain('"code":"UNAUTHENTICATED"');
  });

  it('rejects an empty permission requirement during route setup', () => {
    expect(() => authorize({})).toThrow('At least one permission is required');
    expect(() => requireAllPermissions('')).toThrow(
      'Permission codes must not be empty',
    );
  });
});
