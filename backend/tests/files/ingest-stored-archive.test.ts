import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { Client } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ingestStoredArchive,
  loadIngestStoredArchiveCommand,
  runArchiveScanner,
  type IngestStoredArchiveInput,
} from '../../scripts/ingest-stored-archive.js';

const actorId = '70f3a0db-616d-43a3-a18d-5707f694f972';
const ownerId = '3ff337f3-749a-40b7-a913-180465bd3b73';
const archiveId = '34c542f9-1321-453a-85b0-cb14fc359dee';
const secondArchiveId = '827cb742-e33c-46ec-8c03-a43be158d55b';
const temporaryDirectories: string[] = [];
const ZIP_BYTES = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from('trusted archive test content'),
]);

async function createInput(
  overrides: Partial<IngestStoredArchiveInput> = {},
): Promise<IngestStoredArchiveInput> {
  const root = await mkdtemp(join(tmpdir(), 'qts-archive-ingest-'));
  temporaryDirectories.push(root);
  const sourcePath = join(root, 'source.zip');
  const storageRoot = join(root, 'storage');
  await writeFile(sourcePath, ZIP_BYTES);
  await mkdir(storageRoot, { mode: 0o700 });
  return {
    actorId,
    maxArchiveBytes: 1024 * 1024,
    originalFilename: 'QTS-customer-archive.zip',
    ownerId,
    scanner: {
      arguments: [],
      executable: resolve(process.execPath),
      maxOutputBytes: 4096,
      timeoutMs: 1000,
    },
    sourcePath,
    storageRoot,
    ...overrides,
  };
}

function createClient(options: {
  actorAllowed?: boolean;
  commitError?: Error;
  contextExists?: boolean;
  insertError?: Error;
} = {}) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM public.users AS user_account')) {
      return { rows: options.actorAllowed === false ? [] : [{ id: actorId }] };
    }
    if (/FROM public\.(?:users|contracts|tasks) AS context/u.test(sql)) {
      return { rows: options.contextExists === false ? [] : [{ id: ownerId }] };
    }
    if (sql.includes('INSERT INTO public.stored_files') && options.insertError) {
      throw options.insertError;
    }
    if (sql === 'COMMIT' && options.commitError) throw options.commitError;
    return { rows: [], rowCount: 1 };
  });
  return {
    databaseClient: { query } as unknown as Pick<Client, 'query'>,
    query,
  };
}

function storedArchivePath(input: IngestStoredArchiveInput): string {
  return join(input.storageRoot, 'stored-archives', `${archiveId}.zip`);
}

