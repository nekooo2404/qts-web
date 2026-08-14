import 'dotenv/config';

import { z } from 'zod';

const environmentSchema = z.enum(['development', 'test', 'production']);
const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']);
const booleanStringSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');
const secretSchema = (name: string) =>
  z
    .string()
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') >= 32,
      `${name} must be at least 32 bytes`,
    )
    .refine(
      (value) => !/(?:change|replace)[-_ ]?(?:me|with)/iu.test(value),
      `${name} must not use a placeholder value`,
    );

const commonSchema = z.object({
  NODE_ENV: environmentSchema.default('development'),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: booleanStringSchema.default(false),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(10000),
  LOG_LEVEL: logLevelSchema.default('info'),
});

const apiSchema = commonSchema.extend({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  JWT_SECRET: secretSchema('JWT_SECRET'),
  JWT_ISSUER: z.string().trim().min(1).default('qts-internal-api'),
  JWT_AUDIENCE: z.string().trim().min(1).default('qts-internal-portal'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  AUDIT_IP_HASH_SECRET: secretSchema('AUDIT_IP_HASH_SECRET'),
  INTERNAL_FILE_STORAGE_ROOT: z.string().trim().min(1),
  MAX_ARCHIVE_BYTES: z.coerce.number().int().min(1).max(10_737_418_240).default(1_073_741_824),
  MAX_ARCHIVE_INFLIGHT_DOWNLOADS: z.coerce.number().int().min(1).max(100).default(2),
  MAX_ARCHIVE_INFLIGHT_BYTES: z.coerce.number().int().min(1).max(21_474_836_480).default(2_147_483_648),
  ARCHIVE_DOWNLOAD_RETRY_AFTER_SECONDS: z.coerce.number().int().min(1).max(3600).default(5),
  MAX_DOCX_TEMPLATE_BYTES: z.coerce.number().int().min(1).max(20_971_520).default(5_242_880),
  MAX_DOCX_UNCOMPRESSED_BYTES: z.coerce.number().int().min(1).max(67_108_864).default(20_971_520),
  MAX_DOCX_OUTPUT_BYTES: z.coerce.number().int().min(1).max(20_971_520).default(10_485_760),
  MAX_DOCX_TEMPLATE_ENTRIES: z.coerce.number().int().min(1).max(2_000).default(512),
  MAX_DOCX_INFLIGHT_GENERATIONS: z.coerce.number().int().min(1).max(8).default(1),
  MAX_DOCX_INFLIGHT_BYTES: z.coerce.number().int().min(1).max(1_073_741_824).default(73_400_320),
  DOCX_GENERATION_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
  DOCX_WORKER_MAX_OLD_GENERATION_SIZE_MB: z.coerce.number().int().min(32).max(256).default(96),
  DOCX_GENERATION_RETRY_AFTER_SECONDS: z.coerce.number().int().min(1).max(3600).default(5),
}).superRefine((value, context) => {
  if (value.JWT_SECRET === value.AUDIT_IP_HASH_SECRET) {
    context.addIssue({
      code: 'custom',
      path: ['AUDIT_IP_HASH_SECRET'],
      message: 'AUDIT_IP_HASH_SECRET must differ from JWT_SECRET',
    });
  }
  if (value.MAX_ARCHIVE_INFLIGHT_BYTES < value.MAX_ARCHIVE_BYTES) {
    context.addIssue({
      code: 'custom',
      path: ['MAX_ARCHIVE_INFLIGHT_BYTES'],
      message: 'MAX_ARCHIVE_INFLIGHT_BYTES must be at least MAX_ARCHIVE_BYTES',
    });
  }
  const minimumDocumentBytes =
    2 *
    (value.MAX_DOCX_TEMPLATE_BYTES +
      value.MAX_DOCX_UNCOMPRESSED_BYTES +
      value.MAX_DOCX_OUTPUT_BYTES);
  if (value.MAX_DOCX_INFLIGHT_BYTES < minimumDocumentBytes) {
    context.addIssue({
      code: 'custom',
      path: ['MAX_DOCX_INFLIGHT_BYTES'],
      message:
        'MAX_DOCX_INFLIGHT_BYTES must admit one configured DOCX generation',
    });
  }
  const workerHeapBytes =
    value.DOCX_WORKER_MAX_OLD_GENERATION_SIZE_MB * 1024 * 1024;
  if (
    workerHeapBytes <
    value.MAX_DOCX_UNCOMPRESSED_BYTES + value.MAX_DOCX_OUTPUT_BYTES
  ) {
    context.addIssue({
      code: 'custom',
      path: ['DOCX_WORKER_MAX_OLD_GENERATION_SIZE_MB'],
      message:
        'DOCX worker heap must cover expanded template and output limits',
    });
  }
});

const workerSchema = commonSchema
  .extend({
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: booleanStringSchema.default(false),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    SMTP_FROM: z.string().min(3),
    SMTP_TO: z.string().email(),
    PUBLIC_BASE_URL: z.string().url(),
    SMTP_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(100).default(10000),
    SMTP_GREETING_TIMEOUT_MS: z.coerce.number().int().min(100).default(10000),
    SMTP_SOCKET_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
    OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(100).default(10),
    OUTBOX_LEASE_MS: z.coerce.number().int().min(10000).default(120000),
    OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(250).default(5000),
  })
  .superRefine((value, context) => {
    if ((value.SMTP_USER === undefined) !== (value.SMTP_PASSWORD === undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_PASSWORD'],
        message: 'SMTP_USER and SMTP_PASSWORD must be configured together',
      });
    }
    const smtpTimeoutBudget =
      value.SMTP_CONNECTION_TIMEOUT_MS +
      value.SMTP_GREETING_TIMEOUT_MS +
      value.SMTP_SOCKET_TIMEOUT_MS;
    if (value.OUTBOX_LEASE_MS <= smtpTimeoutBudget) {
      context.addIssue({
        code: 'custom',
        path: ['OUTBOX_LEASE_MS'],
        message: 'OUTBOX_LEASE_MS must exceed the combined SMTP timeout budget',
      });
    }
  });

