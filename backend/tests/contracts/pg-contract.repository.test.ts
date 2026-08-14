import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgContractRepository } from '../../src/modules/contracts/pg-contract.repository.js';

function createPool() {
  const query = vi.fn();
  return {
    query,
    pool: { query } as unknown as DatabasePool,
  };
}

describe('PgContractRepository authorization scope', () => {
  const actorId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';
  const ownerId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';
  const templateId = '9b230e11-e2ec-4e59-aa45-6630378f0c71';

  it('only creates against an active capable owner and active template', async () => {
    const { pool, query } = createPool();
    query.mockResolvedValueOnce({ rows: [] });
    const repository = new PgContractRepository(pool);

    await expect(
      repository.create(
        {
          contractNumber: 'QTS-2026-101',
          title: 'Scoped contract',
          clientName: 'Example Company',
          ownerId,
          templateId,
        },
        { actorId, canManageAll: true },
      ),
    ).resolves.toEqual({ kind: 'context_unavailable' });

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("owner.status = 'ACTIVE'");
    expect(sql).toContain("permission.code = 'read:contract'");
    expect(sql).toContain('template.is_active = TRUE');
    expect(query.mock.calls[0]?.[1]).toEqual([
      'QTS-2026-101',
      'Scoped contract',
      'Example Company',
      ownerId,
      templateId,
      'DRAFT',
      'VND',
      null,
      null,
      null,
      {},
      actorId,
    ]);
  });

  it('applies owner scope to employee contract lists', async () => {
    const { pool, query } = createPool();
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] });
    const repository = new PgContractRepository(pool);

    await repository.list(
      {
        actorId: 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5',
        canManageAll: false,
      },
      { page: 1, pageSize: 20 },
    );

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('($2::boolean OR owner_id = $1)');
    expect(query.mock.calls[0]?.[1]).toEqual([
      'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5',
      false,
      20,
      0,
    ]);
  });

  it('allows manage:contract access to bypass the same SQL owner guard', async () => {
    const { pool, query } = createPool();
    query.mockResolvedValueOnce({ rows: [] });
    const repository = new PgContractRepository(pool);

    await repository.findById('7f9a956f-48ec-45f1-9300-7086f8aaf406', {
      actorId: 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5',
      canManageAll: true,
    });

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('($3::boolean OR owner_id = $2)');
    expect(query.mock.calls[0]?.[1]).toEqual([
      '7f9a956f-48ec-45f1-9300-7086f8aaf406',
      'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5',
      true,
    ]);
  });
});
