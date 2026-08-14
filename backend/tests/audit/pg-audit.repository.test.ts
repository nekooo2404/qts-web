import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgAuditRepository } from '../../src/modules/audit/pg-audit.repository.js';

const actorId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';
const requestId = 'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c';

describe('PgAuditRepository', () => {
  it('records only the allowlisted audit fields with a parameterized insert', async () => {
    const query = vi.fn<DatabasePool['query']>(async () => ({
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [],
    }));
    const repository = new PgAuditRepository({ query } as unknown as DatabasePool);

    await repository.record({
      actorUserId: actorId,
      action: 'TASK.UPDATE',
      resourceType: 'TASK',
      resourceId: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
      outcome: 'SUCCESS',
      requestId,
      metadata: {
        method: 'PATCH',
        statusCode: 200,
        ipHash: 'hmac-value',
      },
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.audit_logs'),
      [
        actorId,
        'TASK.UPDATE',
        'TASK',
        '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
        'SUCCESS',
        requestId,
        JSON.stringify({
          method: 'PATCH',
          statusCode: 200,
          ipHash: 'hmac-value',
        }),
      ],
    );
    expect(String(query.mock.calls[0]?.[0])).not.toContain(actorId);
  });

  it('returns a stable, newest-first paginated projection', async () => {
    const occurredAt = new Date('2026-08-13T14:00:00.000Z');
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'a5c8e561-4f89-4a52-a704-ce6356f5d14c',
            actor_user_id: actorId,
            action: 'TASK.UPDATE',
            resource_type: 'TASK',
            resource_id: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
            outcome: 'SUCCESS',
            request_id: requestId,
            metadata: { method: 'PATCH', statusCode: 200 },
            occurred_at: occurredAt,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: '1' }] });
    const repository = new PgAuditRepository({ query } as unknown as DatabasePool);

    await expect(
      repository.list({
        page: 2,
        pageSize: 10,
        actorUserId: actorId,
        outcome: 'SUCCESS',
      }),
    ).resolves.toEqual({
      items: [
        {
          id: 'a5c8e561-4f89-4a52-a704-ce6356f5d14c',
          actorUserId: actorId,
          action: 'TASK.UPDATE',
          resourceType: 'TASK',
          resourceId: '51f96baa-8e5c-4261-b6fb-4234d0fb422b',
          outcome: 'SUCCESS',
          requestId,
          metadata: { method: 'PATCH', statusCode: 200 },
          occurredAt,
        },
      ],
      page: 2,
      pageSize: 10,
      totalItems: 1,
    });

    expect(String(query.mock.calls[0]?.[0])).toContain(
      'ORDER BY occurred_at DESC, id DESC',
    );
    expect(query.mock.calls[0]?.[1]).toEqual([actorId, 'SUCCESS', 10, 10]);
    expect(query.mock.calls[1]?.[1]).toEqual([actorId, 'SUCCESS']);
  });
});
