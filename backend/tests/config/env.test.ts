import { describe, expect, it } from 'vitest';

import { loadApiConfig } from '../../src/config/env.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/qts',
  JWT_SECRET: 'jwt-secret-that-is-at-least-thirty-two-bytes',
  AUDIT_IP_HASH_SECRET: 'audit-secret-that-is-distinct-and-long-enough',
  INTERNAL_FILE_STORAGE_ROOT: './storage',
} satisfies NodeJS.ProcessEnv;

describe('archive download environment configuration', () => {
  it('uses bounded per-process defaults', () => {
    const config = loadApiConfig(validEnvironment);

    expect(config.internalFiles).toMatchObject({
      maxArchiveBytes: 1_073_741_824,
      maxInFlightArchiveDownloads: 2,
      maxInFlightArchiveBytes: 2_147_483_648,
      archiveDownloadRetryAfterSeconds: 5,
      maxTemplateBytes: 5_242_880,
      maxUncompressedTemplateBytes: 20_971_520,
      maxOutputBytes: 10_485_760,
      maxTemplateEntries: 512,
      maxInFlightDocumentGenerations: 1,
      maxInFlightDocumentBytes: 73_400_320,
      documentGenerationTimeoutMs: 10_000,
      documentWorkerMaxOldGenerationSizeMb: 96,
      documentGenerationRetryAfterSeconds: 5,
    });
  });

  it('rejects a total in-flight byte budget below the single-file limit', () => {
    expect(() =>
      loadApiConfig({
        ...validEnvironment,
        MAX_ARCHIVE_BYTES: '1024',
        MAX_ARCHIVE_INFLIGHT_BYTES: '1023',
      }),
    ).toThrow(/MAX_ARCHIVE_INFLIGHT_BYTES/);
  });

  it('rejects zero concurrent archive downloads', () => {
    expect(() =>
      loadApiConfig({
        ...validEnvironment,
        MAX_ARCHIVE_INFLIGHT_DOWNLOADS: '0',
      }),
    ).toThrow(/MAX_ARCHIVE_INFLIGHT_DOWNLOADS/);
  });

  it('rejects a DOCX byte budget that cannot admit one configured job', () => {
    expect(() =>
      loadApiConfig({
        ...validEnvironment,
        MAX_DOCX_TEMPLATE_BYTES: '1024',
        MAX_DOCX_UNCOMPRESSED_BYTES: '2048',
        MAX_DOCX_OUTPUT_BYTES: '1024',
        MAX_DOCX_INFLIGHT_BYTES: '4095',
      }),
    ).toThrow(/MAX_DOCX_INFLIGHT_BYTES/);
  });

  it.each([
    { JWT_SECRET: 'replace-with-at-least-32-random-bytes' },
    {
      AUDIT_IP_HASH_SECRET: 'change-me-with-at-least-32-random-bytes',
    },
  ])('rejects known placeholder secret patterns', (override) => {
    expect(() =>
      loadApiConfig({ ...validEnvironment, ...override }),
    ).toThrow();
  });

  it('rejects reusing the JWT key for audit IP pseudonymization', () => {
    expect(() =>
      loadApiConfig({
        ...validEnvironment,
        AUDIT_IP_HASH_SECRET: validEnvironment.JWT_SECRET,
      }),
    ).toThrow('AUDIT_IP_HASH_SECRET must differ from JWT_SECRET');
  });
});
