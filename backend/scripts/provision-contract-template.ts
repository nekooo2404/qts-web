import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  realpath,
  unlink,
} from 'node:fs/promises';
import { parse, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import Docxtemplater from 'docxtemplater';
import { Client } from 'pg';
import PizZip from 'pizzip';
import { z } from 'zod';

import { assertSafeDocxArchive } from '../src/modules/contracts/docx-archive-inspection.js';

const SAFE_FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_.-]{0,99}$/;
const FORBIDDEN_FIELD_NAMES = new Set(['__proto__', 'prototype', 'constructor']);
const DOCX_EXTENSION = /\.docx$/i;
function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

const booleanStringSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const fieldNameSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(SAFE_FIELD_NAME)
  .refine((field) => !FORBIDDEN_FIELD_NAMES.has(field), {
    message: 'Reserved contract field names are not allowed',
  });

const fieldListSchema = z
  .array(fieldNameSchema)
  .min(1)
  .max(200)
  .refine((fields) => new Set(fields).size === fields.length, {
    message: 'Contract template fields must be unique',
  });

const allowedFieldsSchema = z
  .string()
  .transform((value) => value.split(',').map((field) => field.trim()))
  .pipe(fieldListSchema);

const outputFilenameSchema = z
  .string()
  .trim()
  .min(6)
  .max(180)
  .refine((value) => DOCX_EXTENSION.test(value), {
    message: 'Output filename must use the .docx extension',
  })
  .refine(
    (value) =>
      !value.includes('/') &&
      !value.includes('\\') &&
      !containsControlCharacter(value) &&
      !/[. ]$/u.test(value),
    { message: 'Output filename contains unsafe characters' },
  );

const rawInputSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: booleanStringSchema.default(false),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(30000),
  INTERNAL_FILE_STORAGE_ROOT: z.string().trim().min(1),
  MAX_DOCX_TEMPLATE_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(104_857_600)
    .default(10_485_760),
  MAX_DOCX_UNCOMPRESSED_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(524_288_000)
    .default(52_428_800),
  MAX_DOCX_TEMPLATE_ENTRIES: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .default(2_048),
  CONTRACT_TEMPLATE_SOURCE_PATH: z
    .string()
    .trim()
    .min(1)
    .refine((value) => DOCX_EXTENSION.test(value), {
      message: 'Source path must point to a .docx file',
    }),
  CONTRACT_TEMPLATE_NAME: z.string().trim().min(2).max(200),
  CONTRACT_TEMPLATE_DESCRIPTION: z.string().trim().min(1).max(2000).optional(),
  CONTRACT_TEMPLATE_ALLOWED_FIELDS: allowedFieldsSchema,
  CONTRACT_TEMPLATE_OUTPUT_FILENAME: outputFilenameSchema,
  CONTRACT_TEMPLATE_ACTOR_ID: z.string().uuid(),
});

const provisionInputSchema = z.object({
  actorId: z.string().uuid(),
  allowedFields: fieldListSchema,
  description: z.string().trim().min(1).max(2000).optional(),
  limits: z.object({
    maxEntries: z.number().int().min(1).max(10_000),
    maxTemplateBytes: z.number().int().min(1).max(104_857_600),
    maxUncompressedBytes: z.number().int().min(1).max(524_288_000),
  }),
  name: z.string().trim().min(2).max(200),
  outputFilename: outputFilenameSchema,
  sourcePath: z
    .string()
    .trim()
    .min(1)
    .refine((value) => DOCX_EXTENSION.test(value)),
  storageRoot: z.string().trim().min(1),
});

const CLI_TO_ENVIRONMENT = {
  '--source': 'CONTRACT_TEMPLATE_SOURCE_PATH',
  '--name': 'CONTRACT_TEMPLATE_NAME',
  '--description': 'CONTRACT_TEMPLATE_DESCRIPTION',
  '--allowed-fields': 'CONTRACT_TEMPLATE_ALLOWED_FIELDS',
  '--output-filename': 'CONTRACT_TEMPLATE_OUTPUT_FILENAME',
  '--actor-id': 'CONTRACT_TEMPLATE_ACTOR_ID',
} as const;

