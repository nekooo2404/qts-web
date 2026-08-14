import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { Client } from 'pg';

const migrationsDirectory = resolve(process.cwd(), 'migrations');
const migrationLockName = 'qts-public-api-schema-migrations';
const migrationLockTimeoutMs = 30_000;
const migrationStatementTimeoutMs = 120_000;

type Direction = 'up' | 'down';

interface MigrationPaths {
  down?: string;
  up?: string;
}

interface Migration {
  checksum: string;
  downSql: string;
  upSql: string;
  version: string;
}

interface AppliedMigration {
  checksum: string;
  version: string;
}

function checksum(contents: string): string {
  return createHash('sha256').update(contents, 'utf8').digest('hex');
}

async function loadMigrations(): Promise<Migration[]> {
  const filenames = await readdir(migrationsDirectory);
  const migrationPaths = new Map<string, MigrationPaths>();

  for (const filename of filenames) {
    const match = /^(?<version>.+)\.(?<direction>up|down)\.sql$/.exec(filename);
    if (!match?.groups) {
      continue;
    }

    const { direction, version } = match.groups;
    if (!direction || !version) {
      continue;
    }

    const paths = migrationPaths.get(version) ?? {};
    if (paths[direction as Direction]) {
      throw new Error(`Duplicate ${direction} migration for version ${version}`);
    }

    paths[direction as Direction] = filename;
    migrationPaths.set(version, paths);
  }

  const migrations: Migration[] = [];
  const versions = [...migrationPaths.keys()].sort((left, right) =>
    left.localeCompare(right, 'en', { numeric: true }),
  );

  for (const version of versions) {
    const paths = migrationPaths.get(version);
    if (!paths?.up || !paths.down) {
      throw new Error(`Migration ${version} must have both up and down SQL files`);
    }

    const [upSql, downSql] = await Promise.all([
      readFile(join(migrationsDirectory, paths.up), 'utf8'),
      readFile(join(migrationsDirectory, paths.down), 'utf8'),
    ]);

    migrations.push({
      checksum: checksum(upSql),
      downSql,
      upSql,
      version,
    });
  }

  return migrations;
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT schema_migrations_checksum_check
        CHECK (checksum ~ '^[0-9a-f]{64}$')
    )
  `);
}

async function getAppliedMigrations(client: Client): Promise<AppliedMigration[]> {
  const result = await client.query<AppliedMigration>(
    'SELECT version, checksum FROM public.schema_migrations',
  );
  return result.rows.map((row) => ({
    checksum: row.checksum.trim(),
    version: row.version,
  }));
}

function validateAppliedMigrations(
  migrations: Migration[],
  appliedMigrations: AppliedMigration[],
): Set<string> {
  const localByVersion = new Map(migrations.map((migration) => [migration.version, migration]));
  const appliedByVersion = new Map(
    appliedMigrations.map((migration) => [migration.version, migration]),
  );

  for (const applied of appliedMigrations) {
    const local = localByVersion.get(applied.version);
    if (!local) {
      throw new Error(`Applied migration ${applied.version} is missing from disk`);
    }
    if (local.checksum !== applied.checksum) {
      throw new Error(`Checksum mismatch for applied migration ${applied.version}`);
    }
  }

  const expectedPrefix = migrations.slice(0, appliedMigrations.length);
  if (expectedPrefix.some((migration) => !appliedByVersion.has(migration.version))) {
    throw new Error('Applied migrations are not a contiguous prefix of local migrations');
  }

  return new Set(appliedByVersion.keys());
}

async function runInTransaction(client: Client, task: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    await task();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function migrateUp(
  client: Client,
  migrations: Migration[],
  appliedVersions: Set<string>,
): Promise<void> {
  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    await runInTransaction(client, async () => {
      await client.query(migration.upSql);
      await client.query(
        `INSERT INTO public.schema_migrations (version, checksum)
         VALUES ($1, $2)`,
        [migration.version, migration.checksum],
      );
    });
    console.info(`Applied migration ${migration.version}`);
  }
}

async function migrateDown(
  client: Client,
  migrations: Migration[],
  appliedVersions: Set<string>,
  steps: number,
): Promise<void> {
  const migrationsToRevert = migrations
    .filter((migration) => appliedVersions.has(migration.version))
    .reverse()
    .slice(0, steps);

  for (const migration of migrationsToRevert) {
    await runInTransaction(client, async () => {
      await client.query(migration.downSql);
      await client.query('DELETE FROM public.schema_migrations WHERE version = $1', [
        migration.version,
      ]);
    });
    console.info(`Reverted migration ${migration.version}`);
  }
}

function parseArguments(argv: string[]): { direction: Direction; steps: number } {
  const [directionInput = 'up', stepsInput = '1'] = argv;
  if (directionInput !== 'up' && directionInput !== 'down') {
    throw new Error('Usage: tsx scripts/migrate.ts <up|down> [steps]');
  }

  const steps = Number(stepsInput);
  if (!Number.isSafeInteger(steps) || steps < 1) {
    throw new Error('Migration steps must be a positive integer');
  }

  return { direction: directionInput, steps };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const { direction, steps } = parseArguments(process.argv.slice(2));
  const migrations = await loadMigrations();
  const client = new Client({
    application_name: 'qts-public-api-migrator',
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: true }
        : false,
  });

  await client.connect();
  let lockAcquired = false;
  try {
    await client.query(`SET lock_timeout = '${migrationLockTimeoutMs}ms'`);
    await client.query(
      `SET statement_timeout = '${migrationStatementTimeoutMs}ms'`,
    );
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [migrationLockName]);
    lockAcquired = true;
    await ensureMigrationsTable(client);

    const appliedMigrations = await getAppliedMigrations(client);
    const appliedVersions = validateAppliedMigrations(migrations, appliedMigrations);

    if (direction === 'up') {
      await migrateUp(client, migrations, appliedVersions);
    } else {
      await migrateDown(client, migrations, appliedVersions, steps);
    }
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [migrationLockName]);
    }
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration error';
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
