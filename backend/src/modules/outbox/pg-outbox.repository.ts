import type { DatabasePool } from '../../database/database.types.js';
import type {
  ClaimedOutboxEvent,
  OutboxFailure,
  OutboxRepository,
} from './outbox.repository.js';

interface OutboxRow {
  id: string;
  aggregate_id: string;
  attempt_count: number;
  max_attempts: number;
}

export class PgOutboxRepository implements OutboxRepository {
  constructor(private readonly pool: DatabasePool) {}

  async claimBatch(
    workerId: string,
    batchSize: number,
    leaseDurationMs: number,
    now: Date,
  ): Promise<ClaimedOutboxEvent[]> {
    const result = await this.pool.query<OutboxRow>(
      `WITH expired_final_attempts AS (
         UPDATE public.email_outbox
         SET status = 'DEAD', locked_at = NULL, locked_by = NULL,
             last_error = 'WORKER_LEASE_EXPIRED'
         WHERE status = 'PROCESSING'
           AND attempt_count >= max_attempts
           AND locked_at <= $3 - ($4 * INTERVAL '1 millisecond')
         RETURNING id
       ), candidates AS (
         SELECT id
         FROM public.email_outbox
         WHERE event_type = 'CONTACT_LEAD_CREATED'
           AND attempt_count < max_attempts
           AND (
             (status = 'PENDING' AND available_at <= $3)
             OR (
               status = 'PROCESSING'
               AND locked_at <= $3 - ($4 * INTERVAL '1 millisecond')
             )
           )
         ORDER BY available_at ASC, created_at ASC, id ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE public.email_outbox AS outbox
       SET status = 'PROCESSING',
           locked_at = $3,
           locked_by = $1,
           attempt_count = outbox.attempt_count + 1
       FROM candidates
       WHERE outbox.id = candidates.id
       RETURNING outbox.id, outbox.aggregate_id,
                 outbox.attempt_count,
                 outbox.max_attempts`,
      [workerId, batchSize, now, leaseDurationMs],
    );

    return result.rows.map((row) => ({
      id: row.id,
      aggregateId: row.aggregate_id,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
    }));
  }

  async markSent(id: string, workerId: string, sentAt: Date): Promise<void> {
    const result = await this.pool.query(
      `UPDATE public.email_outbox
       SET status = 'SENT', sent_at = $3, locked_at = NULL,
           locked_by = NULL, last_error = NULL
       WHERE id = $1 AND status = 'PROCESSING' AND locked_by = $2`,
      [id, workerId, sentAt],
    );
    if (result.rowCount !== 1) {
      throw new Error('Outbox lease was lost before marking the event sent');
    }
  }

  async markFailed(
    id: string,
    workerId: string,
    failure: OutboxFailure,
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE public.email_outbox
       SET status = $3, available_at = $4, locked_at = NULL,
           locked_by = NULL, last_error = $5
       WHERE id = $1 AND status = 'PROCESSING' AND locked_by = $2`,
      [
        id,
        workerId,
        failure.isDead ? 'DEAD' : 'PENDING',
        failure.nextAttemptAt,
        failure.errorCode,
      ],
    );
    if (result.rowCount !== 1) {
      throw new Error('Outbox lease was lost before recording the failure');
    }
  }
}
