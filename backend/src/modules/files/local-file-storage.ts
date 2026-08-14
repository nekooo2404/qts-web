import { createHash, timingSafeEqual } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdtemp, open, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

import {
  FileStorageError,
  type FileStorage,
  type OpenStoredFileOptions,
  type OpenVerifiedStoredFileOptions,
  type StoredFileStream,
} from './file-storage.js';

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,254}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const HASH_CHUNK_BYTES = 64 * 1024;

function validateLimit(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer`);
  }
}

function validateStorageKey(storageKey: string): string[] {
  if (
    storageKey.length === 0 ||
    storageKey.length > 1024 ||
    storageKey.includes('\0') ||
    storageKey.includes('\\') ||
    storageKey.includes('//') ||
    isAbsolute(storageKey)
  ) {
    throw new FileStorageError('INVALID_STORAGE_KEY', 'Storage key is invalid');
  }

  const segments = storageKey.split('/');
  if (
    segments.some(
      (segment) =>
        segment === '.' || segment === '..' || !SAFE_SEGMENT.test(segment),
    )
  ) {
    throw new FileStorageError('INVALID_STORAGE_KEY', 'Storage key is invalid');
  }
  return segments;
}

function isContained(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot.length > 0 &&
    fromRoot !== '..' &&
    !fromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(fromRoot)
  );
}

function unavailable(): FileStorageError {
  return new FileStorageError(
    'FILE_NOT_AVAILABLE',
    'Stored file is not available',
  );
}

interface OpenedStoredFile {
  handle: Awaited<ReturnType<typeof open>>;
  size: number;
}

interface TemporarySnapshot {
  directory: string;
  handle: Awaited<ReturnType<typeof open>>;
}

async function createTemporarySnapshot(
  temporaryRoot: string,
  signal?: AbortSignal,
): Promise<TemporarySnapshot> {
  signal?.throwIfAborted();
  const directory = await mkdtemp(
    join(temporaryRoot, 'qts-archive-download-'),
  );
  let handle: TemporarySnapshot['handle'] | undefined;
  try {
    signal?.throwIfAborted();
    handle = await open(
      join(directory, 'verified.snapshot'),
      constants.O_CREAT | constants.O_EXCL | constants.O_RDWR,
      0o600,
    );
    signal?.throwIfAborted();
    return { directory, handle };
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function removeTemporarySnapshot(snapshot: TemporarySnapshot): Promise<void> {
  await snapshot.handle.close().catch(() => undefined);
  await rm(snapshot.directory, { recursive: true, force: true }).catch(
    () => undefined,
  );
}

async function writeAll(
  handle: TemporarySnapshot['handle'],
  bytes: Buffer,
  position: number,
  signal?: AbortSignal,
): Promise<void> {
  let written = 0;
  while (written < bytes.length) {
    signal?.throwIfAborted();
    const result = await handle.write(
      bytes,
      written,
      bytes.length - written,
      position + written,
    );
    if (result.bytesWritten === 0) {
      throw new Error('Could not write verified archive snapshot');
    }
    written += result.bytesWritten;
    signal?.throwIfAborted();
  }
}

export class LocalFileStorage implements FileStorage {
  private readonly configuredRoot: string;
  private readonly temporaryRoot: string;

  constructor(storageRoot: string, temporaryRoot: string = tmpdir()) {
    if (storageRoot.trim().length === 0) {
      throw new TypeError('Storage root is required');
    }
    if (temporaryRoot.trim().length === 0) {
      throw new TypeError('Temporary root is required');
    }
    this.configuredRoot = resolve(storageRoot);
    this.temporaryRoot = resolve(temporaryRoot);
  }

  async readBuffer(storageKey: string, maxBytes: number): Promise<Buffer> {
    const { handle, size } = await this.openRegularFile(storageKey, maxBytes);
    try {
      const content = Buffer.alloc(size);
      let offset = 0;
      while (offset < size) {
        const { bytesRead } = await handle.read(
          content,
          offset,
          size - offset,
          offset,
        );
        if (bytesRead === 0) throw unavailable();
        offset += bytesRead;
      }

      const sentinel = Buffer.alloc(1);
      const { bytesRead: extraBytes } = await handle.read(sentinel, 0, 1, size);
      if (extraBytes !== 0) {
        throw new FileStorageError(
          'FILE_TOO_LARGE',
          'Stored file changed while it was being read',
        );
      }
      return content;
    } finally {
      await handle.close();
    }
  }

  async openReadStream(
    storageKey: string,
    options: OpenStoredFileOptions,
  ): Promise<StoredFileStream> {
    validateLimit(options.prefixBytes, 'prefixBytes');
    const { handle, size } = await this.openRegularFile(
      storageKey,
      options.maxBytes,
      options.signal,
    );
    try {
      options.signal?.throwIfAborted();
      const prefix = Buffer.alloc(Math.min(options.prefixBytes, size));
      if (prefix.length !== 0) {
        await handle.read(prefix, 0, prefix.length, 0);
        options.signal?.throwIfAborted();
      }

      if (size === 0) {
        await handle.close();
        return { stream: Readable.from([]), size, prefix };
      }

      return {
        stream: handle.createReadStream({
          autoClose: true,
          start: 0,
          end: size - 1,
          ...(options.signal ? { signal: options.signal } : {}),
        }),
        size,
        prefix,
      };
    } catch (error) {
      await handle.close();
      throw error;
    }
  }

  async openVerifiedReadStream(
    storageKey: string,
    options: OpenVerifiedStoredFileOptions,
  ): Promise<StoredFileStream> {
    validateLimit(options.prefixBytes, 'prefixBytes');
    if (
      !Number.isSafeInteger(options.expectedSize) ||
      options.expectedSize < 0
    ) {
      throw new TypeError('expectedSize must be a non-negative safe integer');
    }
    if (!SHA256_HEX.test(options.expectedSha256)) {
      throw new TypeError('expectedSha256 must be a lowercase SHA-256 digest');
    }

    const { handle, size } = await this.openRegularFile(
      storageKey,
      options.maxBytes,
      options.signal,
    );
    let snapshot: TemporarySnapshot | undefined;
    try {
      if (size !== options.expectedSize) throw unavailable();

      options.signal?.throwIfAborted();
      snapshot = await createTemporarySnapshot(
        this.temporaryRoot,
        options.signal,
      );
      const prefix = Buffer.alloc(Math.min(options.prefixBytes, size));
      const chunk = Buffer.allocUnsafe(Math.min(HASH_CHUNK_BYTES, size || 1));
      const hash = createHash('sha256');
      let offset = 0;

      while (offset < size) {
        options.signal?.throwIfAborted();
        const requestedBytes = Math.min(chunk.length, size - offset);
        const { bytesRead } = await handle.read(
          chunk,
          0,
          requestedBytes,
          offset,
        );
        options.signal?.throwIfAborted();
        if (bytesRead === 0) throw unavailable();

        const bytes = chunk.subarray(0, bytesRead);
        hash.update(bytes);
        await writeAll(snapshot.handle, bytes, offset, options.signal);
        if (offset < prefix.length) {
          bytes.copy(
            prefix,
            offset,
            0,
            Math.min(bytes.length, prefix.length - offset),
          );
        }
        offset += bytesRead;
      }

      const sentinel = Buffer.alloc(1);
      const { bytesRead: extraBytes } = await handle.read(sentinel, 0, 1, size);
      options.signal?.throwIfAborted();
      const statsAfterHash = await handle.stat();
      options.signal?.throwIfAborted();
      const actualDigest = hash.digest();
      const expectedDigest = Buffer.from(options.expectedSha256, 'hex');
      if (
        extraBytes !== 0 ||
        statsAfterHash.size !== size ||
        !timingSafeEqual(actualDigest, expectedDigest)
      ) {
        throw unavailable();
      }

      await handle.close();
      options.signal?.throwIfAborted();
      if (size === 0) {
        await removeTemporarySnapshot(snapshot);
        return { stream: Readable.from([]), size, prefix };
      }

      const verifiedStream = snapshot.handle.createReadStream({
        autoClose: true,
        start: 0,
        end: size - 1,
        ...(options.signal ? { signal: options.signal } : {}),
      });
      const snapshotDirectory = snapshot.directory;
      verifiedStream.once('close', () => {
        void rm(snapshotDirectory, { recursive: true, force: true }).catch(
          () => undefined,
        );
      });
      return {
        stream: verifiedStream,
        size,
        prefix,
      };
    } catch (error) {
      await handle.close().catch(() => undefined);
      if (snapshot) await removeTemporarySnapshot(snapshot);
      throw error;
    }
  }

  private async openRegularFile(
    storageKey: string,
    maxBytes: number,
    signal?: AbortSignal,
  ): Promise<OpenedStoredFile> {
    validateLimit(maxBytes, 'maxBytes');
    const segments = validateStorageKey(storageKey);

    try {
      signal?.throwIfAborted();
      const canonicalRoot = await realpath(this.configuredRoot);
      signal?.throwIfAborted();
      const target = resolve(canonicalRoot, ...segments);
      if (!isContained(canonicalRoot, target)) throw unavailable();

      let current = canonicalRoot;
      for (const segment of segments) {
        current = resolve(current, segment);
        if ((await lstat(current)).isSymbolicLink()) throw unavailable();
        signal?.throwIfAborted();
      }

      const canonicalTarget = await realpath(target);
      signal?.throwIfAborted();
      if (!isContained(canonicalRoot, canonicalTarget)) throw unavailable();

      const noFollow = constants.O_NOFOLLOW ?? 0;
      const handle = await open(canonicalTarget, constants.O_RDONLY | noFollow);
      try {
        signal?.throwIfAborted();
        const [handleStats, pathStats, canonicalTargetAfterOpen] = await Promise.all([
          handle.stat(),
          lstat(canonicalTarget),
          realpath(target),
        ]);
        signal?.throwIfAborted();
        if (
          !handleStats.isFile() ||
          pathStats.isSymbolicLink() ||
          canonicalTargetAfterOpen !== canonicalTarget ||
          handleStats.dev !== pathStats.dev ||
          handleStats.ino !== pathStats.ino
        ) {
          throw unavailable();
        }
        if (handleStats.size > maxBytes) {
          throw new FileStorageError(
            'FILE_TOO_LARGE',
            'Stored file exceeds the configured size limit',
          );
        }
        return { handle, size: handleStats.size };
      } catch (error) {
        await handle.close();
        throw error;
      }
    } catch (error) {
      if (signal?.aborted) signal.throwIfAborted();
      if (error instanceof FileStorageError) throw error;
      throw unavailable();
    }
  }
}

export { FileStorageError } from './file-storage.js';
