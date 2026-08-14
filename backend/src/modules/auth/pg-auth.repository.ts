import type { DatabasePool } from '../../database/database.types.js';
import type {
  AuthRepository,
  AuthenticatedUserRecord,
  LoginUserRecord,
} from './auth.repository.js';

interface LoginUserRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  auth_version: number;
  status: string;
  login_locked: boolean;
}

interface AuthorizationUserRow {
  id: string;
  email: string;
  full_name: string;
  auth_version: number;
  status: string;
  permissions: string[] | null;
}

const isActive = (status: string) => status === 'ACTIVE';

function mapLoginUser(row: LoginUserRow): LoginUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.full_name,
    passwordHash: row.password_hash,
    authVersion: row.auth_version,
    isActive: isActive(row.status),
    isLoginLocked: row.login_locked,
  };
}

function mapAuthorizationUser(
  row: AuthorizationUserRow,
): AuthenticatedUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.full_name,
    authVersion: row.auth_version,
    isActive: isActive(row.status),
    permissions: row.permissions ?? [],
  };
}

export class PgAuthRepository implements AuthRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findUserByEmail(email: string): Promise<LoginUserRecord | null> {
    const result = await this.pool.query<LoginUserRow>(
      `SELECT id, email, full_name, password_hash, auth_version, status,
              locked_until IS NOT NULL
                AND locked_until > CURRENT_TIMESTAMP AS login_locked
       FROM public.users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );
    const row = result.rows[0];
    return row ? mapLoginUser(row) : null;
  }

  async recordFailedLogin(userId: string): Promise<void> {
    const lockThreshold = 5;
    const lockDurationMs = 15 * 60 * 1000;
    await this.pool.query(
      `UPDATE public.users
       SET failed_login_attempts = CASE
             WHEN locked_until IS NOT NULL THEN 1
             ELSE LEAST(failed_login_attempts + 1, 1000000)
           END,
           locked_until = CASE
             WHEN CASE
                    WHEN locked_until IS NOT NULL THEN 1
                    ELSE failed_login_attempts + 1
                  END >= $2
               THEN CURRENT_TIMESTAMP + ($3 * INTERVAL '1 millisecond')
             ELSE NULL
           END
       WHERE id = $1
         AND status = 'ACTIVE'
         AND (locked_until IS NULL OR locked_until <= CURRENT_TIMESTAMP)`,
      [userId, lockThreshold, lockDurationMs],
    );
  }

  async recordSuccessfulLogin(
    userId: string,
    expectedAuthVersion: number,
  ): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE public.users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND auth_version = $2
         AND status = 'ACTIVE'
         AND (locked_until IS NULL OR locked_until <= CURRENT_TIMESTAMP)
       RETURNING id`,
      [userId, expectedAuthVersion],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async findUserAuthorizationById(
    userId: string,
  ): Promise<AuthenticatedUserRecord | null> {
    const result = await this.pool.query<AuthorizationUserRow>(
      `SELECT users.id,
              users.email,
              users.full_name,
              users.auth_version,
              users.status,
              coalesce(
                array_agg(DISTINCT permission.code ORDER BY permission.code)
                  FILTER (WHERE permission.code IS NOT NULL),
                ARRAY[]::varchar[]
              ) AS permissions
       FROM public.users AS users
       LEFT JOIN public.user_roles AS user_role
         ON user_role.user_id = users.id
       LEFT JOIN public.role_permissions AS role_permission
         ON role_permission.role_id = user_role.role_id
       LEFT JOIN public.permissions AS permission
         ON permission.id = role_permission.permission_id
       WHERE users.id = $1
       GROUP BY users.id
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? mapAuthorizationUser(row) : null;
  }
}
