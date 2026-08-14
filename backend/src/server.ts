import { createServer } from 'node:http';

import { createApp } from './app.js';
import { loadApiConfig } from './config/env.js';
import { createDatabasePool } from './database/pool.js';
import { PgAccessManagementRepository } from './modules/access-management/pg-access-management.repository.js';
import { PgAuditRepository } from './modules/audit/pg-audit.repository.js';
import { createAccessTokenService } from './modules/auth/access-token.service.js';
import { PgAuthRepository } from './modules/auth/pg-auth.repository.js';
import { PgCmsRepository } from './modules/cms/pg-cms.repository.js';
import { PgContactLeadRepository } from './modules/contact/pg-contact.repository.js';
import { ContractDocumentGenerationService } from './modules/contracts/document-generation.service.js';
import { InFlightDocumentGenerationController } from './modules/contracts/document-generation-admission.js';
import { WorkerThreadContractDocumentRenderer } from './modules/contracts/document-generation-worker-runner.js';
import { PgContractRepository } from './modules/contracts/pg-contract.repository.js';
import { PgContractTemplateRepository } from './modules/contracts/pg-document-generation.repository.js';
import { LocalFileStorage } from './modules/files/local-file-storage.js';
import { PgArchiveRepository } from './modules/files/pg-archive.repository.js';
import { InFlightArchiveDownloadController } from './modules/files/archive-download-admission.js';
import { PgLeadRepository } from './modules/leads/pg-lead.repository.js';
import { PgProjectRepository } from './modules/projects/pg-project.repository.js';
import { PgPublicContentRepository } from './modules/public-content/pg-public-content.repository.js';
import { PgTaskRepository } from './modules/tasks/pg-task.repository.js';
import { createLogger } from './observability/logger.js';

async function main(): Promise<void> {
  const config = loadApiConfig();
  const logger = createLogger({
    service: 'qts-api',
    environment: config.nodeEnv,
    level: config.logLevel,
  });
  const pool = createDatabasePool(config.database);
  pool.on('error', (error) => {
    logger.error(
      { event: 'database_pool_error', errorType: error.name },
      'database pool reported an idle client error',
    );
  });
  const authRepository = new PgAuthRepository(pool);
  const fileStorage = new LocalFileStorage(config.internalFiles.storageRoot);
  const archiveDownloadAdmission = new InFlightArchiveDownloadController({
    maxDownloads: config.internalFiles.maxInFlightArchiveDownloads,
    maxBytes: config.internalFiles.maxInFlightArchiveBytes,
  });
  const documentGenerationAdmission =
    new InFlightDocumentGenerationController({
      maxGenerations: config.internalFiles.maxInFlightDocumentGenerations,
      maxBytes: config.internalFiles.maxInFlightDocumentBytes,
    });
  const documentRenderer = new WorkerThreadContractDocumentRenderer({
    timeoutMs: config.internalFiles.documentGenerationTimeoutMs,
    maxOldGenerationSizeMb:
      config.internalFiles.documentWorkerMaxOldGenerationSizeMb,
  });

  const app = createApp({
    contactRepository: new PgContactLeadRepository(pool),
    projectRepository: new PgProjectRepository(pool),
    publicContentRepository: new PgPublicContentRepository(pool),
    allowedOrigins: config.allowedOrigins,
    trustProxy: config.trustProxyHops,
    logger,
    healthCheck: async () => {
      await pool.query('SELECT 1');
    },
    internalPortal: {
      authRepository,
      tokenService: createAccessTokenService(config.jwt),
      leadRepository: new PgLeadRepository(pool),
      contractRepository: new PgContractRepository(pool),
      taskRepository: new PgTaskRepository(pool),
      accessManagementRepository: new PgAccessManagementRepository(pool),
      cmsRepository: new PgCmsRepository(pool),
      auditRepository: new PgAuditRepository(pool),
      auditIpHashSecret: config.audit.ipHashSecret,
      archiveDownload: {
        repository: new PgArchiveRepository(pool),
        storage: fileStorage,
        maxArchiveBytes: config.internalFiles.maxArchiveBytes,
        admissionController: archiveDownloadAdmission,
        retryAfterSeconds:
          config.internalFiles.archiveDownloadRetryAfterSeconds,
      },
      contractDocumentGenerator: new ContractDocumentGenerationService(
        new PgContractTemplateRepository(pool),
        fileStorage,
        {
          maxTemplateBytes: config.internalFiles.maxTemplateBytes,
          maxUncompressedTemplateBytes:
            config.internalFiles.maxUncompressedTemplateBytes,
          maxOutputBytes: config.internalFiles.maxOutputBytes,
          maxTemplateEntries: config.internalFiles.maxTemplateEntries,
          retryAfterSeconds:
            config.internalFiles.documentGenerationRetryAfterSeconds,
        },
        documentRenderer,
        documentGenerationAdmission,
      ),
    },
  });
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, () => {
      server.off('error', reject);
      logger.info(
        { event: 'server_started', port: config.port },
        'QTS API started',
      );
      resolve();
    });
  });

  let stopping = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) return;
    stopping = true;
    logger.info({ event: 'server_stopping', signal }, 'stopping QTS API');

    const timeout = setTimeout(() => {
      logger.fatal({ event: 'shutdown_timeout' }, 'graceful shutdown timed out');
      process.exit(1);
    }, 10_000);
    timeout.unref();

    server.closeIdleConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await pool.end();
    clearTimeout(timeout);
    logger.info({ event: 'server_stopped' }, 'QTS API stopped');
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  const errorType = error instanceof Error ? error.name : typeof error;
  const logger = createLogger({
    service: 'qts-api',
    environment: process.env.NODE_ENV ?? 'development',
    level: process.env.LOG_LEVEL ?? 'info',
  });
  logger.fatal({ event: 'startup_failed', errorType }, 'QTS API failed to start');
  process.exitCode = 1;
});
