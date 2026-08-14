import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgContractTemplateRepository } from '../../src/modules/contracts/pg-document-generation.repository.js';
import { PgArchiveRepository } from '../../src/modules/files/pg-archive.repository.js';

function createPool() {
  const query = vi.fn();
  return {
    query,
    pool: { query } as unknown as DatabasePool,
  };
}

describe('PgArchiveRepository', () => {
  it('selects only clean, undeleted zip/rar files with actor resource scope', async () => {
    const { pool, query } = createPool();
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '34c542f9-1321-453a-85b0-cb14fc359dee',
          storage_key: 'archives/customer-record.zip',
          original_filename: 'customer-record.zip',
          size_bytes: '4096',
          sha256: 'a'.repeat(64),
        },
      ],
    });
    const repository = new PgArchiveRepository(pool);

    await expect(
      repository.findAccessibleById(
        '70f3a0db-616d-43a3-a18d-5707f694f972',
        '34c542f9-1321-453a-85b0-cb14fc359dee',
      ),
    ).resolves.toEqual({
      id: '34c542f9-1321-453a-85b0-cb14fc359dee',
      storageKey: 'archives/customer-record.zip',
      originalFilename: 'customer-record.zip',
      sizeBytes: 4096,
      sha256: 'a'.repeat(64),
    });

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('FROM public.stored_files');
    expect(sql).toContain("file.scan_status = 'CLEAN'");
    expect(sql).toContain('file.deleted_at IS NULL');
    expect(sql).toContain("file.extension IN ('zip', 'rar')");
    expect(sql).toContain('file.sha256');
    expect(sql).toContain('file.owner_id = $1');
    expect(sql).toContain('contract.owner_id = $1');
    expect(sql).toContain('task.assigned_to = $1');
    expect(sql).not.toContain('read:contract:any');
  });

  it('treats malformed integrity metadata as unavailable', async () => {
    const { pool, query } = createPool();
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '34c542f9-1321-453a-85b0-cb14fc359dee',
          storage_key: 'archives/customer-record.zip',
          original_filename: 'customer-record.zip',
          size_bytes: '4096',
          sha256: 'NOT-A-DIGEST',
        },
      ],
    });

    await expect(
      new PgArchiveRepository(pool).findAccessibleById(
        '70f3a0db-616d-43a3-a18d-5707f694f972',
        '34c542f9-1321-453a-85b0-cb14fc359dee',
      ),
    ).resolves.toBeNull();
  });
});

describe('PgContractTemplateRepository', () => {
  it('loads only an active server-managed template by identifier', async () => {
    const { pool, query } = createPool();
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'f25e1d3e-e4df-475d-a7b2-6a4a35f50dc2',
          storage_key: 'templates/customer-contract.docx',
          allowed_fields: ['customerName'],
          output_filename: 'customer-contract.docx',
        },
      ],
    });
    const repository = new PgContractTemplateRepository(pool);

    await repository.findAccessibleById(
      '70f3a0db-616d-43a3-a18d-5707f694f972',
      'f25e1d3e-e4df-475d-a7b2-6a4a35f50dc2',
    );

    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('FROM public.contract_templates');
    expect(sql).toContain('is_active = TRUE');
    expect(sql).not.toContain('write:contract:any');
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      'f25e1d3e-e4df-475d-a7b2-6a4a35f50dc2',
    ]);
  });
});
