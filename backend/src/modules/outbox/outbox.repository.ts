export interface ClaimedOutboxEvent {
  id: string;
  aggregateId: string;
  attemptCount: number;
  maxAttempts: number;
}

export interface OutboxFailure {
  isDead: boolean;
  errorCode: string;
  nextAttemptAt: Date;
}

export interface OutboxRepository {
  claimBatch(
    workerId: string,
    batchSize: number,
    leaseDurationMs: number,
    now: Date,
  ): Promise<ClaimedOutboxEvent[]>;
  markSent(id: string, workerId: string, sentAt: Date): Promise<void>;
  markFailed(
    id: string,
    workerId: string,
    failure: OutboxFailure,
  ): Promise<void>;
}
