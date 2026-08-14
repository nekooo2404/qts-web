import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middleware/error-handler.js';
import {
  createContractController,
  deleteContractController,
  listContractsController,
  updateContractController,
} from '../../src/modules/contracts/contract.controller.js';
import type { ContractRepository } from '../../src/modules/contracts/contract.repository.js';

const contract = {
  id: '7f9a956f-48ec-45f1-9300-7086f8aaf406',
  contractNumber: 'QTS-2026-001',
  title: 'Managed security service',
  clientName: 'Example Company',
  ownerId: '67048d7d-d3a2-4a13-8cf1-e27c258325e1',
  templateId: null,
  status: 'DRAFT' as const,
  currency: 'VND',
  valueAmount: '1000000.00',
  effectiveDate: null,
  expiresAt: null,
  data: { service: 'SOC' },
  version: 1,
  createdAt: new Date('2026-08-13T12:00:00.000Z'),
  updatedAt: new Date('2026-08-13T12:00:00.000Z'),
};

function repository(overrides: Partial<ContractRepository> = {}): ContractRepository {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    ...overrides,
  };
}

function appFor(register: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  register(app);
  app.use(errorHandler);
  return app;
}

describe('contract admin controllers', () => {
  const actorId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';
  const adminAccess = { actorId, canManageAll: true };

  it('lists company contracts with stable pagination', async () => {
    const list = vi.fn(async () => ({
      items: [contract],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    }));
    const listWithAccess: ContractRepository['list'] = list;
    const repo = repository({ list: listWithAccess });
    const app = appFor((instance) => {
      instance.get(
        '/contracts',
        listContractsController(repo, () => adminAccess),
      );
    });

    const response = await request(app).get('/contracts?status=DRAFT');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      id: contract.id,
      valueAmount: '1000000.00',
      createdAt: '2026-08-13T12:00:00.000Z',
    });
    expect(response.body.pagination.totalPages).toBe(1);
    expect(list).toHaveBeenCalledWith(adminAccess, {
      page: 1,
      pageSize: 20,
      status: 'DRAFT',
    });
  });

  it('rejects unknown create fields before writing', async () => {
    const create = vi.fn();
    const repo = repository({ create });
    const app = appFor((instance) => {
      instance.post(
        '/contracts',
        createContractController(repo, () => adminAccess),
      );
    });

    const response = await request(app).post('/contracts').send({
      contractNumber: 'QTS-2026-001',
      title: 'Managed security service',
      clientName: 'Example Company',
      ownerId: contract.ownerId,
      unexpected: true,
    });

    expect(response.status).toBe(422);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns a stable error for an unavailable owner or template', async () => {
    const create = vi.fn(async () => ({ kind: 'context_unavailable' as const }));
    const repo = repository({ create });
    const app = appFor((instance) => {
      instance.post(
        '/contracts',
        createContractController(repo, () => adminAccess),
      );
    });

    const response = await request(app).post('/contracts').send({
      contractNumber: 'QTS-2026-009',
      title: 'Unavailable context',
      clientName: 'Example Company',
      ownerId: contract.ownerId,
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('CONTRACT_CONTEXT_UNAVAILABLE');
  });

  it('uses optimistic concurrency for updates', async () => {
    const update = vi.fn(async () => ({ kind: 'version_conflict' as const }));
    const repo = repository({ update });
    const app = appFor((instance) => {
      instance.patch(
        '/contracts/:id',
        updateContractController(
          repo,
          () => adminAccess,
        ),
      );
    });

    const response = await request(app)
      .patch(`/contracts/${contract.id}`)
      .send({ title: 'Updated title', version: 2 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONTRACT_VERSION_CONFLICT');
    expect(update).toHaveBeenCalledWith(
      contract.id,
      { title: 'Updated title' },
      2,
      adminAccess,
    );
  });

  it('validates a partial date update against the stored contract', async () => {
    const findById = vi.fn(async () => ({
      ...contract,
      effectiveDate: '2026-08-01',
      expiresAt: '2026-08-31',
    }));
    const update = vi.fn();
    const repo = repository({ findById, update });
    const app = appFor((instance) => {
      instance.patch(
        '/contracts/:id',
        updateContractController(repo, () => adminAccess),
      );
    });

    const response = await request(app)
      .patch(`/contracts/${contract.id}`)
      .send({ effectiveDate: '2026-09-01', version: 1 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('CONTRACT_DATE_RANGE_INVALID');
    expect(update).not.toHaveBeenCalled();
  });

  it('archives rather than physically deleting a contract', async () => {
    const archive = vi.fn(async () => true);
    const repo = repository({ archive });
    const app = appFor((instance) => {
      instance.delete(
        '/contracts/:id',
        deleteContractController(
          repo,
          () => adminAccess,
        ),
      );
    });

    const response = await request(app).delete(`/contracts/${contract.id}`);

    expect(response.status).toBe(204);
    expect(archive).toHaveBeenCalledWith(
      contract.id,
      adminAccess,
    );
  });

  it('prevents an employee from creating a contract for another owner', async () => {
    const create = vi.fn();
    const repo = repository({ create });
    const employeeAccess = { actorId, canManageAll: false };
    const app = appFor((instance) => {
      instance.post(
        '/contracts',
        createContractController(repo, () => employeeAccess),
      );
    });

    const response = await request(app).post('/contracts').send({
      contractNumber: 'QTS-2026-002',
      title: 'Employee contract',
      clientName: 'Example Company',
      ownerId: contract.ownerId,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(create).not.toHaveBeenCalled();
  });

  it('prevents an employee from transferring an owned contract', async () => {
    const update = vi.fn();
    const repo = repository({ update });
    const employeeAccess = { actorId, canManageAll: false };
    const app = appFor((instance) => {
      instance.patch(
        '/contracts/:id',
        updateContractController(repo, () => employeeAccess),
      );
    });

    const response = await request(app)
      .patch(`/contracts/${contract.id}`)
      .send({ ownerId: contract.ownerId, version: 1 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(update).not.toHaveBeenCalled();
  });
});
