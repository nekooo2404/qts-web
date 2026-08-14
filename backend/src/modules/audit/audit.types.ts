export const auditOutcomes = [
  'ATTEMPT',
  'SUCCESS',
  'DENIED',
  'FAILURE',
] as const;
export type AuditOutcome = (typeof auditOutcomes)[number];

export interface AuditMetadata {
  method?: string;
  statusCode?: number;
  ipHash?: string;
  ipHashAlgorithm?: 'HMAC-SHA256';
}

export interface AuditEvent {
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: AuditOutcome;
  requestId: string | null;
  metadata: AuditMetadata;
}

export interface AuditLog extends AuditEvent {
  id: string;
  occurredAt: Date;
}

export interface AuditListQuery {
  page: number;
  pageSize: number;
  actorUserId?: string | undefined;
  action?: string | undefined;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  outcome?: AuditOutcome | undefined;
  requestId?: string | undefined;
  occurredFrom?: Date | undefined;
  occurredTo?: Date | undefined;
}