function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
}

export type ApiConfig = ReturnType<typeof loadApiConfig>;
export type WorkerConfig = ReturnType<typeof loadWorkerConfig>;

export function loadApiConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = apiSchema.parse(environment);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    allowedOrigins: parseOrigins(parsed.CORS_ORIGINS),
    trustProxyHops: parsed.TRUST_PROXY_HOPS,
    logLevel: parsed.LOG_LEVEL,
    jwt: {
      secret: parsed.JWT_SECRET,
      issuer: parsed.JWT_ISSUER,
      audience: parsed.JWT_AUDIENCE,
      expiresInSeconds: parsed.JWT_EXPIRES_IN_SECONDS,
    },
    audit: { ipHashSecret: parsed.AUDIT_IP_HASH_SECRET },
    internalFiles: {
      storageRoot: parsed.INTERNAL_FILE_STORAGE_ROOT,
      maxArchiveBytes: parsed.MAX_ARCHIVE_BYTES,
      maxInFlightArchiveDownloads: parsed.MAX_ARCHIVE_INFLIGHT_DOWNLOADS,
      maxInFlightArchiveBytes: parsed.MAX_ARCHIVE_INFLIGHT_BYTES,
      archiveDownloadRetryAfterSeconds: parsed.ARCHIVE_DOWNLOAD_RETRY_AFTER_SECONDS,
      maxTemplateBytes: parsed.MAX_DOCX_TEMPLATE_BYTES,
      maxUncompressedTemplateBytes: parsed.MAX_DOCX_UNCOMPRESSED_BYTES,
      maxOutputBytes: parsed.MAX_DOCX_OUTPUT_BYTES,
      maxTemplateEntries: parsed.MAX_DOCX_TEMPLATE_ENTRIES,
      maxInFlightDocumentGenerations:
        parsed.MAX_DOCX_INFLIGHT_GENERATIONS,
      maxInFlightDocumentBytes: parsed.MAX_DOCX_INFLIGHT_BYTES,
      documentGenerationTimeoutMs: parsed.DOCX_GENERATION_TIMEOUT_MS,
      documentWorkerMaxOldGenerationSizeMb:
        parsed.DOCX_WORKER_MAX_OLD_GENERATION_SIZE_MB,
      documentGenerationRetryAfterSeconds:
        parsed.DOCX_GENERATION_RETRY_AFTER_SECONDS,
    },
    database: {
      connectionString: parsed.DATABASE_URL,
      ssl: parsed.DATABASE_SSL,
      poolMax: parsed.DB_POOL_MAX,
      connectionTimeoutMs: parsed.DB_CONNECTION_TIMEOUT_MS,
      idleTimeoutMs: parsed.DB_IDLE_TIMEOUT_MS,
      statementTimeoutMs: parsed.DB_STATEMENT_TIMEOUT_MS,
    },
  };
}

export function loadWorkerConfig(environment: NodeJS.ProcessEnv = process.env) {
  const parsed = workerSchema.parse(environment);
  return {
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    database: {
      connectionString: parsed.DATABASE_URL,
      ssl: parsed.DATABASE_SSL,
      poolMax: parsed.DB_POOL_MAX,
      connectionTimeoutMs: parsed.DB_CONNECTION_TIMEOUT_MS,
      idleTimeoutMs: parsed.DB_IDLE_TIMEOUT_MS,
      statementTimeoutMs: parsed.DB_STATEMENT_TIMEOUT_MS,
    },
    smtp: {
      host: parsed.SMTP_HOST,
      port: parsed.SMTP_PORT,
      secure: parsed.SMTP_SECURE,
      ...(parsed.SMTP_USER === undefined
        ? {}
        : { user: parsed.SMTP_USER, password: parsed.SMTP_PASSWORD! }),
      from: parsed.SMTP_FROM,
      to: parsed.SMTP_TO,
      publicBaseUrl: parsed.PUBLIC_BASE_URL,
      connectionTimeoutMs: parsed.SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeoutMs: parsed.SMTP_GREETING_TIMEOUT_MS,
      socketTimeoutMs: parsed.SMTP_SOCKET_TIMEOUT_MS,
    },
    outbox: {
      batchSize: parsed.OUTBOX_BATCH_SIZE,
      leaseDurationMs: parsed.OUTBOX_LEASE_MS,
      pollIntervalMs: parsed.OUTBOX_POLL_INTERVAL_MS,
    },
  };
}