type CliFlag = keyof typeof CLI_TO_ENVIRONMENT;
type TemplateEnvironmentKey = (typeof CLI_TO_ENVIRONMENT)[CliFlag];

export interface ProvisionContractTemplateInput {
  actorId: string;
  allowedFields: string[];
  description?: string | undefined;
  limits: {
    maxEntries: number;
    maxTemplateBytes: number;
    maxUncompressedBytes: number;
  };
  name: string;
  outputFilename: string;
  sourcePath: string;
  storageRoot: string;
}

export interface ProvisionContractTemplateCommand {
  database: {
    connectionString: string;
    connectionTimeoutMs: number;
    ssl: boolean;
    statementTimeoutMs: number;
  };
  template: ProvisionContractTemplateInput;
}

export interface ProvisionedContractTemplate {
  id: string;
  storageKey: string;
}

export class ContractTemplateProvisioningError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ContractTemplateProvisioningError';
  }
}

type ProvisioningClient = Pick<Client, 'query'>;

interface CopiedTemplate {
  absolutePath: string;
  device: number;
  inode: number;
  storageKey: string;
}

function parseCliArguments(
  argv: readonly string[],
): Partial<Record<TemplateEnvironmentKey, string>> {
  const values: Partial<Record<TemplateEnvironmentKey, string>> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined || !argument.startsWith('--')) {
      throw new Error('Only named contract template options are supported');
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

export function loadProvisionContractTemplateCommand(
  environment: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv.slice(2),
): ProvisionContractTemplateCommand {
  const cliValues = parseCliArguments(argv);
  const description =
    cliValues.CONTRACT_TEMPLATE_DESCRIPTION ??
    environment.CONTRACT_TEMPLATE_DESCRIPTION;
  const parsedInput = rawInputSchema.parse({
    DATABASE_URL: environment.DATABASE_URL,
    DATABASE_SSL: environment.DATABASE_SSL,
    DB_CONNECTION_TIMEOUT_MS: environment.DB_CONNECTION_TIMEOUT_MS,
    DB_STATEMENT_TIMEOUT_MS: environment.DB_STATEMENT_TIMEOUT_MS,
    INTERNAL_FILE_STORAGE_ROOT: environment.INTERNAL_FILE_STORAGE_ROOT,
    MAX_DOCX_TEMPLATE_BYTES: environment.MAX_DOCX_TEMPLATE_BYTES,
    MAX_DOCX_UNCOMPRESSED_BYTES: environment.MAX_DOCX_UNCOMPRESSED_BYTES,
    MAX_DOCX_TEMPLATE_ENTRIES: environment.MAX_DOCX_TEMPLATE_ENTRIES,
    CONTRACT_TEMPLATE_SOURCE_PATH:
      cliValues.CONTRACT_TEMPLATE_SOURCE_PATH ??
      environment.CONTRACT_TEMPLATE_SOURCE_PATH,
    CONTRACT_TEMPLATE_NAME:
      cliValues.CONTRACT_TEMPLATE_NAME ?? environment.CONTRACT_TEMPLATE_NAME,
    ...(description === undefined || description.trim().length === 0
      ? {}
      : { CONTRACT_TEMPLATE_DESCRIPTION: description }),
    CONTRACT_TEMPLATE_ALLOWED_FIELDS:
      cliValues.CONTRACT_TEMPLATE_ALLOWED_FIELDS ??
      environment.CONTRACT_TEMPLATE_ALLOWED_FIELDS,
    CONTRACT_TEMPLATE_OUTPUT_FILENAME:
      cliValues.CONTRACT_TEMPLATE_OUTPUT_FILENAME ??
      environment.CONTRACT_TEMPLATE_OUTPUT_FILENAME,
    CONTRACT_TEMPLATE_ACTOR_ID:
      cliValues.CONTRACT_TEMPLATE_ACTOR_ID ??
      environment.CONTRACT_TEMPLATE_ACTOR_ID,
  });

  return {
    database: {
      connectionString: parsedInput.DATABASE_URL,
      connectionTimeoutMs: parsedInput.DB_CONNECTION_TIMEOUT_MS,
      ssl: parsedInput.DATABASE_SSL,
      statementTimeoutMs: parsedInput.DB_STATEMENT_TIMEOUT_MS,
    },
    template: {
      actorId: parsedInput.CONTRACT_TEMPLATE_ACTOR_ID,
      allowedFields: parsedInput.CONTRACT_TEMPLATE_ALLOWED_FIELDS,
      ...(parsedInput.CONTRACT_TEMPLATE_DESCRIPTION === undefined
        ? {}
        : { description: parsedInput.CONTRACT_TEMPLATE_DESCRIPTION }),
      limits: {
        maxEntries: parsedInput.MAX_DOCX_TEMPLATE_ENTRIES,
        maxTemplateBytes: parsedInput.MAX_DOCX_TEMPLATE_BYTES,
        maxUncompressedBytes: parsedInput.MAX_DOCX_UNCOMPRESSED_BYTES,
      },
      name: parsedInput.CONTRACT_TEMPLATE_NAME,
      outputFilename: parsedInput.CONTRACT_TEMPLATE_OUTPUT_FILENAME,
      sourcePath: parsedInput.CONTRACT_TEMPLATE_SOURCE_PATH,
      storageRoot: parsedInput.INTERNAL_FILE_STORAGE_ROOT,
    },
  };
}

function isContained(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot.length > 0 &&
    fromRoot !== '..' &&
    !fromRoot.startsWith(`..${sep}`)
  );
}

