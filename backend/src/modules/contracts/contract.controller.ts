import type { Request, RequestHandler, Response } from 'express';

import { ApiError } from '../../common/api-error.js';
import { omitUndefined } from '../../common/omit-undefined.js';
import { toPaginatedResponse } from '../../common/pagination.js';
import type { ContractRepository } from './contract.repository.js';
import {
  contractIdSchema,
  contractListQuerySchema,
  createContractSchema,
  updateContractSchema,
} from './contract.schema.js';
import type { Contract, ContractAccess } from './contract.types.js';

export type ContractAccessProvider = (
  request: Request,
  response: Response,
) => ContractAccess;

function serializeContract(contract: Contract) {
  return {
    ...contract,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  };
}

function enforceOwnerScope(
  ownerId: string | undefined,
  access: ContractAccess,
): void {
  if (
    !access.canManageAll &&
    ownerId !== undefined &&
    ownerId !== access.actorId
  ) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'You cannot assign a contract outside your ownership scope',
    );
  }
}

export function listContractsController(
  repository: ContractRepository,
  getAccess: ContractAccessProvider,
): RequestHandler {
  return async (request, response) => {
    const query = contractListQuerySchema.parse(request.query);
    const result = await repository.list(getAccess(request, response), query);
    response.json(
      toPaginatedResponse({
        ...result,
        items: result.items.map(serializeContract),
      }),
    );
  };
}

export function getContractController(
  repository: ContractRepository,
  getAccess: ContractAccessProvider,
): RequestHandler {
  return async (request, response) => {
    const id = contractIdSchema.parse(request.params.id);
    const contract = await repository.findById(id, getAccess(request, response));
    if (!contract) {
      throw new ApiError(404, 'CONTRACT_NOT_FOUND', 'Contract was not found');
    }
    response.json({ data: serializeContract(contract) });
  };
}

export function createContractController(
  repository: ContractRepository,
  getAccess: ContractAccessProvider,
): RequestHandler {
  return async (request, response) => {
    const input = createContractSchema.parse(request.body);
    const access = getAccess(request, response);
    enforceOwnerScope(input.ownerId, access);
    const result = await repository.create(input, access);
    if (result.kind === 'context_unavailable') {
      throw new ApiError(
        422,
        'CONTRACT_CONTEXT_UNAVAILABLE',
        'The selected owner or template is not available',
      );
    }
    response.status(201).json({ data: serializeContract(result.contract) });
  };
}

export function updateContractController(
  repository: ContractRepository,
  getAccess: ContractAccessProvider,
): RequestHandler {
  return async (request, response) => {
    const id = contractIdSchema.parse(request.params.id);
    const { version, ...rawInput } = updateContractSchema.parse(request.body);
    const input = omitUndefined(rawInput);
    const access = getAccess(request, response);
    enforceOwnerScope(input.ownerId, access);

    if (input.effectiveDate !== undefined || input.expiresAt !== undefined) {
      const current = await repository.findById(id, access);
      if (!current) {
        throw new ApiError(404, 'CONTRACT_NOT_FOUND', 'Contract was not found');
      }
      if (current.version !== version) {
        throw new ApiError(
          409,
          'CONTRACT_VERSION_CONFLICT',
          'Contract was changed by another request',
        );
      }
      const effectiveDate =
        input.effectiveDate !== undefined
          ? input.effectiveDate
          : current.effectiveDate;
      const expiresAt =
        input.expiresAt !== undefined ? input.expiresAt : current.expiresAt;
      if (effectiveDate && expiresAt && expiresAt < effectiveDate) {
        throw new ApiError(
          422,
          'CONTRACT_DATE_RANGE_INVALID',
          'expiresAt must be on or after effectiveDate',
        );
      }
    }

    const result = await repository.update(id, input, version, access);

    if (result.kind === 'not_found') {
      throw new ApiError(404, 'CONTRACT_NOT_FOUND', 'Contract was not found');
    }
    if (result.kind === 'version_conflict') {
      throw new ApiError(
        409,
        'CONTRACT_VERSION_CONFLICT',
        'Contract was changed by another request',
      );
    }
    if (result.kind === 'context_unavailable') {
      throw new ApiError(
        422,
        'CONTRACT_CONTEXT_UNAVAILABLE',
        'The selected owner or template is not available',
      );
    }
    response.json({ data: serializeContract(result.contract) });
  };
}

export function deleteContractController(
  repository: ContractRepository,
  getAccess: ContractAccessProvider,
): RequestHandler {
  return async (request, response) => {
    const id = contractIdSchema.parse(request.params.id);
    const archived = await repository.archive(id, getAccess(request, response));
    if (!archived) {
      throw new ApiError(404, 'CONTRACT_NOT_FOUND', 'Contract was not found');
    }
    response.status(204).send();
  };
}
