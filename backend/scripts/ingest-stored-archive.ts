import 'dotenv/config';

import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  open,
  realpath,
  unlink,
} from 'node:fs/promises';
import {
  extname,
  isAbsolute,
  parse,
  relative,
  resolve,
  sep,
} from 'node:path';
import { pathToFileURL } from 'node:url';

import { Client } from 'pg';
import { z } from 'zod';

const ZIP_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];
const RAR4_SIGNATURE = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
const RAR5_SIGNATURE = Buffer.from([
  0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00,
]);
const MAX_SCANNER_ARGUMENTS = 32;
const MAX_SCANNER_ARGUMENT_LENGTH = 512;
const ARCHIVE_DIRECTORY_NAME = 'stored-archives';
const ACCESS_MANAGEMENT_LOCK = 'SELECT pg_advisory_xact_lock(1903241087, 1145528769)';

type ArchiveExtension = 'rar' | 'zip';
type OwnerContextType = 'CONTRACT' | 'OWNER' | 'TASK';
type ScanResult = 'CLEAN' | 'INFECTED';

const booleanStringSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

const originalFilenameSchema = z
  .string()
  .trim()
  .min(5)
  .max(255)
  .refine((value) => !value.includes('/') && !value.includes('\\'), {
    message: 'Original filename must not contain path separators',
  })
  .refine((value) => !containsControlCharacter(value), {
    message: 'Original filename must not contain control characters',
  })
  .refine((value) => !/[. ]$/u.test(value), {
    message: 'Original filename must not end with a dot or space',
  })
  .refine((value) => /\.(?:rar|zip)$/iu.test(value), {
    message: 'Original filename must use the .zip or .rar extension',
  });

const scannerArgumentsSchema = z
  .string()
  .default('[]')
  .transform((value, context): unknown => {
    try {
      return JSON.parse(value);
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Scanner arguments must be a JSON array',
      });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z
          .string()
          .max(MAX_SCANNER_ARGUMENT_LENGTH)
          .refine((value) => !value.includes('\0'), {
            message: 'Scanner arguments must not contain NUL bytes',
          }),
      )
      .max(MAX_SCANNER_ARGUMENTS),
  );

const rawInputSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: booleanStringSchema.default(false),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(30000),
    INTERNAL_FILE_STORAGE_ROOT: z.string().trim().min(1),
    MAX_ARCHIVE_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(10_737_418_240)
      .default(1_073_741_824),
    ARCHIVE_SCANNER_EXECUTABLE: z
      .string()
      .trim()
      .min(1)
      .refine(isAbsolute, 'Scanner executable must be an absolute path'),
    ARCHIVE_SCANNER_ARGS_JSON: scannerArgumentsSchema,
    ARCHIVE_SCANNER_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(3_600_000)
      .default(120_000),
    ARCHIVE_SCANNER_MAX_OUTPUT_BYTES: z.coerce
      .number()
      .int()
      .min(1_024)
      .max(1_048_576)
      .default(65_536),
    ARCHIVE_INGEST_SOURCE_PATH: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !containsControlCharacter(value), {
        message: 'Source path must not contain control characters',
      })
      .refine(isAbsolute, 'Source path must be absolute'),
    ARCHIVE_INGEST_ORIGINAL_FILENAME: originalFilenameSchema,
    ARCHIVE_INGEST_ACTOR_ID: z.string().uuid(),
    ARCHIVE_INGEST_OWNER_ID: z.string().uuid().optional(),
    ARCHIVE_INGEST_CONTRACT_ID: z.string().uuid().optional(),
    ARCHIVE_INGEST_TASK_ID: z.string().uuid().optional(),
  })
  .superRefine((input, context) => {
    const ownerContextCount = [
      input.ARCHIVE_INGEST_OWNER_ID,
      input.ARCHIVE_INGEST_CONTRACT_ID,
      input.ARCHIVE_INGEST_TASK_ID,
    ].filter((value) => value !== undefined).length;
    if (ownerContextCount !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'Exactly one owner, contract, or task context is required',
      });
    }

    const sourceExtension = extname(input.ARCHIVE_INGEST_SOURCE_PATH).toLowerCase();
    const filenameExtension = extname(
      input.ARCHIVE_INGEST_ORIGINAL_FILENAME,
    ).toLowerCase();
    if (
      !['.zip', '.rar'].includes(sourceExtension) ||
      sourceExtension !== filenameExtension
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Source and original filename extensions must match',
      });
    }
  });

