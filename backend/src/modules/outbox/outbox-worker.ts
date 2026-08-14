import type { ContactLeadRepository } from '../contact/contact.repository.js';
import {
  buildContactLeadEmail,
  type ContactEmailConfig,
  type ContactEmailMessage,
} from './contact-email.js';
import type { ClaimedOutboxEvent, OutboxRepository } from './outbox.repository.js';

export interface MailMessage extends ContactEmailMessage {
  messageId: string;
}

export interface MailTransport {
  send(message: MailMessage): Promise<{ messageId: string }>;
}

export interface WorkerResult {
  claimed: number;
  sent: number;
  retried: number;
  dead: number;
}

export interface ContactNotificationWorkerDependencies {
  workerId: string;
  outboxRepository: OutboxRepository;
  contactRepository: ContactLeadRepository;
  mailTransport: MailTransport;
  emailConfig: ContactEmailConfig;
  batchSize: number;
  leaseDurationMs: number;
  now?: () => Date;
  random?: () => number;
  shouldContinue?: () => boolean;
}

interface SmtpError extends Error {
  responseCode?: number;
}

const retryMaximumsMs = [60_000, 240_000, 1_200_000, 7_200_000, 43_200_000];

function classifyFailure(error: unknown): {
  errorCode: string;
  isPermanent: boolean;
} {
  const responseCode = (error as SmtpError | undefined)?.responseCode;
  if (responseCode !== undefined && responseCode >= 500) {
    return { errorCode: 'SMTP_PERMANENT', isPermanent: true };
  }
  return { errorCode: 'SMTP_TRANSIENT', isPermanent: false };
}

export class ContactNotificationWorker {
  private readonly now: () => Date;
  private readonly random: () => number;

  constructor(private readonly dependencies: ContactNotificationWorkerDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.random = dependencies.random ?? Math.random;
  }

  async processOnce(): Promise<WorkerResult> {
    const result: WorkerResult = {
      claimed: 0,
      sent: 0,
      retried: 0,
      dead: 0,
    };

    for (let index = 0; index < this.dependencies.batchSize; index += 1) {
      if (this.dependencies.shouldContinue?.() === false) break;
      const events = await this.dependencies.outboxRepository.claimBatch(
        this.dependencies.workerId,
        1,
        this.dependencies.leaseDurationMs,
        this.now(),
      );
      const event = events[0];
      if (!event) break;
      result.claimed += 1;
      await this.processEvent(event, result);
    }

    return result;
  }

  private async processEvent(
    event: ClaimedOutboxEvent,
    result: WorkerResult,
  ): Promise<void> {
    try {
      const lead = await this.dependencies.contactRepository.findByIdForEmail?.(
        event.aggregateId,
      );
      if (!lead) {
        await this.dependencies.outboxRepository.markFailed(
          event.id,
          this.dependencies.workerId,
          {
            isDead: true,
            errorCode: 'CONTACT_LEAD_NOT_FOUND',
            nextAttemptAt: this.now(),
          },
        );
        result.dead += 1;
        return;
      }

      const email = buildContactLeadEmail(lead, this.dependencies.emailConfig);
      const messageId = `<contact-${event.id}@qts.example>`;
      await this.dependencies.mailTransport.send({ ...email, messageId });
      await this.dependencies.outboxRepository.markSent(
        event.id,
        this.dependencies.workerId,
        this.now(),
      );
      result.sent += 1;
    } catch (error) {
      const failure = classifyFailure(error);
      const isDead = failure.isPermanent || event.attemptCount >= event.maxAttempts;
      const maximumDelay =
        retryMaximumsMs[
          Math.min(event.attemptCount - 1, retryMaximumsMs.length - 1)
        ] ?? retryMaximumsMs[retryMaximumsMs.length - 1] ?? 60_000;
      const nextAttemptAt = new Date(
        this.now().getTime() + Math.floor(this.random() * maximumDelay),
      );

      await this.dependencies.outboxRepository.markFailed(
        event.id,
        this.dependencies.workerId,
        {
          isDead,
          errorCode: failure.errorCode,
          nextAttemptAt,
        },
      );
      if (isDead) {
        result.dead += 1;
      } else {
        result.retried += 1;
      }
    }
  }
}
