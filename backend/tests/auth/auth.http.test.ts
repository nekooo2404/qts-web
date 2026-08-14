import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { requestContext } from '../../src/common/request-context.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import {
  authenticate,
  getAuthenticatedUser,
  requirePermission,
} from '../../src/middleware/authenticate.js';
import { createAccessTokenService } from '../../src/modules/auth/access-token.service.js';
import { createAuthRouter } from '../../src/modules/auth/auth.router.js';
import type {
  AuthRepository,
  AuthenticatedUserRecord,
  LoginUserRecord,
} from '../../src/modules/auth/auth.repository.js';
import { hashPassword } from '../../src/modules/auth/password.js';

const tokenService = createAccessTokenService({
  secret: 'test-secret-that-is-at-least-thirty-two-bytes-long',
  issuer: 'qts-internal-api',
  audience: 'qts-internal-portal',
  expiresInSeconds: 900,
});

function createRepository(options?: {
  loginUser?: LoginUserRecord | null;
  authenticatedUser?: AuthenticatedUserRecord | null;
  successfulLoginAccepted?: boolean;
}): AuthRepository {
  return {
    findUserByEmail: vi.fn(async () => options?.loginUser ?? null),
    findUserAuthorizationById: vi.fn(
      async () => options?.authenticatedUser ?? null,
    ),
    recordFailedLogin: vi.fn(async () => undefined),
    recordSuccessfulLogin: vi.fn(
      async () => options?.successfulLoginAccepted ?? true,
    ),
  };
}

function buildApp(repository: AuthRepository) {
  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use('/api/auth', createAuthRouter({ repository, tokenService }));
  app.get(
    '/api/contracts',
    authenticate({ repository, tokenService }),
    requirePermission('read:contract'),
    (_request, response) => {
      const actor = getAuthenticatedUser(response.locals);
      response.json({ data: { userId: actor.userId } });
    },
  );
  app.use(errorHandler);
  return app;
}

describe('POST /api/auth/login', () => {
  it('returns an access token and a non-sensitive user projection', async () => {
    const passwordHash = await hashPassword('QTS-Strong-Passphrase-2026!');
    const repository = createRepository({
      loginUser: {
        id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        passwordHash,
        authVersion: 3,
        isActive: true,
        isLoginLocked: false,
      },
    });
    const app = buildApp(repository);

    const response = await request(app).post('/api/auth/login').send({
      email: '  ADMIN@QTS.VN ',
      password: 'QTS-Strong-Passphrase-2026!',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 900,
        user: {
          id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
          email: 'admin@qts.vn',
          displayName: 'QTS Admin',
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
    expect(repository.findUserByEmail).toHaveBeenCalledWith('admin@qts.vn');
    expect(repository.recordSuccessfulLogin).toHaveBeenCalledWith(
      '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      3,
    );
  });

  it.each([
    'unknown account',
    'incorrect password',
    'disabled account',
    'locked account',
  ] as const)(
    'returns the same 401 for an %s',
    async (scenario) => {
      const loginUser =
        scenario === 'unknown account'
          ? null
          : {
              id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
              email: 'admin@qts.vn',
              displayName: 'QTS Admin',
              passwordHash: await hashPassword('actual-password'),
              authVersion: 1,
              isActive: scenario !== 'disabled account',
              isLoginLocked: scenario === 'locked account',
            };
      const password =
        scenario === 'disabled account' || scenario === 'locked account'
          ? 'actual-password'
          : 'wrong-password';
      const repository = createRepository({ loginUser });
      const app = buildApp(repository);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@qts.vn', password });

      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      });
      expect(repository.recordSuccessfulLogin).not.toHaveBeenCalled();

      if (scenario === 'incorrect password') {
        expect(repository.recordFailedLogin).toHaveBeenCalledWith(
          '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        );
      } else {
        expect(repository.recordFailedLogin).not.toHaveBeenCalled();
      }
    },
  );

  it('returns generic invalid credentials when the account changes during login', async () => {
    const passwordHash = await hashPassword('QTS-Strong-Passphrase-2026!');
    const repository = createRepository({
      loginUser: {
        id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        email: 'admin@qts.vn',
        displayName: 'QTS Admin',
        passwordHash,
        authVersion: 3,
        isActive: true,
        isLoginLocked: false,
      },
      successfulLoginAccepted: false,
    });
    const app = buildApp(repository);

    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@qts.vn',
      password: 'QTS-Strong-Passphrase-2026!',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects unknown login fields before repository access', async () => {
    const repository = createRepository();
    const app = buildApp(repository);

    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@qts.vn',
      password: 'password',
      isAdmin: true,
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(repository.findUserByEmail).not.toHaveBeenCalled();
  });
});

describe('authenticate and requirePermission', () => {
  const userId = '0e00e7a5-c3e4-4187-af18-8dc38a8128bf';

  it('reloads the active user and current permissions for every request', async () => {
    const findUserAuthorizationById = vi
      .fn<() => Promise<AuthenticatedUserRecord | null>>()
      .mockResolvedValueOnce({
        id: userId,
        email: 'employee@qts.vn',
        displayName: 'QTS Employee',
        authVersion: 4,
        isActive: true,
        permissions: ['read:contract'],
      })
      .mockResolvedValueOnce({
        id: userId,
        email: 'employee@qts.vn',
        displayName: 'QTS Employee',
        authVersion: 4,
        isActive: true,
        permissions: [],
      });
    const repository: AuthRepository = {
      findUserByEmail: vi.fn(),
      findUserAuthorizationById,
      recordFailedLogin: vi.fn(),
      recordSuccessfulLogin: vi.fn(),
    };
    const app = buildApp(repository);
    const token = await tokenService.issue({ userId, authVersion: 4 });

    const first = await request(app)
      .get('/api/contracts')
      .set('Authorization', `Bearer ${token}`);
    const second = await request(app)
      .get('/api/contracts')
      .set('Authorization', `Bearer ${token}`);

    expect(first.status).toBe(200);
    expect(first.body.data.userId).toBe(userId);
    expect(second.status).toBe(403);
    expect(second.body.error.code).toBe('FORBIDDEN');
    expect(findUserAuthorizationById).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['missing authorization', undefined],
    ['wrong scheme', 'Basic credentials'],
    ['malformed bearer token', 'Bearer invalid-token'],
  ])('returns 401 for %s', async (_case, authorization) => {
    const app = buildApp(createRepository());
    const pending = request(app).get('/api/contracts');
    if (authorization !== undefined) pending.set('Authorization', authorization);

    const response = await pending;

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a disabled user and an authVersion mismatch', async () => {
    const repository = createRepository({
      authenticatedUser: {
        id: userId,
        email: 'employee@qts.vn',
        displayName: 'QTS Employee',
        authVersion: 6,
        isActive: true,
        permissions: ['read:contract'],
      },
    });
    const app = buildApp(repository);
    const oldToken = await tokenService.issue({ userId, authVersion: 5 });

    const response = await request(app)
      .get('/api/contracts')
      .set('Authorization', `Bearer ${oldToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