function comparablePath(value: string): string {
  const absolutePath = resolve(value);
  if (process.platform !== 'win32') return absolutePath;
  return absolutePath.replace(/^\\\\\?\\/u, '').toLowerCase();
}

async function assertNoSymlinkComponents(targetPath: string): Promise<void> {
  const absolutePath = resolve(targetPath);
  const pathParts = absolutePath.slice(parse(absolutePath).root.length).split(sep);
  let currentPath = parse(absolutePath).root;

  for (const part of pathParts) {
    if (part.length === 0) continue;
    currentPath = resolve(currentPath, part);
    if ((await lstat(currentPath)).isSymbolicLink()) {
      throw new ContractTemplateProvisioningError(
        'Symbolic links are not allowed in template paths',
      );
    }
  }
}

async function readSourceTemplate(
  sourcePath: string,
  maxBytes: number,
): Promise<Buffer> {
  try {
    const absolutePath = resolve(sourcePath);
    await assertNoSymlinkComponents(absolutePath);
    const noFollow = constants.O_NOFOLLOW ?? 0;
    const handle = await open(absolutePath, constants.O_RDONLY | noFollow);

    try {
      const [initialStats, pathStats, canonicalPath] = await Promise.all([
        handle.stat(),
        lstat(absolutePath),
        realpath(absolutePath),
      ]);
      if (
        !initialStats.isFile() ||
        pathStats.isSymbolicLink() ||
        comparablePath(canonicalPath) !== comparablePath(absolutePath) ||
        initialStats.dev !== pathStats.dev ||
        initialStats.ino !== pathStats.ino
      ) {
        throw new ContractTemplateProvisioningError(
          'Source template must be a regular non-symbolic-link file',
        );
      }
      if (initialStats.size === 0 || initialStats.size > maxBytes) {
        throw new ContractTemplateProvisioningError(
          'Source template exceeds the configured size limit',
        );
      }

      const content = Buffer.alloc(initialStats.size);
      let offset = 0;
      while (offset < content.length) {
        const { bytesRead } = await handle.read(
          content,
          offset,
          content.length - offset,
          offset,
        );
        if (bytesRead === 0) {
          throw new ContractTemplateProvisioningError(
            'Source template changed while reading',
          );
        }
        offset += bytesRead;
      }

      const sentinel = Buffer.alloc(1);
      const [{ bytesRead: extraBytes }, finalStats] = await Promise.all([
        handle.read(sentinel, 0, 1, content.length),
        handle.stat(),
      ]);
      if (
        extraBytes !== 0 ||
        finalStats.size !== initialStats.size ||
        finalStats.dev !== initialStats.dev ||
        finalStats.ino !== initialStats.ino ||
        finalStats.mtimeMs !== initialStats.mtimeMs
      ) {
        throw new ContractTemplateProvisioningError(
          'Source template changed while reading',
        );
      }
      return content;
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error instanceof ContractTemplateProvisioningError) throw error;
    throw new ContractTemplateProvisioningError(
      'Source contract template is not available',
      { cause: error },
    );
  }
}

