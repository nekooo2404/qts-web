import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Client } from 'pg';
import { z } from 'zod';

import { hashPassword } from '../src/modules/auth/password.js';

const inputSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  BOOTSTRAP_ADMIN_EMAIL: z.string().trim().toLowerCase().email().max(254),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(14).max(128),
  BOOTSTRAP_ADMIN_FULL_NAME: z.string().trim().min(2).max(120),
  BOOTSTRAP_ADMIN_EMPLOYEE_CODE: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9._-]{1,49}$/),
});

interface BootstrapAdministratorInput {
  email: string;
  employeeCode: string;
  fullName: string;
  passwordHash: string;
}

type BootstrapClient = Pick<Client, 'query'>;

export async function bootstrapAdministrator(
  client: BootstrapClient,
  input: BootstrapAdministratorInput,
  createId: () => string = randomUUID,
): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('qts-internal-admin-bootstrap'))",
    );
    const role = await client.query<{ id: string }>(
      "SELECT id FROM public.roles WHERE code = 'ADMIN' AND is_system = TRUE FOR UPDATE",
    );
    const roleId = role.rows[0]?.id;
    if (!roleId) throw new Error('ADMIN role is missing; run database migrations first');

    const existingAdministrator = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM public.user_roles AS user_role
         WHERE user_role.role_id = $1
       ) AS exists`,
      [roleId],
    );
    if (existingAdministrator.rows[0]?.exists) {
      throw new Error('An administrator account already exists');
    }

    const userId = createId();
    await client.query(
      `INSERT INTO public.users
       (id, email, password_hash, full_name, employee_code, status,
        created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $1, $1)`,
      [
        userId,
        input.email,
        input.passwordHash,
        input.fullName,
        input.employeeCode,
      ],
    );
    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id, granted_by)
       VALUES ($1, $2, $1)`,
      [userId, roleId],
    );
    await client.query(
      `INSERT INTO public.audit_logs
         (actor_user_id, action, resource_type, resource_id, outcome, changes)
       VALUES ($1, 'USER.BOOTSTRAPPED', 'USER', $1, 'SUCCESS',
         '{"roleCode":"ADMIN"}'::jsonb)`,
      [userId],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(): Promise<void> {
  const input = inputSchema.parse(process.env);
  const passwordHash = await hashPassword(input.BOOTSTRAP_ADMIN_PASSWORD);
  const client = new Client({
    application_name: 'qts-internal-admin-bootstrap',
    connectionString: input.DATABASE_URL,
    ssl: input.DATABASE_SSL ? { rejectUnauthorized: true } : false,
  });

  await client.connect();
  try {
    await bootstrapAdministrator(client, {
      email: input.BOOTSTRAP_ADMIN_EMAIL,
      employeeCode: input.BOOTSTRAP_ADMIN_EMPLOYEE_CODE,
      fullName: input.BOOTSTRAP_ADMIN_FULL_NAME,
      passwordHash,
    });
    console.info('Bootstrap administrator created');
  } finally {
    await client.end();
  }
}

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href === import.meta.url
) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
    console.error(`Administrator bootstrap failed: ${message}`);
    process.exitCode = 1;
  });
}
