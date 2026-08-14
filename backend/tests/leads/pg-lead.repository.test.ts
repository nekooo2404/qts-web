import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgLeadRepository } from '../../src/modules/leads/pg-lead.repository.js';

const leadId = 'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c';
const employeeId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';
const adminId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';

describe('PgLeadRepository.assign', () => {
  it('updates only the expected version and to an active assignee with read access', async () => {
    const assignedAt = new Date('2026-08-13T14:00:00.000Z');
    const query = vi.fn().mockResolvedValueOnce({
      rows: [
        {
          lead_id: leadId,
          assigned_to: employeeId,
          assigned_by: adminId,
          assigned_at: assignedAt,
          version: 2,
        },
      ],
    });
    const repository = new PgLeadRepository({ query } as unknown as DatabasePool);

    await expect(repository.assign(leadId, employeeId, 1, adminId)).resolves.toEqual({
      kind: 'updated',
      assignment: {
        leadId,
        assignedTo: employeeId,
        assignedBy: adminId,
        assignedAt,
        version: 2,
      },
    });

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('lead.version = $3');
    expect(sql).toContain("assignee.status = 'ACTIVE'");
    expect(sql).toContain("permission.code = 'read:lead'");
    expect(sql).toContain('version = lead.version + 1');
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      employeeId,
      leadId,
      1,
      adminId,
    ]);
  });

  it('reports a stale version before assignee availability', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ current_version: 3, assignee_available: false }],
      });
    const repository = new PgLeadRepository({ query } as unknown as DatabasePool);

    await expect(repository.assign(leadId, employeeId, 2, adminId)).resolves.toEqual({
      kind: 'version_conflict',
    });
  });
});
