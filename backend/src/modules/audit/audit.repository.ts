import type { PaginationResult } from '../../common/pagination.js';
import type { AuditEvent, AuditListQuery, AuditLog } from './audit.types.js';

export interface AuditRepository {
  record(event: AuditEvent): Promise<void>;
  list(query: AuditListQuery): Promise<PaginationResult<AuditLog>>;
}
