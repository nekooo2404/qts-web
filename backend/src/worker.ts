import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { setTimeout as wait } from 'node:timers/promises';

import { loadWorkerConfig } from './config/env.js';
import { createDatabasePool } from './database/pool.js';
import { PgContactLeadRepository } from './modules/contact/pg-contact.repository.js';
import { NodemailerMailTransport } from './modules/outbox/nodemailer-transport.js';
import { ContactNotificationWorker } from './modules/outbox/outbox-worker.js';
import { PgOutboxRepository } from './modules/outbox/pg-outbox.repository.js';
import { createLogger } from './observability/logger.js';

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const logger = createLogger({
    service: 'qts-contact-email-worker',
    environment: config.nodeEnv,
    level: config.logLevel,
  });
  const pool = createDatabasePool(config.database);
  const mailTransport = new NodemailerMailTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    ...(config.smtp.user === undefined
      ? {}
      : { user: config.smtp.user, password: config.smtp.password! }),
    connectionTimeoutMs: config.smtp.connectionTimeoutMs,
    greetingTimeoutMs: config.smtp.greetingTimeoutMs,
    socketTimeoutMs: config.smtp.socketTimeoutMs,
  });
  const abortController = new AbortController();
  const workerId = `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
  const worker = new ContactNotificationWorker({
    workerId,
    outboxRepository: new PgOutboxRepository(pool),
    contactRepository: new PgContactLeadRepository(pool),
    mailTransport,
    emailConfig: {
      from: config.smtp.from,
      to: config.smtp.to,
      publicBaseUrl: config.smtp.publicBaseUrl,
    },
    batchSize: config.outbox.batchSize,
    leaseDurationMs: config.outbox.leaseDurationMs,
    shouldContinue: () => !abortController.signal.aborted,
  });

  const stop = (signal: NodeJS.Signals) => {
    logger.info({ event: 'worker_stopping', signal, workerId }, 'stopping worker');
    abortController.abort();
  };
  process.once('SIGTERM', () => stop('SIGTERM'));
  process.once('SIGINT', () => stop('SIGINT'));

  try {
    logger.info({ event: 'worker_started', workerId }, 'contact email worker started');
    while (!abortController.signal.aborted) {
      try {
        const result = await worker.processOnce();
        if (result.claimed > 0) {
          logger.info(
            { event: 'outbox_batch_processed', workerId, ...result },
            'processed contact email outbox batch',
          );
        }
      } catch (error) {
        logger.error(
          {
            event: 'outbox_batch_failed',
            workerId,
            errorType: error instanceof Error ? error.name : typeof error,
          },
          'contact email outbox batch failed',
        );
      }

      try {
        await wait(config.outbox.pollIntervalMs, undefined, {
          signal: abortController.signal,
        });
      } catch (error) {
        if (!abortController.signal.aborted) throw error;
      }
    }
  } finally {
    mailTransport.close();
    await pool.end();
  }

  logger.info({ event: 'worker_stopped', workerId }, 'contact email worker stopped');
}

main().catch((error: unknown) => {
  const logger = createLogger({
    service: 'qts-contact-email-worker',
    environment: process.env.NODE_ENV ?? 'development',
    level: process.env.LOG_LEVEL ?? 'info',
  });
  logger.fatal(
    {
      event: 'worker_startup_failed',
      errorType: error instanceof Error ? error.name : typeof error,
    },
    'contact email worker failed',
  );
  process.exitCode = 1;
});