const ingestionInputSchema = z
  .object({
    actorId: z.string().uuid(),
    contractId: z.string().uuid().optional(),
    maxArchiveBytes: z.number().int().min(1).max(10_737_418_240),
    originalFilename: originalFilenameSchema,
    ownerId: z.string().uuid().optional(),
    scanner: z.object({
      arguments: z.array(z.string().max(MAX_SCANNER_ARGUMENT_LENGTH)).max(
        MAX_SCANNER_ARGUMENTS,
      ),
      executable: z.string().trim().min(1).refine(isAbsolute),
      maxOutputBytes: z.number().int().min(1_024).max(1_048_576),
      timeoutMs: z.number().int().min(100).max(3_600_000),
    }),
    sourcePath: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !containsControlCharacter(value))
      .refine(isAbsolute),
    storageRoot: z.string().trim().min(1),
    taskId: z.string().uuid().optional(),
  })
  .superRefine((input, context) => {
    const ownerContextCount = [input.ownerId, input.contractId, input.taskId].filter(
      (value) => value !== undefined,
    ).length;
    if (ownerContextCount !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'Exactly one owner context is required',
      });
    }

    const sourceExtension = extname(input.sourcePath).toLowerCase();
    if (sourceExtension !== extname(input.originalFilename).toLowerCase()) {
      context.addIssue({
        code: 'custom',
        message: 'Source and original filename extensions must match',
      });
    }
  });

const CLI_TO_ENVIRONMENT = {
  '--source': 'ARCHIVE_INGEST_SOURCE_PATH',
  '--original-filename': 'ARCHIVE_INGEST_ORIGINAL_FILENAME',
  '--actor-id': 'ARCHIVE_INGEST_ACTOR_ID',
  '--owner-id': 'ARCHIVE_INGEST_OWNER_ID',
  '--contract-id': 'ARCHIVE_INGEST_CONTRACT_ID',
  '--task-id': 'ARCHIVE_INGEST_TASK_ID',
} as const;

type CliFlag = keyof typeof CLI_TO_ENVIRONMENT;
type ArchiveEnvironmentKey = (typeof CLI_TO_ENVIRONMENT)[CliFlag];

export interface ArchiveScannerConfig {
  arguments: string[];
  executable: string;
  maxOutputBytes: number;
  timeoutMs: number;
}

export interface IngestStoredArchiveInput {
  actorId: string;
  contractId?: string | undefined;
  maxArchiveBytes: number;
  originalFilename: string;
  ownerId?: string | undefined;
  scanner: ArchiveScannerConfig;
  sourcePath: string;
  storageRoot: string;
  taskId?: string | undefined;
}

export interface IngestStoredArchiveCommand {
  archive: IngestStoredArchiveInput;
  database: {
    connectionString: string;
    connectionTimeoutMs: number;
    ssl: boolean;
    statementTimeoutMs: number;
  };
}

export interface IngestedStoredArchive {
  id: string;
  sha256: string;
  sizeBytes: number;
  storageKey: string;
}

export interface ArchiveIngestionDependencies {
  createId?: (() => string) | undefined;
  scan?:
    | ((absoluteArchivePath: string, config: ArchiveScannerConfig) => Promise<ScanResult>)
    | undefined;
}

export class ArchiveIngestionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ArchiveIngestionError';
  }
}

export class InfectedArchiveError extends ArchiveIngestionError {
  constructor() {
    super('Archive scanner reported infected content');
    this.name = 'InfectedArchiveError';
  }
}

type IngestionClient = Pick<Client, 'query'>;