function assertValidDocxTemplate(
  templateBuffer: Buffer,
  limits: ProvisionContractTemplateInput['limits'],
): void {
  assertSafeDocxArchive(templateBuffer, {
    maxEntries: limits.maxEntries,
    maxUncompressedBytes: limits.maxUncompressedBytes,
  });

  const archive = new PizZip(templateBuffer, { checkCRC32: true });
  new Docxtemplater(archive, {
    errorLogging: false,
    linebreaks: true,
    paragraphLoop: true,
    stripInvalidXMLChars: true,
  });
}

async function prepareStorageDirectory(storageRoot: string): Promise<string> {
  const configuredRoot = resolve(storageRoot);
  await assertNoSymlinkComponents(configuredRoot);
  const rootStats = await lstat(configuredRoot);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new ContractTemplateProvisioningError(
      'Internal file storage root must be an existing regular directory',
    );
  }
  const canonicalRoot = await realpath(configuredRoot);
  const templatesDirectory = resolve(canonicalRoot, 'contract-templates');
  if (!isContained(canonicalRoot, templatesDirectory)) {
    throw new ContractTemplateProvisioningError(
      'Contract template storage directory is invalid',
    );
  }

  await mkdir(templatesDirectory, { mode: 0o700, recursive: true });
  const directoryStats = await lstat(templatesDirectory);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
    throw new ContractTemplateProvisioningError(
      'Contract template storage directory is unavailable',
    );
  }
  await chmod(templatesDirectory, 0o700);
  return templatesDirectory;
}

async function copyTemplateAtomically(
  templateBuffer: Buffer,
  storageRoot: string,
  templateId: string,
): Promise<CopiedTemplate> {
  const templatesDirectory = await prepareStorageDirectory(storageRoot);
  const storageKey = `contract-templates/${templateId}.docx`;
  const destinationPath = resolve(templatesDirectory, `${templateId}.docx`);
  const temporaryPath = resolve(
    templatesDirectory,
    `.${templateId}.${randomUUID()}.tmp`,
  );
  const noFollow = constants.O_NOFOLLOW ?? 0;
  let destinationCreated = false;
  let handle: Awaited<ReturnType<typeof open>> | undefined;

  try {
    handle = await open(
      temporaryPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | noFollow,
      0o600,
    );
    await handle.writeFile(templateBuffer);
    await handle.sync();
    await handle.chmod(0o600);
    await handle.close();
    handle = undefined;

    await link(temporaryPath, destinationPath);
    destinationCreated = true;
    const destinationStats = await lstat(destinationPath);
    if (!destinationStats.isFile() || destinationStats.isSymbolicLink()) {
      throw new ContractTemplateProvisioningError(
        'Stored contract template is not a regular file',
      );
    }

    return {
      absolutePath: destinationPath,
      device: destinationStats.dev,
      inode: destinationStats.ino,
      storageKey,
    };
  } catch (error) {
    if (destinationCreated) await unlink(destinationPath).catch(() => undefined);
    throw error;
  } finally {
    if (handle !== undefined) await handle.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
  }
}

