import { describe, expect, it } from 'vitest';

import type { ContactLeadRepository } from '../../src/modules/contact/contact.repository.js';
import type { ContactLeadForEmail } from '../../src/modules/contact/contact.types.js';
import type {
  ClaimedOutboxEvent,
  OutboxRepository,
} from '../../src/modules/outbox/outbox.repository.js';
import {
  ContactNotificationWorker,
  type MailTransport,
} from '../../src/modules/outbox/outbox-worker.js';

class FakeOutboxRepository implements OutboxRepository {
  public sent: string[] = [];
  public failed: Array<{
    id: string;
    isDead: boolean;
    errorCode: string;
    nextAttemptAt: Date;
  }> = [];

  constructor(private readonly events: ClaimedOutboxEvent[]) {}

  async claimBatch(): Promise<ClaimedOutboxEvent[]> {
    return this.events.splice(0);
  }

  async markSent(id: string): Promise<void> {
    this.sent.push(id);
  }

  async markFailed(
    id: string,
    _workerId: string,
    failure: { isDead: boolean; errorCode: string; nextAttemptAt: Date },
  ): Promise<void> {
    this.failed.push({ id, ...failure });
  }
}

class RecordingMailTransport implements MailTransport {
  public readonly messages: Array<{ messageId: string; to: string }> = [];

  constructor(private readonly failure?: Error & { responseCode?: number }) {}

  async send(message: { messageId: string; to: string }): Promise<{ messageId: string }> {
    this.messages.push({ messageId: message.messageId, to: message.to });
    if (this.failure) {
      throw this.failure;
    }
    return { messageId: message.messageId };
  }
}

const lead: ContactLeadForEmail = {
  id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
  customerName: 'Nguyễn Minh Anh',
  phone: '+84901234567',
  email: 'minh.anh@example.com',
  message: 'Tôi cần tư vấn giải pháp chuyển đổi số.',
  createdAt: new Date('2026-08-13T13:00:00.000Z'),
};

const event: ClaimedOutboxEvent = {
  id: 'f411e5c4-1417-4e63-88d0-d0ec41f54c64',
  aggregateId: lead.id,
  attemptCount: 1,
  maxAttempts: 8,
};

function buildWorker(
  outboxRepository: FakeOutboxRepository,
  mailTransport: MailTransport,
) {
  const contactRepository: ContactLeadRepository = {
    createWithNotification: async () => ({
      id: lead.id,
      status: 'NEW',
      createdAt: lead.createdAt,
    }),
    findByIdForEmail: async () => lead,
  };

  return new ContactNotificationWorker({
    workerId: 'worker-test',
    outboxRepository,
    contactRepository,
    mailTransport,
    emailConfig: {
      from: 'QTS Website <no-reply@qts.example>',
      to: 'sales@qts.example',
      publicBaseUrl: 'https://qts.example',
    },
    batchSize: 10,
    leaseDurationMs: 60_000,
    now: () => new Date('2026-08-13T13:30:00.000Z'),
    random: () => 0.5,
  });
}

describe('ContactNotificationWorker', () => {
  it('sends a claimed event and marks it sent', async () => {
    const outboxRepository = new FakeOutboxRepository([{ ...event }]);
    const mailTransport = new RecordingMailTransport();
    const worker = buildWorker(outboxRepository, mailTransport);

    const result = await worker.processOnce();

    expect(result).toEqual({ claimed: 1, sent: 1, retried: 0, dead: 0 });
    expect(outboxRepository.sent).toEqual([event.id]);
    expect(mailTransport.messages).toEqual([
      {
        messageId: `<contact-${event.id}@qts.example>`,
        to: 'sales@qts.example',
      },
    ]);
  });

  it('schedules a sanitized retry for a transient SMTP failure', async () => {
    const outboxRepository = new FakeOutboxRepository([{ ...event }]);
    const smtpError = Object.assign(
      new Error('421 mailbox minh.anh@example.com temporarily unavailable'),
      { responseCode: 421 },
    );
    const worker = buildWorker(
      outboxRepository,
      new RecordingMailTransport(smtpError),
    );

    const result = await worker.processOnce();

    expect(result).toEqual({ claimed: 1, sent: 0, retried: 1, dead: 0 });
    expect(outboxRepository.failed[0]).toMatchObject({
      id: event.id,
      isDead: false,
      errorCode: 'SMTP_TRANSIENT',
    });
    expect(outboxRepository.failed[0]?.nextAttemptAt.toISOString()).toBe(
      '2026-08-13T13:30:30.000Z',
    );
    expect(JSON.stringify(outboxRepository.failed)).not.toContain(lead.email);
  });

  it('moves a permanent SMTP failure to dead letter state', async () => {
    const outboxRepository = new FakeOutboxRepository([{ ...event }]);
    const smtpError = Object.assign(new Error('550 rejected'), {
      responseCode: 550,
    });
    const worker = buildWorker(
      outboxRepository,
      new RecordingMailTransport(smtpError),
    );

    const result = await worker.processOnce();

    expect(result).toEqual({ claimed: 1, sent: 0, retried: 0, dead: 1 });
    expect(outboxRepository.failed[0]).toMatchObject({
      isDead: true,
      errorCode: 'SMTP_PERMANENT',
    });
  });

  it('stops retrying after max attempts', async () => {
    const outboxRepository = new FakeOutboxRepository([
      { ...event, attemptCount: 8, maxAttempts: 8 },
    ]);
    const worker = buildWorker(
      outboxRepository,
      new RecordingMailTransport(new Error('socket timeout')),
    );

    const result = await worker.processOnce();

    expect(result.dead).toBe(1);
    expect(outboxRepository.failed[0]).toMatchObject({
      isDead: true,
      errorCode: 'SMTP_TRANSIENT',
    });
  });
});