interface CopiedArchive {
  absolutePath: string;
  device: number;
  extension: ArchiveExtension;
  inode: number;
  mediaType: string;
  sha256: string;
  sizeBytes: number;
  storageKey: string;
}

function parseCliArguments(
  argv: readonly string[],
): Partial<Record<ArchiveEnvironmentKey, string>> {
  const values: Partial<Record<ArchiveEnvironmentKey, string>> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined || !argument.startsWith('--')) {
      throw new Error('Only named archive ingestion options are supported');
    }
    const separatorIndex = argument.indexOf('=');
    const flag = (separatorIndex === -1
      ? argument
      : argument.slice(0, separatorIndex)) as CliFlag;
    const environmentKey = CLI_TO_ENVIRONMENT[flag];
    if (!environmentKey) throw new Error(`Unknown option: ${flag}`);
    if (values[environmentKey] !== undefined) {
      throw new Error(`Option may only be provided once: ${flag}`);
    }

    const inlineValue =
      separatorIndex === -1 ? undefined : argument.slice(separatorIndex + 1);
    const nextValue = argv[index + 1];
    const value = inlineValue ?? nextValue;
    if (
      value === undefined ||
      (inlineValue === undefined && value.startsWith('--'))
    ) {
      throw new Error(`Option requires a value: ${flag}`);
    }
    values[environmentKey] = value;
    if (inlineValue === undefined) index += 1;
  }
  return values;
}

export function loadIngestStoredArchiveCommand(
  environment: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv.slice(2),
): IngestStoredArchiveCommand {
  const cliValues = parseCliArguments(argv);
  const parsed = rawInputSchema.parse({
    ...environment,
    ...cliValues,
  });

  return {
    archive: {
      actorId: parsed.ARCHIVE_INGEST_ACTOR_ID,
      ...(parsed.ARCHIVE_INGEST_CONTRACT_ID === undefined
        ? {}
        : { contractId: parsed.ARCHIVE_INGEST_CONTRACT_ID }),
      maxArchiveBytes: parsed.MAX_ARCHIVE_BYTES,
      originalFilename: parsed.ARCHIVE_INGEST_ORIGINAL_FILENAME,
      ...(parsed.ARCHIVE_INGEST_OWNER_ID === undefined
        ? {}
        : { ownerId: parsed.ARCHIVE_INGEST_OWNER_ID }),
      scanner: {
        arguments: parsed.ARCHIVE_SCANNER_ARGS_JSON,
        executable: parsed.ARCHIVE_SCANNER_EXECUTABLE,
        maxOutputBytes: parsed.ARCHIVE_SCANNER_MAX_OUTPUT_BYTES,
        timeoutMs: parsed.ARCHIVE_SCANNER_TIMEOUT_MS,
      },
      sourcePath: parsed.ARCHIVE_INGEST_SOURCE_PATH,
      storageRoot: parsed.INTERNAL_FILE_STORAGE_ROOT,
      ...(parsed.ARCHIVE_INGEST_TASK_ID === undefined
        ? {}
        : { taskId: parsed.ARCHIVE_INGEST_TASK_ID }),
    },
    database: {
      connectionString: parsed.DATABASE_URL,
      connectionTimeoutMs: parsed.DB_CONNECTION_TIMEOUT_MS,
      ssl: parsed.DATABASE_SSL,
      statementTimeoutMs: parsed.DB_STATEMENT_TIMEOUT_MS,
    },
  };
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

function comparablePath(value: string): string {
  const absolutePath = resolve(value);
  if (process.platform !== 'win32') return absolutePath;
  return absolutePath.replace(/^\\\\\?\\/u, '').toLowerCase();
}

async function assertNoSymlinkComponents(targetPath: string): Promise<void> {
  const absolutePath = resolve(targetPath);
  const parsedPath = parse(absolutePath);
  const pathParts = absolutePath.slice(parsedPath.root.length).split(sep);
  let currentPath = parsedPath.root;
  for (const part of pathParts) {
    if (part.length === 0) continue;
    currentPath = resolve(currentPath, part);
    if ((await lstat(currentPath)).isSymbolicLink()) {
      throw new ArchiveIngestionError(
        'Symbolic links are not allowed in archive paths',
      );
    }
  }
}

async function prepareArchiveDirectory(storageRoot: string): Promise<string> {
  try {
    const configuredRoot = resolve(storageRoot);
    await assertNoSymlinkComponents(configuredRoot);
    const rootStats = await lstat(configuredRoot);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
      throw new ArchiveIngestionError(
        'Internal file storage root must be an existing regular directory',
      );
    }

    const canonicalRoot = await realpath(configuredRoot);
    const archiveDirectory = resolve(canonicalRoot, ARCHIVE_DIRECTORY_NAME);
    if (!isContained(canonicalRoot, archiveDirectory)) {
      throw new ArchiveIngestionError('Archive storage directory is invalid');
    }
    await mkdir(archiveDirectory, { mode: 0o700, recursive: true });
    const [directoryStats, canonicalDirectory] = await Promise.all([
      lstat(archiveDirectory),
      realpath(archiveDirectory),
    ]);
    if (
      !directoryStats.isDirectory() ||
      directoryStats.isSymbolicLink() ||
      comparablePath(canonicalDirectory) !== comparablePath(archiveDirectory)
    ) {
      throw new ArchiveIngestionError('Archive storage directory is unavailable');
    }
    await chmod(archiveDirectory, 0o700);
    return archiveDirectory;
  } catch (error) {
    if (error instanceof ArchiveIngestionError) throw error;
    throw new ArchiveIngestionError('Archive storage directory is unavailable', {
      cause: error,
    });
  }
}

