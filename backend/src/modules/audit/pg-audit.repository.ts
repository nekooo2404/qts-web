import type { DatabasePool } from '../../database/database.types.js';
import type { AuditRepository } from './audit.repository.js';
import type {
  AuditListQuery,
  AuditLog,
  AuditMetadata,
  AuditOutcome,
} from './audit.types.js';

interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  outcome: AuditOutcome;
  request_id: string | null;
  metadata: AuditMetadata;
  occurred_at: Date;
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    outcome: row.outcome,
    requestId: row.request_id,
    metadata: row.metadata,
    occurredAt: row.occurred_at,
  };
}

export class PgAuditRepository implements AuditRepository {
  constructor(private readonly pool: DatabasePool) {}

  async record(event: Parameters<AuditRepository['record']>[0]): Promise<void> {
    await this.pool.query(
      `INSERT INTO public.audit_logs (
         actor_user_id,
         action,
         resource_type,
         resource_id,
         outcome,
         request_id,
         metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        event.actorUserId,
        event.action,
        event.resourceType,
        event.resourceId,
        event.outcome,
        event.requestId,
        JSON.stringify(event.metadata),
      ],
    );
  }

  async list(query: AuditListQuery) {
    const values: unknown[] = [];
    const filters: string[] = [];

    const addFilter = (column: string, value: unknown): void => {
      values.push(value);
      filters.push(`${column} = $${values.length}`);
    };
    if (query.actorUserId !== undefined) {
      addFilter('actor_user_id', query.actorUserId);
    }
    if (query.action !== undefined) addFilter('action', query.action);
    if (query.resourceType !== undefined) {
      addFilter('resource_type', query.resourceType);
    }
    if (query.resourceId !== undefined) {
      addFilter('resource_id', query.resourceId);
    }
    if (query.outcome !== undefined) addFilter('outcome', query.outcome);
    if (query.requestId !== undefined) addFilter('request_id', query.requestId);
    if (query.occurredFrom !== undefined) {
      values.push(query.occurredFrom);
      filters.push(`occurred_at >= $${values.length}`);
    }
    if (query.occurredTo !== undefined) {
      values.push(query.occurredTo);
      filters.push(`occurred_at <= $${values.length}`);
    }

    const whereClause = filters.length === 0 ? '' : `WHERE ${filters.join(' AND ')}`;
    const countValues = [...values];
    const pageSizeParameter = values.push(query.pageSize);
    const offsetParameter = values.push((query.page - 1) * query.pageSize);
    const [itemsResult, countResult] = await Promise.all([
      this.pool.query<AuditLogRow>(
        `SELECT
           id,
           actor_user_id,
           action,
           resource_type,
           resource_id,
           outcome,
           request_id,
           jsonb_strip_nulls(jsonb_build_object(
             'method', metadata ->> 'method',
             'statusCode', metadata -> 'statusCode',
             'ipHash', metadata ->> 'ipHash',
             'ipHashAlgorithm', metadata ->> 'ipHashAlgorithm'
           )) AS metadata,
           occurred_at
         FROM public.audit_logs
         ${whereClause}
         ORDER BY occurred_at DESC, id DESC
         LIMIT $${pageSizeParameter} OFFSET $${offsetParameter}`,
        values,
      ),
      this.pool.query<{ total: string }>(
        `SELECT count(*)::text AS total
         FROM public.audit_logs
         ${whereClause}`,
        countValues,
      ),
    ]);

    return {
      items: itemsResult.rows.map(mapAuditLog),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: Number(countResult.rows[0]?.total ?? 0),
    };
  }
}
