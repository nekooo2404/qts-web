import type { QueryResult } from 'pg';
import { describe, expect, it } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgContactLeadRepository } from '../../src/modules/contact/pg-contact.repository.js';

interface StoredLead {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  message: string;
}

interface StoredOutbox {
  leadId: string;
}

function queryResult<T extends object>(rows: T[], rowCount = rows.length): QueryResult<T> {
  return {
    command: '',
    rowCount,
    oid: 0,
    fields: [],
    rows,
  };
}

class TransactionalFakePool {
  public leads: StoredLead[] = [];
  public outbox: StoredOutbox[] = [];
  public failOutboxInsert = false;

  async connect() {
    let stagedLeads: StoredLead[] | null = null;
    let stagedOutbox: StoredOutbox[] | null = null;

    return {
      query: async (sql: string, values: unknown[] = []) => {
        if (sql === 'BEGIN') {
          stagedLeads = [...this.leads];
          stagedOutbox = [...this.outbox];
          return queryResult([]);
        }
        if (sql === 'COMMIT') {
          this.leads = stagedLeads ?? [];
          this.outbox = stagedOutbox ?? [];
          return queryResult([]);
        }
        if (sql === 'ROLLBACK') {
          stagedLeads = null;
          stagedOutbox = null;
          return queryResult([]);
        }
        if (sql.includes('INSERT INTO public.contact_leads')) {
          const id = '0e00e7a5-c3e4-4187-af18-8dc38a8128bf';
          stagedLeads?.push({
            id,
            customerName: String(values[0]),
            phone: String(values[1]),
            email: String(values[2]),
            message: String(values[3]),
          });
          return queryResult([
            {
              id,
              status: 'NEW' as const,
              created_at: new Date('2026-08-13T13:00:00.000Z'),
            },
          ]);
        }
        if (sql.includes('INSERT INTO public.email_outbox')) {
          if (this.failOutboxInsert) {
            throw new Error('forced outbox failure');
          }
          stagedOutbox?.push({ leadId: String(values[0]) });
          return queryResult([]);
        }
        throw new Error(`Unexpected SQL in fake database: ${sql}`);
      },
      release: () => undefined,
    };
  }
}

const input = {
  customerName: 'Nguyễn Minh Anh',
  phone: '+84901234567',
  email: 'minh.anh@example.com',
  message: 'Tôi cần tư vấn giải pháp chuyển đổi số.',
};

describe('PgContactLeadRepository.createWithNotification', () => {
  it('commits one lead and one outbox event atomically', async () => {
    const fakePool = new TransactionalFakePool();
    const repository = new PgContactLeadRepository(
      fakePool as unknown as DatabasePool,
    );

    const lead = await repository.createWithNotification(input);

    expect(lead.status).toBe('NEW');
    expect(fakePool.leads).toEqual([
      expect.objectContaining({
        id: lead.id,
        email: 'minh.anh@example.com',
      }),
    ]);
    expect(fakePool.outbox).toEqual([{ leadId: lead.id }]);
  });

  it('rolls the lead back when the outbox insert fails', async () => {
    const fakePool = new TransactionalFakePool();
    fakePool.failOutboxInsert = true;
    const repository = new PgContactLeadRepository(
      fakePool as unknown as DatabasePool,
    );

    await expect(repository.createWithNotification(input)).rejects.toThrow(
      'forced outbox failure',
    );

    expect(fakePool.leads).toEqual([]);
    expect(fakePool.outbox).toEqual([]);
  });
});