function archiveDetails(filename: string): {
  extension: ArchiveExtension;
  mediaType: string;
} {
  const extension = extname(filename).slice(1).toLowerCase();
  if (extension === 'zip') {
    return { extension, mediaType: 'application/zip' };
  }
  if (extension === 'rar') {
    return { extension, mediaType: 'application/vnd.rar' };
  }
  throw new ArchiveIngestionError('Only ZIP and RAR archives are supported');
}

function hasPrefix(value: Buffer, prefix: Buffer): boolean {
  return value.length >= prefix.length && value.subarray(0, prefix.length).equals(prefix);
}

function assertArchiveMagic(prefix: Buffer, extension: ArchiveExtension): void {
  const valid =
    extension === 'zip'
      ? ZIP_SIGNATURES.some((signature) => hasPrefix(prefix, signature))
      : hasPrefix(prefix, RAR4_SIGNATURE) || hasPrefix(prefix, RAR5_SIGNATURE);
  if (!valid) {
    throw new ArchiveIngestionError(
      `Source content does not match the .${extension} archive format`,
    );
  }
}

async function removeCopiedArchive(copy: CopiedArchive): Promise<void> {
  const stats = await lstat(copy.absolutePath).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  });
  if (stats === null) return;
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.dev !== copy.device ||
    stats.ino !== copy.inode
  ) {
    throw new ArchiveIngestionError(
      'Refusing to remove a replaced stored archive file',
    );
  }
  await unlink(copy.absolutePath);
}