async function cleanCopiedTemplate(copy: CopiedTemplate): Promise<void> {
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
    throw new ContractTemplateProvisioningError(
      'Refusing to remove a replaced contract template file',
    );
  }
  await unlink(copy.absolutePath);
}

export async function provisionContractTemplate(
  client: ProvisioningClient,
  input: ProvisionContractTemplateInput,
  createId: () => string = randomUUID,
): Promise<ProvisionedContractTemplate> {
  const validatedInput = provisionInputSchema.parse(input);
  const templateBuffer = await readSourceTemplate(
    validatedInput.sourcePath,
    validatedInput.limits.maxTemplateBytes,
  );
  assertValidDocxTemplate(templateBuffer, validatedInput.limits);

  const templateId = createId();
  z.string().uuid().parse(templateId);
  let copiedTemplate: CopiedTemplate | undefined;
  let transactionStarted = false;
  let commitStarted = false;

  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    transactionStarted = true;
    // Serialize with access-management mutations so the authorization snapshot
    // remains valid until this transaction finishes.
    await client.query('SELECT pg_advisory_xact_lock(1903241087, 1145528769)');
    const actor = await client.query<{ id: string }>(
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
             AND permission.code = 'manage:contract'
         )
       FOR SHARE OF user_account`,
      [validatedInput.actorId],
    );
    if (!actor.rows[0]) {
      throw new ContractTemplateProvisioningError(
        'Actor must be active and have manage:contract permission',
      );
    }

    copiedTemplate = await copyTemplateAtomically(
      templateBuffer,
      validatedInput.storageRoot,
      templateId,
    );
    await client.query(
      `INSERT INTO public.contract_templates
       (id, name, description, storage_key, allowed_fields, output_filename,
        is_active, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)`,
      [
        templateId,
        validatedInput.name,
        validatedInput.description ?? null,
        copiedTemplate.storageKey,
        validatedInput.allowedFields,
        validatedInput.outputFilename,
        validatedInput.actorId,
      ],
    );
    await client.query(
      `INSERT INTO public.audit_logs
       (actor_user_id, action, resource_type, resource_id, outcome, changes)
       VALUES ($1, 'CONTRACT_TEMPLATE.PROVISIONED', 'CONTRACT_TEMPLATE', $2,
               'SUCCESS', '{"isActive":true}'::jsonb)`,
      [validatedInput.actorId, templateId],
    );
    commitStarted = true;
    await client.query('COMMIT');
    transactionStarted = false;
    return { id: templateId, storageKey: copiedTemplate.storageKey };
  } catch (error) {
    if (commitStarted) {
      throw new ContractTemplateProvisioningError(
        'Database commit result is indeterminate; the template file was retained for reconciliation',
        { cause: error },
      );
    }
    if (transactionStarted && !commitStarted) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    if (copiedTemplate !== undefined && !commitStarted) {
      try {
        await cleanCopiedTemplate(copiedTemplate);
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
    'Usage: npm run contract-template:provision -- ' +
      '--source <file.docx> --name <name> --allowed-fields <a,b> ' +
      '--output-filename <file.docx> --actor-id <uuid> [--description <text>]',
  );
}

async function main(): Promise<void> {
  if (process.argv.slice(2).includes('--help')) {
    printUsage();
    return;
  }

  const command = loadProvisionContractTemplateCommand();
  const client = new Client({
    application_name: 'qts-contract-template-provisioner',
    connectionString: command.database.connectionString,
    connectionTimeoutMillis: command.database.connectionTimeoutMs,
    query_timeout: command.database.statementTimeoutMs,
    statement_timeout: command.database.statementTimeoutMs,
    ssl: command.database.ssl ? { rejectUnauthorized: true } : false,
  });

  await client.connect();
  try {
    const result = await provisionContractTemplate(client, command.template);
    console.info(`Contract template provisioned: ${result.id}`);
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
        : error instanceof ContractTemplateProvisioningError
          ? error.message
          : 'operation failed; review database and storage health';
    console.error(`Contract template provisioning failed: ${message}`);
    process.exitCode = 1;
  });
}
