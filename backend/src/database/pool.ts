import { Pool } from 'pg';

interface DatabasePoolConfig {
  connectionString: string;
  ssl: boolean;
  poolMax: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  statementTimeoutMs: number;
}

export function createDatabasePool(config: DatabasePoolConfig): Pool {
  return new Pool({
    application_name: 'qts-public-api',
    connectionString: config.connectionString,
    max: config.poolMax,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    idleTimeoutMillis: config.idleTimeoutMs,
    statement_timeout: config.statementTimeoutMs,
    query_timeout: config.statementTimeoutMs,
    ssl: config.ssl ? { rejectUnauthorized: true } : false,
  });
}