async function assertCopiedArchiveStable(copy: CopiedArchive): Promise<void> {
  const noFollow = constants.O_NOFOLLOW ?? 0;
  const handle = await open(copy.absolutePath, constants.O_RDONLY | noFollow);
  try {
    const [handleStats, pathStats] = await Promise.all([
      handle.stat(),
      lstat(copy.absolutePath),
    ]);
    if (
      !handleStats.isFile() ||
      pathStats.isSymbolicLink() ||
      handleStats.dev !== copy.device ||
      handleStats.ino !== copy.inode ||
      pathStats.dev !== copy.device ||
      pathStats.ino !== copy.inode ||
      handleStats.size !== copy.sizeBytes
    ) {
      throw new ArchiveIngestionError(
        'Stored archive changed during malware scanning',
      );
    }

    const hash = createHash('sha256');
    const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, copy.sizeBytes));
    let offset = 0;
    while (offset < copy.sizeBytes) {
      const requestedBytes = Math.min(chunk.length, copy.sizeBytes - offset);
      const { bytesRead } = await handle.read(
        chunk,
        0,
        requestedBytes,
        offset,
      );
      if (bytesRead === 0) {
        throw new ArchiveIngestionError(
          'Stored archive changed during malware scanning',
        );
      }
      hash.update(chunk.subarray(0, bytesRead));
      offset += bytesRead;
    }
    const sentinel = Buffer.alloc(1);
    const { bytesRead: extraBytes } = await handle.read(
      sentinel,
      0,
      1,
      copy.sizeBytes,
    );
    const finalStats = await handle.stat();
    if (
      extraBytes !== 0 ||
      finalStats.size !== copy.sizeBytes ||
      finalStats.dev !== copy.device ||
      finalStats.ino !== copy.inode ||
      hash.digest('hex') !== copy.sha256
    ) {
      throw new ArchiveIngestionError(
        'Stored archive changed during malware scanning',
      );
    }
  } catch (error) {
    if (error instanceof ArchiveIngestionError) throw error;
    throw new ArchiveIngestionError(
      'Stored archive changed during malware scanning',
      { cause: error },
    );
  } finally {
    await handle.close().catch(() => undefined);
  }
}

