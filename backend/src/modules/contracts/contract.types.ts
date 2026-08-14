export const contractStatuses = [
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'TERMINATED',
  'ARCHIVED',
] as const;

export type ContractStatus = (typeof contractStatuses)[number];

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  clientName: string;
  ownerId: string;
  templateId: string | null;
  status: ContractStatus;
  currency: string;
  valueAmount: string | null;
  effectiveDate: string | null;
  expiresAt: string | null;
  data: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractListQuery {
  page: number;
  pageSize: number;
  status?: ContractStatus | undefined;
  ownerId?: string | undefined;
  search?: string | undefined;
}

export interface ContractAccess {
  actorId: string;
  canManageAll: boolean;
}

export interface CreateContractInput {
  contractNumber: string;
  title: string;
  clientName: string;
  ownerId: string;
  templateId?: string | null | undefined;
  status?: ContractStatus | undefined;
  currency?: string | undefined;
  valueAmount?: string | null | undefined;
  effectiveDate?: string | null | undefined;
  expiresAt?: string | null | undefined;
  data?: Record<string, unknown> | undefined;
}

export interface UpdateContractInput {
  contractNumber?: string | undefined;
  title?: string | undefined;
  clientName?: string | undefined;
  ownerId?: string | undefined;
  templateId?: string | null | undefined;
  status?: ContractStatus | undefined;
  currency?: string | undefined;
  valueAmount?: string | null | undefined;
  effectiveDate?: string | null | undefined;
  expiresAt?: string | null | undefined;
  data?: Record<string, unknown> | undefined;
}
