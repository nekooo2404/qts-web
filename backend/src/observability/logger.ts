import pino, { type Logger } from 'pino';

interface LoggerConfig {
  service: string;
  environment: string;
  level: string;
}

export function createLogger(config: LoggerConfig): Logger {
  return pino({
    level: config.level,
    base: {
      service: config.service,
      environment: config.environment,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
        '*.password',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
  });
}