async function copySourceArchive(
  input: IngestStoredArchiveInput,
  archiveId: string,
): Promise<CopiedArchive> {
  const sourcePath = resolve(input.sourcePath);
  const { extension, mediaType } = archiveDetails(input.originalFilename);
  let destinationHandle: Awaited<ReturnType<typeof open>> | undefined;
  let sourceHandle: Awaited<ReturnType<typeof open>> | undefined;
  let copyForCleanup: CopiedArchive | undefined;

  try {
    await assertNoSymlinkComponents(sourcePath);
    const noFollow = constants.O_NOFOLLOW ?? 0;
    sourceHandle = await open(sourcePath, constants.O_RDONLY | noFollow);
    const [initialStats, sourcePathStats, canonicalSource] = await Promise.all([
      sourceHandle.stat(),
      lstat(sourcePath),
      realpath(sourcePath),
    ]);
    if (
      !initialStats.isFile() ||
      sourcePathStats.isSymbolicLink() ||
      comparablePath(canonicalSource) !== comparablePath(sourcePath) ||
      initialStats.dev !== sourcePathStats.dev ||
      initialStats.ino !== sourcePathStats.ino
    ) {
      throw new ArchiveIngestionError(
        'Source archive must be a regular non-symbolic-link file',
      );
    }
    if (
      !Number.isSafeInteger(initialStats.size) ||
      initialStats.size < 1 ||
      initialStats.size > input.maxArchiveBytes
    ) {
      throw new ArchiveIngestionError(
        'Source archive exceeds the configured size limit',
      );
    }

    const archiveDirectory = await prepareArchiveDirectory(input.storageRoot);
    const storageKey = `${ARCHIVE_DIRECTORY_NAME}/${archiveId}.${extension}`;
    const destinationPath = resolve(archiveDirectory, `${archiveId}.${extension}`);
    destinationHandle = await open(
      destinationPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | noFollow,
      0o600,
    );
    const destinationInitialStats = await destinationHandle.stat();
    copyForCleanup = {
      absolutePath: destinationPath,
      device: destinationInitialStats.dev,
      extension,
      inode: destinationInitialStats.ino,
      mediaType,
      sha256: '',
      sizeBytes: initialStats.size,
      storageKey,
    };

    const hash = createHash('sha256');
    const prefix = Buffer.alloc(Math.min(8, initialStats.size));
    const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, initialStats.size));
    let offset = 0;
    while (offset < initialStats.size) {
      const requestedBytes = Math.min(chunk.length, initialStats.size - offset);
      const { bytesRead } = await sourceHandle.read(
        chunk,
        0,
        requestedBytes,
        offset,
      );
      if (bytesRead === 0) {
        throw new ArchiveIngestionError('Source archive changed while copying');
      }
      const bytes = chunk.subarray(0, bytesRead);
      hash.update(bytes);
      if (offset < prefix.length) {
        bytes.copy(prefix, offset, 0, Math.min(bytes.length, prefix.length - offset));
      }

      let written = 0;
      while (written < bytes.length) {
        const result = await destinationHandle.write(
          bytes,
          written,
          bytes.length - written,
          offset + written,
        );
        if (result.bytesWritten === 0) {
          throw new ArchiveIngestionError('Could not copy the source archive');
        }
        written += result.bytesWritten;
      }
      offset += bytesRead;
    }

    const sentinel = Buffer.alloc(1);
    const [{ bytesRead: extraBytes }, finalSourceStats, finalSourcePathStats] =
      await Promise.all([
        sourceHandle.read(sentinel, 0, 1, initialStats.size),
        sourceHandle.stat(),
        lstat(sourcePath),
      ]);
    if (
      extraBytes !== 0 ||
      finalSourceStats.size !== initialStats.size ||
      finalSourceStats.dev !== initialStats.dev ||
      finalSourceStats.ino !== initialStats.ino ||
      finalSourceStats.mtimeMs !== initialStats.mtimeMs ||
      finalSourceStats.ctimeMs !== initialStats.ctimeMs ||
      finalSourcePathStats.dev !== initialStats.dev ||
      finalSourcePathStats.ino !== initialStats.ino
    ) {
      throw new ArchiveIngestionError('Source archive changed while copying');
    }
    assertArchiveMagic(prefix, extension);

    await destinationHandle.sync();
    await destinationHandle.chmod(0o600);
    await destinationHandle.close();
    destinationHandle = undefined;
    await sourceHandle.close();
    sourceHandle = undefined;

    const destinationStats = await lstat(destinationPath);
    if (
      !destinationStats.isFile() ||
      destinationStats.isSymbolicLink() ||
      destinationStats.dev !== copyForCleanup.device ||
      destinationStats.ino !== copyForCleanup.inode ||
      destinationStats.size !== initialStats.size
    ) {
      throw new ArchiveIngestionError('Stored archive changed while copying');
    }

    return {
      ...copyForCleanup,
      sha256: hash.digest('hex'),
    };
  } catch (error) {
    await destinationHandle?.close().catch(() => undefined);
    await sourceHandle?.close().catch(() => undefined);
    if (copyForCleanup !== undefined) {
      await removeCopiedArchive(copyForCleanup).catch(() => undefined);
    }
    if (error instanceof ArchiveIngestionError) throw error;
    throw new ArchiveIngestionError('Source archive could not be copied safely', {
      cause: error,
    });
  }
}

async function resolveScannerExecutable(executable: string): Promise<string> {
  try {
    await assertNoSymlinkComponents(executable);
    const canonicalExecutable = await realpath(executable);
    const [configuredStats, canonicalStats] = await Promise.all([
      lstat(executable),
      lstat(canonicalExecutable),
    ]);
    if (
      !configuredStats.isFile() ||
      configuredStats.isSymbolicLink() ||
      !canonicalStats.isFile() ||
      comparablePath(canonicalExecutable) !== comparablePath(executable)
    ) {
      throw new ArchiveIngestionError(
        'Archive scanner executable is unavailable',
      );
    }
    return canonicalExecutable;
  } catch (error) {
    if (error instanceof ArchiveIngestionError) throw error;
    throw new ArchiveIngestionError('Archive scanner executable is unavailable', {
      cause: error,
    });
  }
}

