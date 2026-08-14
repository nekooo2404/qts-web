import type { Client } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { bootstrapAdministrator } from '../../scripts/bootstrap-admin.js';

const adminInput = {
  email: 'admin@qts.vn',
  passwordHash: 'scrypt$encoded-bootstrap-password-hash',
  fullName: 'QTS Administrator',
  employeeCode: 'QTS-ADMIN',
};

function clientWithAdminState(hasAdminUser: boolean) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM public.roles')) {
      return { rows: [{ id: '02000000-0000-4000-8000-000000000001' }] };
    }
    if (sql.includes('SELECT EXISTS')) {
      return { rows: [{ exists: hasAdminUser }] };
    }
    return { rows: [], rowCount: 1 };
  });
  return {
    client: { query } as unknown as Pick<Client, 'query'>,
    query,
  };
}

describe('bootstrapAdministrator', () => {
  it('refuses and rolls back before inserting when an ADMIN user already exists', async () => {
    const { client, query } = clientWithAdminState(true);

    await expect(
      bootstrapAdministrator(client, adminInput, () => 'new-user-id'),
    ).rejects.toThrow('An administrator account already exists');

    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(
      query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO public.users')),
    ).toBe(false);
  });

  it('creates the first user and assigns ADMIN in one transaction', async () => {
    const { client, query } = clientWithAdminState(false);

    await bootstrapAdministrator(client, adminInput, () => 'new-user-id');

    expect(query.mock.calls[0]?.[0]).toBe('BEGIN');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.users'),
      [
        'new-user-id',
        'admin@qts.vn',
        'scrypt$encoded-bootstrap-password-hash',
        'QTS Administrator',
        'QTS-ADMIN',
      ],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.user_roles'),
      [
        'new-user-id',
        '02000000-0000-4000-8000-000000000001',
      ],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.audit_logs'),
      ['new-user-id'],
    );
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  });
});
