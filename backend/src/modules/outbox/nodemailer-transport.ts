import nodemailer, { type Transporter } from 'nodemailer';

import type { MailMessage, MailTransport } from './outbox-worker.js';

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
}

export class NodemailerMailTransport implements MailTransport {
  private readonly transporter: Transporter;

  constructor(config: SmtpTransportConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user === undefined
          ? undefined
          : { user: config.user, pass: config.password },
      requireTLS: !config.secure,
      connectionTimeout: config.connectionTimeoutMs,
      greetingTimeout: config.greetingTimeoutMs,
      socketTimeout: config.socketTimeoutMs,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  async send(message: MailMessage): Promise<{ messageId: string }> {
    const result: unknown = await this.transporter.sendMail(message);
    const messageId =
      typeof result === 'object' &&
      result !== null &&
      typeof (result as Record<string, unknown>).messageId === 'string'
        ? (result as Record<string, string>).messageId
        : message.messageId;
    if (typeof messageId !== 'string') {
      throw new Error('SMTP transport returned no message identifier');
    }
    return { messageId };
  }

  close(): void {
    this.transporter.close();
  }
}