export async function runArchiveScanner(
  absoluteArchivePath: string,
  config: ArchiveScannerConfig,
): Promise<ScanResult> {
  const executable = await resolveScannerExecutable(config.executable);
  return await new Promise<ScanResult>((resolvePromise, rejectPromise) => {
    const child = spawn(executable, [...config.arguments, absoluteArchivePath], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let outputBytes = 0;
    let outputLimitExceeded = false;
    let timedOut = false;
    let spawnError: Error | undefined;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, config.timeoutMs);
    timer.unref();

    const countOutput = (chunk: Buffer | string): void => {
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > config.maxOutputBytes && !outputLimitExceeded) {
        outputLimitExceeded = true;
        child.kill('SIGKILL');
      }
    };
    child.stdout.on('data', countOutput);
    child.stderr.on('data', countOutput);
    child.once('error', (error) => {
      spawnError = error;
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (spawnError !== undefined) {
        rejectPromise(
          new ArchiveIngestionError('Archive scanner could not be started', {
            cause: spawnError,
          }),
        );
        return;
      }
      if (timedOut) {
        rejectPromise(new ArchiveIngestionError('Archive scanner timed out'));
        return;
      }
      if (outputLimitExceeded) {
        rejectPromise(
          new ArchiveIngestionError('Archive scanner output exceeded its limit'),
        );
        return;
      }
      if (code === 0) {
        resolvePromise('CLEAN');
        return;
      }
      if (code === 1) {
        resolvePromise('INFECTED');
        return;
      }
      rejectPromise(new ArchiveIngestionError('Archive scanner failed'));
    });
  });
}

function ownerContext(input: IngestStoredArchiveInput): {
  id: string;
  type: OwnerContextType;
} {
  if (input.ownerId !== undefined) return { id: input.ownerId, type: 'OWNER' };
  if (input.contractId !== undefined) {
    return { id: input.contractId, type: 'CONTRACT' };
  }
  if (input.taskId !== undefined) return { id: input.taskId, type: 'TASK' };
  throw new ArchiveIngestionError('Exactly one owner context is required');
}

async function assertActorAuthorized(
  client: IngestionClient,
  actorId: string,
): Promise<void> {
  const result = await client.query<{ id: string }>(
    `SELECT user_account.id
     FROM public.users AS user_account
     WHERE user_account.id = $1
       AND user_account.status = 'ACTIVE'
       AND EXISTS (
         SELECT 1
         FROM public.user_roles AS user_role
         INNER JOIN public.role_permissions AS role_permission
           ON role_permission.role_id = user_role.role_id
         INNER JOIN public.permissions AS permission
           ON permission.id = role_permission.permission_id
         WHERE user_role.user_id = user_account.id
           AND permission.code = 'manage:file'
       )
     FOR SHARE OF user_account`,
    [actorId],
  );
  if (!result.rows[0]) {
    throw new ArchiveIngestionError(
      'Actor must be active and have manage:file permission',
    );
  }
}

async function assertOwnerContextExists(
  client: IngestionClient,
  context: { id: string; type: OwnerContextType },
): Promise<void> {
  const table =
    context.type === 'OWNER'
      ? 'users'
      : context.type === 'CONTRACT'
        ? 'contracts'
        : 'tasks';
  const result = await client.query<{ id: string }>(
    `SELECT context.id
     FROM public.${table} AS context
     WHERE context.id = $1
     FOR SHARE OF context`,
    [context.id],
  );
  if (!result.rows[0]) {
    throw new ArchiveIngestionError('Archive owner context does not exist');
  }
}

