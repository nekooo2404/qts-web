import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import express from 'express';
import request from 'supertest';
import type { Response as SuperAgentResponse } from 'superagent';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestContext } from '../../src/common/request-context.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import {
  downloadArchiveController,
} from '../../src/modules/files/archive-download.controller.js';
import { InFlightArchiveDownloadController } from '../../src/modules/files/archive-download-admission.js';
import type { ArchiveRepository } from '../../src/modules/files/archive.repository.js';
import {
  FileStorageError,
  type FileStorage,
  type StoredFileStream,
} from '../../src/modules/files/file-storage.js';
import { LocalFileStorage } from '../../src/modules/files/local-file-storage.js';

const archiveId = '34c542f9-1321-453a-85b0-cb14fc359dee';
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

function parseBinary(
  response: SuperAgentResponse,
  callback: (error: Error | null, body?: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error: Error) => callback(error));
}

function createDependencies(options?: {
  filename?: string;
  prefix?: Buffer;
  accessible?: boolean;
  metadataSize?: number;
  verificationError?: FileStorageError;
}) {
  const content = Buffer.from('PK\u0003\u0004archive body', 'binary');
  const sha256 = createHash('sha256').update(content).digest('hex');
  const findAccessibleById = vi.fn(async () =>
    options?.accessible === false
      ? null
      : {
          id: archiveId,
          storageKey: 'archives/customer-record.zip',
          originalFilename: options?.filename ?? 'customer-record.zip',
          sizeBytes: options?.metadataSize ?? content.length,
          sha256,
        },
  );
  const repository: ArchiveRepository = {
    findAccessibleById,
  };
  const stream = Readable.from(content);
  const opened: StoredFileStream = {
    stream,
    size: content.length,
    prefix: options?.prefix ?? content.subarray(0, 8),
  };
  const openVerifiedReadStream = vi.fn(async () => {
    if (options?.verificationError) throw options.verificationError;
    return opened;
  });
  const storage: FileStorage = {
    readBuffer: vi.fn(),
    openReadStream: vi.fn(),
    openVerifiedReadStream,
  };

  const app = express();
  app.use(requestContext);
  app.get(
    '/api/files/archives/:id/download',
    downloadArchiveController({
      repository,
      storage,
      resolveActor: () => ({ id: 'employee-1' }),
      maxArchiveBytes: 10 * 1024 * 1024,
      admissionController: new InFlightArchiveDownloadController({
        maxDownloads: 4,
        maxBytes: 40 * 1024 * 1024,
      }),
      retryAfterSeconds: 5,
    }),
  );
  app.use(errorHandler);

  return { app, findAccessibleById, openVerifiedReadStream, sha256 };
}