async function expectArchiveAbsent(input: IngestStoredArchiveInput): Promise<void> {
  await expect(access(storedArchivePath(input))).rejects.toMatchObject({
    code: 'ENOENT',
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe('stored archive ingestion command', () => {
  it('requires explicit safe input, scanner configuration, and one context', () => {
    const command = loadIngestStoredArchiveCommand(
      {
        DATABASE_URL: 'postgresql://database.example/qts',
        INTERNAL_FILE_STORAGE_ROOT: 'C:\\private-storage',
        ARCHIVE_SCANNER_EXECUTABLE: process.execPath,
        ARCHIVE_SCANNER_ARGS_JSON: '["--scan"]',
        ARCHIVE_INGEST_SOURCE_PATH: 'C:\\input\\source.zip',
        ARCHIVE_INGEST_ORIGINAL_FILENAME: 'customer.zip',
        ARCHIVE_INGEST_ACTOR_ID: actorId,
        ARCHIVE_INGEST_OWNER_ID: ownerId,
      },
      [],
    );

    expect(command.archive).toMatchObject({
      actorId,
      originalFilename: 'customer.zip',
      ownerId,
      scanner: { arguments: ['--scan'], executable: process.execPath },
    });

    expect(() =>
      loadIngestStoredArchiveCommand(
        {
          DATABASE_URL: 'postgresql://database.example/qts',
          INTERNAL_FILE_STORAGE_ROOT: 'C:\\private-storage',
          ARCHIVE_SCANNER_EXECUTABLE: process.execPath,
          ARCHIVE_INGEST_SOURCE_PATH: 'C:\\input\\source.zip',
          ARCHIVE_INGEST_ORIGINAL_FILENAME: 'customer.zip',
          ARCHIVE_INGEST_ACTOR_ID: actorId,
          ARCHIVE_INGEST_OWNER_ID: ownerId,
          ARCHIVE_INGEST_TASK_ID: ownerId,
        },
        [],
      ),
    ).toThrow('Exactly one owner');

    expect(() =>
      loadIngestStoredArchiveCommand(
        {
          DATABASE_URL: 'postgresql://database.example/qts',
          INTERNAL_FILE_STORAGE_ROOT: 'C:\\private-storage',
          ARCHIVE_SCANNER_EXECUTABLE: process.execPath,
          ARCHIVE_INGEST_SOURCE_PATH: 'C:\\input\\source.zip',
          ARCHIVE_INGEST_ORIGINAL_FILENAME: 'customer.zip',
          ARCHIVE_INGEST_ACTOR_ID: actorId,
          ARCHIVE_INGEST_OWNER_ID: ownerId,
        },
        ['--scanner-executable', process.execPath],
      ),
    ).toThrow('Unknown option');
  });

  it('copies exact bytes, records CLEAN metadata and audit in one transaction', async () => {
    const input = await createInput();
    const { databaseClient, query } = createClient();
    const scan = vi.fn().mockResolvedValue('CLEAN');

    const result = await ingestStoredArchive(databaseClient, input, {
      createId: () => archiveId,
      scan,
    });

    expect(result).toMatchObject({
      id: archiveId,
      sizeBytes: ZIP_BYTES.length,
      storageKey: `stored-archives/${archiveId}.zip`,
    });
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(await readFile(storedArchivePath(input))).toEqual(ZIP_BYTES);
    if (process.platform !== 'win32') {
      expect((await stat(storedArchivePath(input))).mode & 0o777).toBe(0o600);
    }
    expect(scan).toHaveBeenCalledWith(storedArchivePath(input), input.scanner);
    expect(query.mock.calls[0]?.[0]).toBe('BEGIN ISOLATION LEVEL SERIALIZABLE');
    expect(query.mock.calls[1]?.[0]).toBe(
      'SELECT pg_advisory_xact_lock(1903241087, 1145528769)',
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("permission.code = 'manage:file'"),
      [actorId],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.stored_files'),
      [
        archiveId,
        `stored-archives/${archiveId}.zip`,
        input.originalFilename,
        'zip',
        'application/zip',
        ZIP_BYTES.length,
        result.sha256,
        ownerId,
        null,
        null,
        actorId,
      ],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FILE.ARCHIVE_INGESTED'),
      [actorId, archiveId, 'OWNER', 'zip', ZIP_BYTES.length],
    );
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  });

  it('safely reuses the private archive directory without overwriting files', async () => {
    const input = await createInput();
    const scan = vi.fn().mockResolvedValue('CLEAN');
    await ingestStoredArchive(createClient().databaseClient, input, {
      createId: () => archiveId,
      scan,
    });
    await ingestStoredArchive(createClient().databaseClient, input, {
      createId: () => secondArchiveId,
      scan,
    });

    expect(
      (await readdir(join(input.storageRoot, 'stored-archives'))).sort(),
    ).toEqual(
      [`${archiveId}.zip`, `${secondArchiveId}.zip`].sort(),
    );
  });

  it.each([
    ['infected', vi.fn().mockResolvedValue('INFECTED')],
    ['scanner error', vi.fn().mockRejectedValue(new Error('scanner failed'))],
  ])('removes the copied file on %s and writes no database row', async (_label, scan) => {
    const input = await createInput();
    const { databaseClient, query } = createClient();

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan,
      }),
    ).rejects.toThrow();

    expect(query).not.toHaveBeenCalled();
    await expectArchiveAbsent(input);
  });

  it('enforces scanner timeout and bounded output', async () => {
    await expect(
      runArchiveScanner('C:\\private\\archive.zip', {
        arguments: ['-e', 'setTimeout(() => {}, 5000)'],
        executable: process.execPath,
        maxOutputBytes: 4096,
        timeoutMs: 100,
      }),
    ).rejects.toThrow('timed out');

    await expect(
      runArchiveScanner('C:\\private\\archive.zip', {
        arguments: ['-e', 'process.stdout.write("x".repeat(8192))'],
        executable: process.execPath,
        maxOutputBytes: 1024,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow('output exceeded');
  });

  it('removes the copied file and writes no database row after scanner timeout', async () => {
    const input = await createInput({
      scanner: {
        arguments: ['-e', 'setTimeout(() => {}, 5000)'],
        executable: resolve(process.execPath),
        maxOutputBytes: 4096,
        timeoutMs: 100,
      },
    });
    const { databaseClient, query } = createClient();

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
      }),
    ).rejects.toThrow('timed out');

    expect(query).not.toHaveBeenCalled();
    await expectArchiveAbsent(input);
  });

  it('maps scanner exit 0 to clean, exit 1 to infected, and other exits to failure', async () => {
    const executable = resolve(process.execPath);
    const config = {
      arguments: ['-e', 'process.exit(Number(process.argv[1]))'],
      executable,
      maxOutputBytes: 4096,
      timeoutMs: 1000,
    };

    await expect(runArchiveScanner('0', config)).resolves.toBe('CLEAN');
    await expect(runArchiveScanner('1', config)).resolves.toBe('INFECTED');
    await expect(runArchiveScanner('2', config)).rejects.toThrow(
      'scanner failed',
    );
  });

  it.each([
    ['unauthorized actor', { actorAllowed: false }, 'manage:file'],
    ['missing owner context', { contextExists: false }, 'does not exist'],
  ])('rolls back and removes the file for %s', async (_label, options, message) => {
    const input = await createInput();
    const { databaseClient, query } = createClient(options);

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan: vi.fn().mockResolvedValue('CLEAN'),
      }),
    ).rejects.toThrow(message);

    expect(query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
    expect(
      query.mock.calls.some(([sql]) =>
        String(sql).includes('INSERT INTO public.stored_files'),
      ),
    ).toBe(false);
    await expectArchiveAbsent(input);
  });

  it('rolls back and inode-safely removes a file after a pre-commit error', async () => {
    const input = await createInput();
    const { databaseClient, query } = createClient({
      insertError: new Error('insert failed'),
    });

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan: vi.fn().mockResolvedValue('CLEAN'),
      }),
    ).rejects.toThrow('insert failed');

    expect(query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
    await expectArchiveAbsent(input);
  });

  it('retains the file after an ambiguous COMMIT result', async () => {
    const input = await createInput();
    const { databaseClient, query } = createClient({
      commitError: new Error('connection lost'),
    });

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan: vi.fn().mockResolvedValue('CLEAN'),
      }),
    ).rejects.toThrow('retained for reconciliation');

    expect(query.mock.calls.map(([sql]) => sql)).not.toContain('ROLLBACK');
    expect(await readFile(storedArchivePath(input))).toEqual(ZIP_BYTES);
  });

  it('does not overwrite a colliding generated destination', async () => {
    const input = await createInput();
    const directory = join(input.storageRoot, 'stored-archives');
    await mkdir(directory, { recursive: true });
    const destination = storedArchivePath(input);
    await writeFile(destination, 'existing');
    const { databaseClient, query } = createClient();

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan: vi.fn().mockResolvedValue('CLEAN'),
      }),
    ).rejects.toThrow('could not be copied safely');

    expect(await readFile(destination, 'utf8')).toBe('existing');
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a source symlink before scanning', async () => {
    const input = await createInput();
    const linkedSource = join(resolve(input.storageRoot, '..'), 'linked-source.zip');
    try {
      await symlink(input.sourcePath, linkedSource, 'file');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES') return;
      throw error;
    }
    const { databaseClient, query } = createClient();
    const scan = vi.fn().mockResolvedValue('CLEAN');

    await expect(
      ingestStoredArchive(
        databaseClient,
        { ...input, sourcePath: linkedSource },
        { createId: () => archiveId, scan },
      ),
    ).rejects.toThrow('Symbolic links are not allowed');

    expect(scan).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(await readdir(input.storageRoot)).toEqual([]);
  });

  it('rejects a symlinked archive storage directory before scanning', async () => {
    const input = await createInput();
    const externalDirectory = await mkdtemp(join(tmpdir(), 'qts-archive-external-'));
    temporaryDirectories.push(externalDirectory);
    try {
      await symlink(
        externalDirectory,
        join(input.storageRoot, 'stored-archives'),
        'junction',
      );
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES') return;
      throw error;
    }
    const { databaseClient, query } = createClient();
    const scan = vi.fn().mockResolvedValue('CLEAN');

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan,
      }),
    ).rejects.toThrow('unavailable');

    expect(scan).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(await readdir(externalDirectory)).toEqual([]);
  });

  it('rejects invalid magic bytes before scanning or using the database', async () => {
    const input = await createInput();
    await writeFile(input.sourcePath, Buffer.from('not a ZIP archive'));
    const { databaseClient, query } = createClient();
    const scan = vi.fn().mockResolvedValue('CLEAN');

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan,
      }),
    ).rejects.toThrow('does not match');

    expect(scan).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    await expectArchiveAbsent(input);
  });

  it('rejects a scanner that mutates the copied inode before publication', async () => {
    const input = await createInput();
    const { databaseClient, query } = createClient();
    const scan = vi.fn(async (path: string) => {
      await writeFile(path, Buffer.concat([ZIP_BYTES, Buffer.from('changed')]));
      return 'CLEAN' as const;
    });

    await expect(
      ingestStoredArchive(databaseClient, input, {
        createId: () => archiveId,
        scan,
      }),
    ).rejects.toThrow('changed during malware scanning');

    expect(query).not.toHaveBeenCalled();
    await expectArchiveAbsent(input);
  });
});
