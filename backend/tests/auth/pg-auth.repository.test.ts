import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgAuthRepository } from '../../src/modules/auth/pg-auth.repository.js';

function createRepository() {
  const query = vi.fn();
  const repository = new PgAuthRepository({ query } as unknown as DatabasePool);
  return { query, repository };
}

describe('PgAuthRepository', () => {
  it('loads login credentials by normalized email without exposing SQL injection', async () => {
    const { query, repository } = createRepository();
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
          email: 'admin@qts.vn',
          full_name: 'QTS Admin',
          password_hash: 'scrypt$encoded',
          auth_version: 3,
          status: 'ACTIVE',
          login_locked: false,
        },
      ],
    });

    await expect(repository.findUserByEmail('admin@qts.vn')).resolves.toEqual({
      id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      email: 'admin@qts.vn',
      displayName: 'QTS Admin',
      passwordHash: 'scrypt$encoded',
      authVersion: 3,
      isActive: true,
      isLoginLocked: false,
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('email = $1'), [
      'admin@qts.vn',
    ]);
  });

  it('loads current permissions and treats a non-active account as disabled', async () => {
    const { query, repository } = createRepository();
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
          email: 'employee@qts.vn',
          full_name: 'QTS Employee',
          auth_version: 4,
          status: 'SUSPENDED',
          permissions: ['write:contract', 'read:contract'],
        },
      ],
    });

    await expect(
      repository.findUserAuthorizationById(
        '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      ),
    ).resolves.toEqual({
      id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      email: 'employee@qts.vn',
      displayName: 'QTS Employee',
      authVersion: 4,
      isActive: false,
      permissions: ['write:contract', 'read:contract'],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('array_agg(DISTINCT permission.code'),
      ['0e00e7a5-c3e4-4187-af18-8dc38a8128bf'],
    );
  });

  it('returns null when the user does not exist', async () => {
    const { query, repository } = createRepository();
    query.mockResolvedValue({ rows: [] });

    await expect(repository.findUserByEmail('missing@qts.vn')).resolves.toBeNull();
    await expect(
      repository.findUserAuthorizationById(
        '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      ),
    ).resolves.toBeNull();
  });

  it('atomically records a failed login and starts a lock at the threshold', async () => {
    const { query, repository } = createRepository();
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await repository.recordFailedLogin(
      '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/failed_login_attempts[\s\S]+locked_until/),
      ['0e00e7a5-c3e4-4187-af18-8dc38a8128bf', 5, 900_000],
    );
  });

  it('resets failures only when the same active unlocked account still exists', async () => {
    const { query, repository } = createRepository();
    query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-id' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(
      repository.recordSuccessfulLogin(
        '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        7,
      ),
    ).resolves.toBe(true);
    await expect(
      repository.recordSuccessfulLogin(
        '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        7,
      ),
    ).resolves.toBe(false);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'ACTIVE'"),
      ['0e00e7a5-c3e4-4187-af18-8dc38a8128bf', 7],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('last_login_at = CURRENT_TIMESTAMP'),
      ['0e00e7a5-c3e4-4187-af18-8dc38a8128bf', 7],
    );
  });
});
