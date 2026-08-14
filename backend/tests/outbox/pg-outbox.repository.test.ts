import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgOutboxRepository } from '../../src/modules/outbox/pg-outbox.repository.js';

function createPool() {
  const query = vi.fn();
  return {
    query,
    pool: { query } as unknown as DatabasePool,
  };
}

describe('PgOutboxRepository', () => {
  it('increments an attempt atomically when claiming an event', async () => {
    const { pool, query } = createPool();
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'f411e5c4-1417-4e63-88d0-d0ec41f54c64',
          aggregate_id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
          attempt_count: 1,
          max_attempts: 8,
        },
      ],
    });
    const repository = new PgOutboxRepository(pool);

    const events = await repository.claimBatch(
      'worker-1',
      1,
      60_000,
      new Date('2026-08-13T13:30:00.000Z'),
    );

    expect(events[0]?.attemptCount).toBe(1);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('attempt_count = outbox.attempt_count + 1');
    expect(sql).toContain("last_error = 'WORKER_LEASE_EXPIRED'");
    expect(sql).toContain('attempt_count >= max_attempts');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('does not increment the same attempt again when recording failure', async () => {
    const { pool, query } = createPool();
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    const repository = new PgOutboxRepository(pool);

    await repository.markFailed(
      'f411e5c4-1417-4e63-88d0-d0ec41f54c64',
      'worker-1',
      {
        isDead: false,
        errorCode: 'SMTP_TRANSIENT',
        nextAttemptAt: new Date('2026-08-13T13:31:00.000Z'),
      },
    );

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).not.toMatch(/attempt_count\s*=\s*attempt_count\s*\+/u);
  });
});
