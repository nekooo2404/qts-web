import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middleware/error-handler.js';
import {
  assignLeadController,
  listAssignedLeadsController,
} from '../../src/modules/leads/lead.controller.js';
import type { LeadRepository } from '../../src/modules/leads/lead.repository.js';

describe('GET assigned employee leads', () => {
  it('scopes the repository query to the authenticated employee', async () => {
    const listAssigned = vi.fn(async () => ({
      items: [
        {
          id: 'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c',
          customerName: 'Nguyen Minh Anh',
          phone: '+84901234567',
          email: 'customer@example.com',
          message: 'Can tu van giai phap SOC cho doanh nghiep.',
          status: 'IN_PROGRESS' as const,
          assignedAt: new Date('2026-08-13T13:00:00.000Z'),
          version: 2,
          createdAt: new Date('2026-08-13T12:00:00.000Z'),
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    }));
    const repository: LeadRepository = { listAssigned, assign: vi.fn() };
    const app = express();
    app.get(
      '/leads/assigned',
      listAssignedLeadsController(
        repository,
        () => '67048d7d-d3a2-4a13-8cf1-e27c258325e1',
      ),
    );
    app.use(errorHandler);

    const response = await request(app).get(
      '/leads/assigned?employeeId=51f96baa-8e5c-4261-b6fb-4234d0fb422b',
    );

    expect(response.status).toBe(422);
    expect(listAssigned).not.toHaveBeenCalled();

    const validResponse = await request(app).get('/leads/assigned?status=IN_PROGRESS');
    expect(validResponse.status).toBe(200);
    expect(validResponse.body.data[0].assignedAt).toBe(
      '2026-08-13T13:00:00.000Z',
    );
    expect(listAssigned).toHaveBeenCalledWith(
      '67048d7d-d3a2-4a13-8cf1-e27c258325e1',
      { page: 1, pageSize: 20, status: 'IN_PROGRESS' },
    );
  });
});

describe('PUT admin lead assignee', () => {
  const leadId = 'cdaaf764-2a3f-46f2-a94f-6bc9382f3d5c';
  const adminId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';
  const employeeId = '67048d7d-d3a2-4a13-8cf1-e27c258325e1';

  function appFor(repository: LeadRepository) {
    const app = express();
    app.use(express.json());
    app.put('/admin/leads/:id/assignee', assignLeadController(repository, () => adminId));
    app.use(errorHandler);
    return app;
  }

  it('returns assignment metadata without returning lead PII', async () => {
    const assign = vi.fn(async () => ({
      kind: 'updated' as const,
      assignment: {
        leadId,
        assignedTo: employeeId,
        assignedBy: adminId,
        assignedAt: new Date('2026-08-13T14:00:00.000Z'),
        version: 3,
      },
    }));
    const repository: LeadRepository = { listAssigned: vi.fn(), assign };

    const response = await request(appFor(repository))
      .put(`/admin/leads/${leadId}/assignee`)
      .send({ assigneeId: employeeId, version: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        leadId,
        assignedTo: employeeId,
        assignedBy: adminId,
        assignedAt: '2026-08-13T14:00:00.000Z',
        version: 3,
      },
    });
    expect(response.body.data).not.toHaveProperty('email');
    expect(response.body.data).not.toHaveProperty('phone');
    expect(response.body.data).not.toHaveProperty('message');
    expect(assign).toHaveBeenCalledWith(leadId, employeeId, 2, adminId);
  });

  it('returns 409 when another request already changed the assignment', async () => {
    const repository: LeadRepository = {
      listAssigned: vi.fn(),
      assign: vi.fn(async () => ({ kind: 'version_conflict' as const })),
    };

    const response = await request(appFor(repository))
      .put(`/admin/leads/${leadId}/assignee`)
      .send({ assigneeId: null, version: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LEAD_VERSION_CONFLICT');
  });

  it('rejects unknown payload fields before repository access', async () => {
    const assign = vi.fn();
    const repository: LeadRepository = { listAssigned: vi.fn(), assign };

    const response = await request(appFor(repository))
      .put(`/admin/leads/${leadId}/assignee`)
      .send({ assigneeId: employeeId, version: 1, status: 'CLOSED' });

    expect(response.status).toBe(422);
    expect(assign).not.toHaveBeenCalled();
  });
});
