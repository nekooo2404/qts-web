import type { Readable } from 'node:stream';

export type FileStorageErrorCode =
  | 'INVALID_STORAGE_KEY'
  | 'FILE_NOT_AVAILABLE'
  | 'FILE_TOO_LARGE';

export class FileStorageError extends Error {
  constructor(
    public readonly code: FileStorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FileStorageError';
  }
}

export interface StoredFileStream {
  stream: Readable;
  size: number;
  prefix: Buffer;
}

export interface OpenStoredFileOptions {
  maxBytes: number;
  prefixBytes: number;
  signal?: AbortSignal;
}

export interface OpenVerifiedStoredFileOptions extends OpenStoredFileOptions {
  expectedSize: number;
  expectedSha256: string;
}

export interface FileStorage {
  readBuffer(storageKey: string, maxBytes: number): Promise<Buffer>;
  openReadStream(
    storageKey: string,
    options: OpenStoredFileOptions,
  ): Promise<StoredFileStream>;
  openVerifiedReadStream(
    storageKey: string,
    options: OpenVerifiedStoredFileOptions,
  ): Promise<StoredFileStream>;
}