describe('GET /api/files/archives/:id/download', () => {
  it('looks up authorization by actor before opening and streaming the archive', async () => {
    const { app, findAccessibleById, openVerifiedReadStream, sha256 } =
      createDependencies();

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    ).buffer(true).parse(parseBinary);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(Buffer.from('PK\u0003\u0004archive body', 'binary'));
    expect(response.headers['content-type']).toBe('application/zip');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(findAccessibleById).toHaveBeenCalledWith(
      'employee-1',
      archiveId,
    );
    expect(openVerifiedReadStream).toHaveBeenCalledWith(
      'archives/customer-record.zip',
      {
        maxBytes: 10 * 1024 * 1024,
        prefixBytes: 8,
        expectedSize: Buffer.byteLength('PK\u0003\u0004archive body', 'binary'),
        expectedSha256: sha256,
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('returns the same not-found result for missing and inaccessible archives', async () => {
    const { app, openVerifiedReadStream } = createDependencies({
      accessible: false,
    });

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(response.status).toBe(404);
    expect(response.text).toContain('"code":"ARCHIVE_NOT_AVAILABLE"');
    expect(openVerifiedReadStream).not.toHaveBeenCalled();
  });

  it('refuses metadata whose filename is not a zip or rar archive', async () => {
    const { app, openVerifiedReadStream } = createDependencies({
      filename: 'payload.exe',
    });

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(response.status).toBe(404);
    expect(response.text).toContain('"code":"ARCHIVE_NOT_AVAILABLE"');
    expect(openVerifiedReadStream).not.toHaveBeenCalled();
  });

  it('refuses an archive whose magic bytes do not match its extension', async () => {
    const { app } = createDependencies({
      filename: 'payload.zip',
      prefix: Buffer.from('MZnotzip'),
    });

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(response.status).toBe(404);
    expect(response.text).toContain('"code":"ARCHIVE_NOT_AVAILABLE"');
  });

  it('refuses a file whose size differs from the authorized database record', async () => {
    const { app } = createDependencies({ metadataSize: 999 });

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(response.status).toBe(404);
    expect(response.text).toContain('"code":"ARCHIVE_NOT_AVAILABLE"');
  });

  it('returns generic 404 without file headers when integrity preflight fails', async () => {
    const { app } = createDependencies({
      verificationError: new FileStorageError(
        'FILE_NOT_AVAILABLE',
        'Stored file integrity check failed',
      ),
    });

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ARCHIVE_NOT_AVAILABLE');
    expect(response.headers['content-disposition']).toBeUndefined();
    expect(response.headers['content-length']).not.toBe(
      String(Buffer.byteLength('PK\u0003\u0004archive body', 'binary')),
    );
  });

  it('does not serve same-size bytes that differ from the authorized digest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qts-download-test-'));
    temporaryDirectories.push(root);
    await mkdir(join(root, 'archives'));
    const original = Buffer.from('PK\u0003\u0004original-body', 'binary');
    const tampered = Buffer.from('PK\u0003\u0004tampered-body', 'binary');
    expect(tampered.length).toBe(original.length);
    await writeFile(join(root, 'archives', 'customer-record.zip'), tampered);

    const repository: ArchiveRepository = {
      findAccessibleById: vi.fn(async () => ({
        id: archiveId,
        storageKey: 'archives/customer-record.zip',
        originalFilename: 'customer-record.zip',
        sizeBytes: original.length,
        sha256: createHash('sha256').update(original).digest('hex'),
      })),
    };
    const app = express();
    app.use(requestContext);
    app.get(
      '/api/files/archives/:id/download',
      downloadArchiveController({
        repository,
        storage: new LocalFileStorage(root),
        resolveActor: () => ({ id: 'employee-1' }),
        maxArchiveBytes: 1024,
        admissionController: new InFlightArchiveDownloadController({
          maxDownloads: 1,
          maxBytes: 1024,
        }),
        retryAfterSeconds: 5,
      }),
    );
    app.use(errorHandler);

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ARCHIVE_NOT_AVAILABLE');
    expect(response.headers['content-disposition']).toBeUndefined();
    expect(response.body).not.toEqual(tampered);
  });

  it('sanitizes archive filenames before building response headers', async () => {
    const { app } = createDependencies({
      filename: 'QTS Archive"\r\nX-Injected: yes.zip',
    });

    const response = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).not.toMatch(/[\r\n]/);
    expect(response.headers['x-injected']).toBeUndefined();
  });

  it('rejects concurrent preflight work before opening storage when the count limit is exhausted', async () => {
    const content = Buffer.from('PK\u0003\u0004archive body', 'binary');
    const sha256 = createHash('sha256').update(content).digest('hex');
    let resolveFirst!: (opened: StoredFileStream) => void;
    let markFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstPreflight = new Promise<StoredFileStream>((resolve) => {
      resolveFirst = resolve;
    });
    const openVerifiedReadStream = vi
      .fn()
      .mockImplementationOnce(() => {
        markFirstStarted();
        return firstPreflight;
      })
      .mockResolvedValue({
        stream: Readable.from(content),
        size: content.length,
        prefix: content.subarray(0, 8),
      });
    const repository: ArchiveRepository = {
      findAccessibleById: vi.fn(async () => ({
        id: archiveId,
        storageKey: 'archives/customer-record.zip',
        originalFilename: 'customer-record.zip',
        sizeBytes: content.length,
        sha256,
      })),
    };
    const app = express();
    app.use(requestContext);
    app.get(
      '/api/files/archives/:id/download',
      downloadArchiveController({
        repository,
        storage: {
          readBuffer: vi.fn(),
          openReadStream: vi.fn(),
          openVerifiedReadStream,
        },
        resolveActor: () => ({ id: 'employee-1' }),
        maxArchiveBytes: 1024,
        admissionController: new InFlightArchiveDownloadController({
          maxDownloads: 1,
          maxBytes: 1024,
        }),
        retryAfterSeconds: 7,
      }),
    );
    app.use(errorHandler);

    const firstResponse = request(app)
      .get(`/api/files/archives/${archiveId}/download`)
      .buffer(true)
      .parse(parseBinary);
    const firstResult = firstResponse.then((response) => response);
    await firstStarted;

    const busyResponse = await request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );

    expect(busyResponse.status).toBe(503);
    expect(busyResponse.body.error.code).toBe('ARCHIVE_DOWNLOAD_BUSY');
    expect(busyResponse.headers['retry-after']).toBe('7');
    expect(openVerifiedReadStream).toHaveBeenCalledTimes(1);

    resolveFirst({
      stream: Readable.from(content),
      size: content.length,
      prefix: content.subarray(0, 8),
    });
    expect((await firstResult).status).toBe(200);

    const afterRelease = await request(app)
      .get(`/api/files/archives/${archiveId}/download`)
      .buffer(true)
      .parse(parseBinary);
    expect(afterRelease.status).toBe(200);
    expect(openVerifiedReadStream).toHaveBeenCalledTimes(2);
  });

  it('aborts preflight on disconnect and releases admission capacity', async () => {
    const content = Buffer.from('PK\u0003\u0004archive body', 'binary');
    const sha256 = createHash('sha256').update(content).digest('hex');
    let markPreflightStarted!: () => void;
    const preflightStarted = new Promise<void>((resolve) => {
      markPreflightStarted = resolve;
    });
    let markCleanup!: () => void;
    const cleanupCompleted = new Promise<void>((resolve) => {
      markCleanup = resolve;
    });
    const openVerifiedReadStream = vi
      .fn()
      .mockImplementationOnce(
        (_storageKey: string, options: { signal?: AbortSignal }) => {
          markPreflightStarted();
          return new Promise<StoredFileStream>((_resolve, reject) => {
            options.signal?.addEventListener(
              'abort',
              () => {
                markCleanup();
                reject(
                  options.signal?.reason instanceof Error
                    ? options.signal.reason
                    : new Error('aborted'),
                );
              },
              { once: true },
            );
          });
        },
      )
      .mockResolvedValue({
        stream: Readable.from(content),
        size: content.length,
        prefix: content.subarray(0, 8),
      });
    const repository: ArchiveRepository = {
      findAccessibleById: vi.fn(async () => ({
        id: archiveId,
        storageKey: 'archives/customer-record.zip',
        originalFilename: 'customer-record.zip',
        sizeBytes: content.length,
        sha256,
      })),
    };
    const admission = new InFlightArchiveDownloadController({
      maxDownloads: 1,
      maxBytes: 1024,
    });
    const app = express();
    app.use(requestContext);
    app.get(
      '/api/files/archives/:id/download',
      downloadArchiveController({
        repository,
        storage: {
          readBuffer: vi.fn(),
          openReadStream: vi.fn(),
          openVerifiedReadStream,
        },
        resolveActor: () => ({ id: 'employee-1' }),
        maxArchiveBytes: 1024,
        admissionController: admission,
        retryAfterSeconds: 5,
      }),
    );
    app.use(errorHandler);

    const disconnected = request(app).get(
      `/api/files/archives/${archiveId}/download`,
    );
    disconnected.end(() => undefined);
    await preflightStarted;
    disconnected.abort();
    await cleanupCompleted;
    await new Promise((resolve) => setImmediate(resolve));

    const afterAbort = await request(app)
      .get(`/api/files/archives/${archiveId}/download`)
      .buffer(true)
      .parse(parseBinary);

    expect(afterAbort.status).toBe(200);
    expect(openVerifiedReadStream).toHaveBeenCalledTimes(2);
  });
});
