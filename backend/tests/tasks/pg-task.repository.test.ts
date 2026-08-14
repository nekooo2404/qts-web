import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgTaskRepository } from '../../src/modules/tasks/pg-task.repository.js';

const taskId = 'cf08076a-45a8-432b-89ed-5870fcfd7b16';
const assigneeId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';
const actorId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';

function repositoryWithQuery() {
  const query = vi.fn();
  return {
    query,
    repository: new PgTaskRepository({ query } as unknown as DatabasePool),
  };
}

describe('PgTaskRepository assignment safeguards', () => {
  it('uses independent contract and lead scopes when creating a task', async () => {
    const { query, repository } = repositoryWithQuery();
    query.mockResolvedValueOnce({ rows: [] });

    await repository.create(
      {
        title: 'Scoped task',
        contractId: '7f9a956f-48ec-45f1-9300-7086f8aaf406',
        leadId: 'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c',
      },
      {
        actorId,
        canManageAll: true,
        canManageAllContracts: false,
        canManageAllLeads: true,
      },
    );

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('($8::boolean OR contract.owner_id = $7)');
    expect(sql).toContain('($9::boolean OR lead.assigned_to = $7)');
    expect(query.mock.calls[0]?.[1]).toEqual([
      'Scoped task',
      null,
      'MEDIUM',
      '7f9a956f-48ec-45f1-9300-7086f8aaf406',
      'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c',
      null,
      actorId,
      false,
      true,
    ]);
  });

  it('checks terminal state and active read:task capability in the update', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            current_version: 2,
            current_status: 'TODO',
            assignee_available: true,
          },
        ],
      });

    await repository.assign(taskId, assigneeId, 1, actorId);

    const updateSql = String(query.mock.calls[0]?.[0]);
    expect(updateSql).toContain("status NOT IN ('DONE', 'CANCELLED')");
    expect(updateSql).toContain("assignee.status = 'ACTIVE'");
    expect(updateSql).toContain("permission.code = 'read:task'");
    expect(query.mock.calls[0]?.[1]).toEqual([
      assigneeId,
      taskId,
      1,
      actorId,
    ]);
  });

  it('returns terminal_state for a completed task at the expected version', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            current_version: 3,
            current_status: 'DONE',
            assignee_available: true,
          },
        ],
      });

    await expect(repository.assign(taskId, null, 3, actorId)).resolves.toEqual({
      kind: 'terminal_state',
    });
  });

  it('returns assignee_unavailable without exposing whether the user exists', async () => {
    const { query, repository } = repositoryWithQuery();
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            current_version: 4,
            current_status: 'IN_PROGRESS',
            assignee_available: false,
          },
        ],
      });

    await expect(
      repository.assign(taskId, assigneeId, 4, actorId),
    ).resolves.toEqual({ kind: 'assignee_unavailable' });
  });
});