export async function ingestStoredArchive(
  client: IngestionClient,
  input: IngestStoredArchiveInput,
  dependencies: ArchiveIngestionDependencies = {},
): Promise<IngestedStoredArchive> {
  const validatedInput = ingestionInputSchema.parse(input);
  const createId = dependencies.createId ?? randomUUID;
  const scan = dependencies.scan ?? runArchiveScanner;
  const archiveId = createId();
  z.string().uuid().parse(archiveId);

  let copiedArchive: CopiedArchive | undefined;
  let transactionStarted = false;
  let commitStarted = false;
  try {
    copiedArchive = await copySourceArchive(validatedInput, archiveId);
    const scanResult = await scan(copiedArchive.absolutePath, validatedInput.scanner);
    if (scanResult === 'INFECTED') throw new InfectedArchiveError();
    if (scanResult !== 'CLEAN') {
      throw new ArchiveIngestionError('Archive scanner returned an invalid result');
    }
    await assertCopiedArchiveStable(copiedArchive);

    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    transactionStarted = true;
    await client.query(ACCESS_MANAGEMENT_LOCK);
    await assertActorAuthorized(client, validatedInput.actorId);
    const context = ownerContext(validatedInput);
    await assertOwnerContextExists(client, context);

    await client.query(
      `INSERT INTO public.stored_files
       (id, storage_key, original_filename, extension, media_type, size_bytes,
        sha256, scan_status, scanned_at, owner_id, contract_id, task_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'CLEAN', CURRENT_TIMESTAMP,
               $8, $9, $10, $11)`,
      [
        archiveId,
        copiedArchive.storageKey,
        validatedInput.originalFilename,
        copiedArchive.extension,
        copiedArchive.mediaType,
        copiedArchive.sizeBytes,
        copiedArchive.sha256,
        validatedInput.ownerId ?? null,
        validatedInput.contractId ?? null,
        validatedInput.taskId ?? null,
        validatedInput.actorId,
      ],
    );
    await client.query(
      `INSERT INTO public.audit_logs
       (actor_user_id, action, resource_type, resource_id, outcome, changes,
        metadata)
       VALUES ($1, 'FILE.ARCHIVE_INGESTED', 'STORED_FILE', $2, 'SUCCESS',
               jsonb_build_object('scanStatus', 'CLEAN'),
               jsonb_build_object('ownerContext', $3::text,
                                  'extension', $4::text,
                                  'sizeBytes', $5::bigint))`,
      [
        validatedInput.actorId,
        archiveId,
        context.type,
        copiedArchive.extension,
        copiedArchive.sizeBytes,
      ],
    );

    commitStarted = true;
    await client.query('COMMIT');
    transactionStarted = false;
    return {
      id: archiveId,
      sha256: copiedArchive.sha256,
      sizeBytes: copiedArchive.sizeBytes,
      storageKey: copiedArchive.storageKey,
    };
  } catch (error) {
    if (commitStarted) {
      throw new ArchiveIngestionError(
        'Database commit result is indeterminate; the archive file was retained for reconciliation',
        { cause: error },
      );
    }
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    if (copiedArchive !== undefined) {
      try {
        await removeCopiedArchive(copiedArchive);
      } catch (cleanupError) {
        if (error instanceof Error) {
          Object.defineProperty(error, 'cleanupError', {
            configurable: true,
            enumerable: false,
            value: cleanupError,
          });
        }
      }
    }
    throw error;
  }
}

function printUsage(): void {
  console.info(
    'Usage: npm run archive:ingest -- ' +
      '--source <absolute-file.zip|rar> --original-filename <download-name> ' +
      '--actor-id <uuid> (--owner-id <uuid> | --contract-id <uuid> | ' +
      '--task-id <uuid>)',
  );
}

async function main(): Promise<void> {
  if (process.argv.slice(2).includes('--help')) {
    printUsage();
    return;
  }
  const command = loadIngestStoredArchiveCommand();
  const client = new Client({
    application_name: 'qts-archive-ingestion',
    connectionString: command.database.connectionString,
    connectionTimeoutMillis: command.database.connectionTimeoutMs,
    query_timeout: command.database.statementTimeoutMs,
    statement_timeout: command.database.statementTimeoutMs,
    ssl: command.database.ssl ? { rejectUnauthorized: true } : false,
  });

  await client.connect();
  try {
    const result = await ingestStoredArchive(client, command.archive);
    console.info(`Stored archive ingested: ${result.id}`);
  } finally {
    await client.end();
  }
}

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href === import.meta.url
) {
  main().catch((error: unknown) => {
    const message =
      error instanceof z.ZodError
        ? 'configuration or command options are invalid'
        : error instanceof ArchiveIngestionError
          ? error.message
          : 'operation failed; review scanner, database, and storage health';
    console.error(`Stored archive ingestion failed: ${message}`);
    process.exitCode = 1;
  });
}
