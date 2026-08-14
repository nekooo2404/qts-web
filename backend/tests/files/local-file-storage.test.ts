import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { LocalFileStorage } from '../../src/modules/files/local-file-storage.js';
import type { FileStorageError } from '../../src/modules/files/local-file-storage.js';

const temporaryDirectories: string[] = [];

async function createStorageRoot() {
  const directory = await mkdtemp(join(tmpdir(), 'qts-storage-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('LocalFileStorage', () => {
  it.each([
    '../outside.zip',
    'contracts/../../outside.zip',
    '/etc/passwd',
    'C:\\Windows\\system.ini',
    'contracts\\document.zip',
    'contracts//document.zip',
  ])('rejects unsafe storage key %s', async (storageKey) => {
    const root = await createStorageRoot();
    const storage = new LocalFileStorage(root);

    await expect(storage.readBuffer(storageKey, 1024)).rejects.toMatchObject({
      code: 'INVALID_STORAGE_KEY',
    } satisfies Partial<FileStorageError>);
  });

  it('rejects a symlink in the storage path', async () => {
    const root = await createStorageRoot();
    const outside = await createStorageRoot();
    await writeFile(join(outside, 'secret.zip'), 'secret');

    try {
      await symlink(outside, join(root, 'linked'), 'junction');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EPERM' || code === 'EACCES') return;
      throw error;
    }

    const storage = new LocalFileStorage(root);

    await expect(
      storage.readBuffer('linked/secret.zip', 1024),
    ).rejects.toMatchObject({ code: 'FILE_NOT_AVAILABLE' });
  });

  it('enforces the byte limit before reading a file into memory', async () => {
    const root = await createStorageRoot();
    await mkdir(join(root, 'templates'));
    await writeFile(join(root, 'templates', 'large.docx'), Buffer.alloc(11));
    const storage = new LocalFileStorage(root);

    await expect(
      storage.readBuffer('templates/large.docx', 10),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('opens a bounded stream and reads its signature from the same file handle', async () => {
    const root = await createStorageRoot();
    await mkdir(join(root, 'archives'));
    const content = Buffer.from('PK\u0003\u0004payload', 'binary');
    await writeFile(join(root, 'archives', 'record.zip'), content);
    const storage = new LocalFileStorage(root);

    const opened = await storage.openReadStream('archives/record.zip', {
      maxBytes: 1024,
      prefixBytes: 8,
    });
    const chunks: Buffer[] = [];
    for await (const chunk of opened.stream as AsyncIterable<unknown>) {
      if (typeof chunk === 'string' || chunk instanceof Uint8Array) {
        chunks.push(Buffer.from(chunk));
      } else {
        throw new TypeError('Expected the file stream to emit bytes');
      }
    }

    expect(opened.size).toBe(content.length);
    expect(opened.prefix).toEqual(content.subarray(0, 8));
    expect(Buffer.concat(chunks)).toEqual(content);
  });

  it('preflights SHA-256 and returns a stream only for the verified bytes', async () => {
    const root = await createStorageRoot();
    await mkdir(join(root, 'archives'));
    const content = Buffer.from('PK\u0003\u0004verified archive', 'binary');
    await writeFile(join(root, 'archives', 'record.zip'), content);
    const storage = new LocalFileStorage(root);

    const opened = await storage.openVerifiedReadStream(
      'archives/record.zip',
      {
        maxBytes: 1024,
        prefixBytes: 8,
        expectedSize: content.length,
        expectedSha256: createHash('sha256').update(content).digest('hex'),
      },
    );
    const chunks: Buffer[] = [];
    for await (const chunk of opened.stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }

    expect(opened.prefix).toEqual(content.subarray(0, 8));
    expect(Buffer.concat(chunks)).toEqual(content);
  });

  it('rejects same-size file tampering before exposing a readable stream', async () => {
    const root = await createStorageRoot();
    await mkdir(join(root, 'archives'));
    const original = Buffer.from('PK\u0003\u0004original-body', 'binary');
    const tampered = Buffer.from('PK\u0003\u0004tampered-body', 'binary');
    expect(tampered.length).toBe(original.length);
    await writeFile(join(root, 'archives', 'record.zip'), tampered);
    const storage = new LocalFileStorage(root);

    await expect(
      storage.openVerifiedReadStream('archives/record.zip', {
        maxBytes: 1024,
        prefixBytes: 8,
        expectedSize: original.length,
        expectedSha256: createHash('sha256').update(original).digest('hex'),
      }),
    ).rejects.toMatchObject({ code: 'FILE_NOT_AVAILABLE' });
  });

  it('streams the verified snapshot when the source is overwritten after preflight', async () => {
    const root = await createStorageRoot();
    await mkdir(join(root, 'archives'));
    const original = Buffer.from('PK\u0003\u0004original-body', 'binary');
    const tampered = Buffer.from('PK\u0003\u0004tampered-body', 'binary');
    const source = join(root, 'archives', 'record.zip');
    await writeFile(source, original);
    const storage = new LocalFileStorage(root);

    const opened = await storage.openVerifiedReadStream(
      'archives/record.zip',
      {
        maxBytes: 1024,
        prefixBytes: 8,
        expectedSize: original.length,
        expectedSha256: createHash('sha256').update(original).digest('hex'),
      },
    );
    await writeFile(source, tampered);

    const chunks: Buffer[] = [];
    for await (const chunk of opened.stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks)).toEqual(original);
    expect(Buffer.concat(chunks)).not.toEqual(tampered);
  });

  it('aborts verification and removes its temporary snapshot', async () => {
    const root = await createStorageRoot();
    const snapshots = await createStorageRoot();
    await mkdir(join(root, 'archives'));
    const content = Buffer.alloc(16 * 1024 * 1024, 0x41);
    const source = join(root, 'archives', 'record.zip');
    await writeFile(source, content);
    const storage = new LocalFileStorage(root, snapshots);
    const abort = new AbortController();

    const opening = storage.openVerifiedReadStream(
      'archives/record.zip',
      {
        maxBytes: content.length,
        prefixBytes: 8,
        expectedSize: content.length,
        expectedSha256: createHash('sha256').update(content).digest('hex'),
        signal: abort.signal,
      },
    );

    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ((await readdir(snapshots)).length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    expect(await readdir(snapshots)).not.toHaveLength(0);
    abort.abort(new Error('client disconnected'));

    await expect(opening).rejects.toThrow('client disconnected');
    expect(await readdir(snapshots)).toEqual([]);
    await expect(rm(source)).resolves.toBeUndefined();
  });
});
