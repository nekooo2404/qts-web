import type { PaginationResult } from '../../common/pagination.js';

export const leadStatuses = [
  'NEW',
  'IN_PROGRESS',
  'CONTACTED',
  'CLOSED',
  'SPAM',
] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export interface AssignedLead {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  message: string;
  status: LeadStatus;
  assignedAt: Date;
  version: number;
  createdAt: Date;
}

export interface LeadAssignment {
  leadId: string;
  assignedTo: string | null;
  assignedBy: string | null;
  assignedAt: Date | null;
  version: number;
}

export type LeadAssignmentResult =
  | { kind: 'updated'; assignment: LeadAssignment }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'assignee_unavailable' };

export interface LeadListQuery {
  page: number;
  pageSize: number;
  status?: LeadStatus | undefined;
}

export interface LeadRepository {
  listAssigned(
    employeeId: string,
    query: LeadListQuery,
  ): Promise<PaginationResult<AssignedLead>>;
  assign(
    leadId: string,
    assigneeId: string | null,
    version: number,
    actorId: string,
  ): Promise<LeadAssignmentResult>;
}
