import type { Pool, PoolClient } from 'pg';

export type DatabasePool = Pick<Pool, 'connect' | 'query' | 'end'>;
export type DatabaseClient = Pick<PoolClient, 'query' | 'release'>;
