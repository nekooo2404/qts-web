import { pipeline } from 'node:stream/promises';

import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import { ApiError } from '../../common/api-error.js';
import type { ArchiveDownloadAdmissionController } from './archive-download-admission.js';
import type { ArchiveRepository } from './archive.repository.js';
import {
  attachmentContentDisposition,
  sanitizeDownloadFilename,
} from './content-disposition.js';
import { FileStorageError, type FileStorage } from './file-storage.js';

const archiveIdSchema = z.string().uuid();

export interface FileAccessActor {
  id: string;
}

export type FileAccessActorResolver = (
  request: Request,
  response: Response,
) => FileAccessActor;

export interface ArchiveDownloadControllerDependencies {
  repository: ArchiveRepository;
  storage: FileStorage;
  resolveActor: FileAccessActorResolver;
  maxArchiveBytes: number;
  admissionController: ArchiveDownloadAdmissionController;
  retryAfterSeconds: number;
}

type ArchiveKind = 'zip' | 'rar';

function archiveKind(filename: string): ArchiveKind | null {
  const normalized = filename.toLowerCase();
  if (normalized.endsWith('.zip')) return 'zip';
  if (normalized.endsWith('.rar')) return 'rar';
  return null;
}

function hasArchiveSignature(kind: ArchiveKind, prefix: Buffer): boolean {
  if (kind === 'zip') {
    return (
      prefix.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
      prefix.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
      prefix.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
    );
  }

  return (
    prefix
      .subarray(0, 7)
      .equals(Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00])) ||
    prefix
      .subarray(0, 8)
      .equals(
        Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]),
      )
  );
}

function archiveNotAvailable(): ApiError {
  return new ApiError(
    404,
    'ARCHIVE_NOT_AVAILABLE',
    'Archive was not found or is not available to this user',
  );
}

function mapStorageError(error: FileStorageError): ApiError {
  return error.code === 'FILE_TOO_LARGE'
    ? new ApiError(
        413,
        'ARCHIVE_TOO_LARGE',
        'Archive exceeds the download size limit',
      )
    : archiveNotAvailable();
}

function archiveDownloadBusy(response: Response, retryAfterSeconds: number): ApiError {
  response.setHeader('Retry-After', String(retryAfterSeconds));
  return new ApiError(
    503,
    'ARCHIVE_DOWNLOAD_BUSY',
    'Archive download capacity is temporarily exhausted',
  );
}

export function downloadArchiveController(
  dependencies: ArchiveDownloadControllerDependencies,
): RequestHandler {
  if (
    !Number.isSafeInteger(dependencies.maxArchiveBytes) ||
    dependencies.maxArchiveBytes <= 0
  ) {
    throw new TypeError('maxArchiveBytes must be a positive safe integer');
  }
  if (
    !Number.isSafeInteger(dependencies.retryAfterSeconds) ||
    dependencies.retryAfterSeconds <= 0
  ) {
    throw new TypeError('retryAfterSeconds must be a positive safe integer');
  }

  return async (request, response, next) => {
    const requestAbort = new AbortController();
    const abortForDisconnect = () => {
      if (!requestAbort.signal.aborted) {
        requestAbort.abort(new Error('Archive download client disconnected'));
      }
    };
    const abortForPrematureClose = () => {
      if (!response.writableFinished) abortForDisconnect();
    };
    request.once('aborted', abortForDisconnect);
    response.once('close', abortForPrematureClose);

    let releaseAdmission: (() => void) | undefined;
    try {
      const archiveId = archiveIdSchema.parse(request.params.id);
      const actor = dependencies.resolveActor(request, response);
      const archive = await dependencies.repository.findAccessibleById(
        actor.id,
        archiveId,
      );
      if (!archive) throw archiveNotAvailable();

      const kind = archiveKind(archive.originalFilename);
      if (!kind) throw archiveNotAvailable();
      if (!Number.isSafeInteger(archive.sizeBytes) || archive.sizeBytes <= 0) {
        throw archiveNotAvailable();
      }
      if (archive.sizeBytes > dependencies.maxArchiveBytes) {
        throw new ApiError(
          413,
          'ARCHIVE_TOO_LARGE',
          'Archive exceeds the download size limit',
        );
      }
      const lease = dependencies.admissionController.tryAcquire(
        archive.sizeBytes,
      );
      if (!lease) {
        throw archiveDownloadBusy(response, dependencies.retryAfterSeconds);
      }
      releaseAdmission = () => lease.release();

      let opened;
      try {
        opened = await dependencies.storage.openVerifiedReadStream(
          archive.storageKey,
          {
            maxBytes: dependencies.maxArchiveBytes,
            prefixBytes: 8,
            expectedSize: archive.sizeBytes,
            expectedSha256: archive.sha256,
            signal: requestAbort.signal,
          },
        );
      } catch (error) {
        if (error instanceof FileStorageError) throw mapStorageError(error);
        throw error;
      }

      if (!hasArchiveSignature(kind, opened.prefix)) {
        opened.stream.destroy();
        throw archiveNotAvailable();
      }
      if (opened.size !== archive.sizeBytes) {
        opened.stream.destroy();
        throw archiveNotAvailable();
      }

      const extension = kind === 'zip' ? '.zip' : '.rar';
      const filename = sanitizeDownloadFilename(
        archive.originalFilename,
        `archive${extension}`,
        extension,
      );
      response.status(200);
      response.setHeader(
        'Content-Type',
        kind === 'zip' ? 'application/zip' : 'application/vnd.rar',
      );
      response.setHeader('Content-Length', String(opened.size));
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader(
        'Content-Disposition',
        attachmentContentDisposition(filename),
      );

      try {
        await pipeline(opened.stream, response);
      } catch (error) {
        response.destroy(error instanceof Error ? error : undefined);
      }
    } catch (error) {
      if (requestAbort.signal.aborted) return;
      next(error);
    } finally {
      request.off('aborted', abortForDisconnect);
      response.off('close', abortForPrematureClose);
      releaseAdmission?.();
    }
  };
}
