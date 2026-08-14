import type { DatabasePool } from '../../database/database.types.js';
import type { AccessibleArchive, ArchiveRepository } from './archive.repository.js';

interface ArchiveRow {
  id: string;
  storage_key: string;
  original_filename: string;
  size_bytes: string;
  sha256: string;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

export class PgArchiveRepository implements ArchiveRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findAccessibleById(
    actorId: string,
    archiveId: string,
  ): Promise<AccessibleArchive | null> {
    const result = await this.pool.query<ArchiveRow>(
      `SELECT file.id, file.storage_key, file.original_filename,
              file.size_bytes::text, file.sha256
       FROM public.stored_files AS file
       LEFT JOIN public.contracts AS contract
         ON contract.id = file.contract_id
       LEFT JOIN public.tasks AS task
         ON task.id = file.task_id
       WHERE file.id = $2
         AND file.deleted_at IS NULL
         AND file.scan_status = 'CLEAN'
         AND file.extension IN ('zip', 'rar')
         AND (
           file.owner_id = $1
           OR contract.owner_id = $1
           OR task.assigned_to = $1
           OR task.created_by = $1
           OR EXISTS (
             SELECT 1
             FROM public.user_roles AS user_role
             JOIN public.role_permissions AS role_permission
               ON role_permission.role_id = user_role.role_id
             JOIN public.permissions AS permission
               ON permission.id = role_permission.permission_id
             WHERE user_role.user_id = $1
               AND permission.code = 'manage:file'
           )
         )
       LIMIT 1`,
      [actorId, archiveId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const sizeBytes = Number(row.size_bytes);
    if (
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      !SHA256_HEX.test(row.sha256)
    ) {
      return null;
    }
    return {
      id: row.id,
      storageKey: row.storage_key,
      originalFilename: row.original_filename,
      sizeBytes,
      sha256: row.sha256,
    };
  }
}
