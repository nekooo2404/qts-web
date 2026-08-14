import type { PaginationResult } from '../../common/pagination.js';
import type {
  Contract,
  ContractAccess,
  ContractListQuery,
  CreateContractInput,
  UpdateContractInput,
} from './contract.types.js';

export type ContractUpdateResult =
  | { kind: 'updated'; contract: Contract }
  | { kind: 'not_found' }
  | { kind: 'version_conflict' }
  | { kind: 'context_unavailable' };

export type ContractCreateResult =
  | { kind: 'created'; contract: Contract }
  | { kind: 'context_unavailable' };

export interface ContractRepository {
  list(
    access: ContractAccess,
    query: ContractListQuery,
  ): Promise<PaginationResult<Contract>>;
  findById(id: string, access: ContractAccess): Promise<Contract | null>;
  create(
    input: CreateContractInput,
    access: ContractAccess,
  ): Promise<ContractCreateResult>;
  update(
    id: string,
    input: UpdateContractInput,
    expectedVersion: number,
    access: ContractAccess,
  ): Promise<ContractUpdateResult>;
  archive(id: string, access: ContractAccess): Promise<boolean>;
}
