import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middleware/error-handler.js';
import {
  assignTaskController,
  changeTaskStatusController,
  createTaskController,
} from '../../src/modules/tasks/task.controller.js';
import type { TaskRepository } from '../../src/modules/tasks/task.repository.js';

const actorId = 'f23cd81e-f7ca-4e33-b104-1b3df1ea37a5';
const task = {
  id: 'cf08076a-45a8-432b-89ed-5870fcfd7b16',
  title: 'Review contract',
  description: null,
  status: 'TODO' as const,
  priority: 'MEDIUM' as const,
  assignedTo: null,
  contractId: null,
  leadId: null,
  dueAt: null,
  startedAt: null,
  completedAt: null,
  version: 1,
  createdBy: actorId,
  createdAt: new Date('2026-08-13T12:00:00.000Z'),
  updatedAt: new Date('2026-08-13T12:00:00.000Z'),
};

function repository(overrides: Partial<TaskRepository> = {}): TaskRepository {
  return {
    list: vi.fn(), findById: vi.fn(), create: vi.fn(), update: vi.fn(),
    archive: vi.fn(), assign: vi.fn(), changeStatus: vi.fn(), ...overrides,
  };
}

const access = () => ({ actorId, canManageAll: false });

function appFor(register: (app: express.Express) => void) {
  const app = express(); app.use(express.json()); register(app); app.use(errorHandler); return app;
}

describe('task management controllers', () => {
  it('creates a task and records the authenticated creator', async () => {
    const create = vi.fn(async () => ({ kind: 'created' as const, task }));
    const app = appFor((instance) => instance.post('/tasks', createTaskController(repository({ create }), access)));

    const response = await request(app).post('/tasks').send({ title: 'Review contract' });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Review contract' }),
      { actorId, canManageAll: false },
    );
  });

  it('returns a generic validation error for an inaccessible task context', async () => {
    const create = vi.fn(async () => ({ kind: 'context_unavailable' as const }));
    const app = appFor((instance) =>
      instance.post(
        '/tasks',
        createTaskController(repository({ create }), access),
      ),
    );

    const response = await request(app)
      .post('/tasks')
      .send({
        title: 'Review contract',
        contractId: '7f9a956f-48ec-45f1-9300-7086f8aaf406',
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('TASK_CONTEXT_UNAVAILABLE');
  });

  it('assigns a task with optimistic concurrency', async () => {
    const assignedTask = { ...task, assignedTo: '67048d7d-d3a2-4a13-8cf1-e27c258325e1', version: 2 };
    const assign = vi.fn(async () => ({ kind: 'updated' as const, task: assignedTask }));
    const app = appFor((instance) => instance.put('/tasks/:id/assignee', assignTaskController(repository({ assign }), () => actorId)));

    const response = await request(app)
      .put(`/tasks/${task.id}/assignee`)
      .send({ assigneeId: assignedTask.assignedTo, version: 1 });

    expect(response.status).toBe(200);
    expect(assign).toHaveBeenCalledWith(task.id, assignedTask.assignedTo, 1, actorId);
  });

  it('returns a stable error when the assignee is unavailable', async () => {
    const assign = vi.fn(async () => ({ kind: 'assignee_unavailable' as const }));
    const app = appFor((instance) =>
      instance.put(
        '/tasks/:id/assignee',
        assignTaskController(repository({ assign }), () => actorId),
      ),
    );

    const response = await request(app)
      .put(`/tasks/${task.id}/assignee`)
      .send({
        assigneeId: '67048d7d-d3a2-4a13-8cf1-e27c258325e1',
        version: 1,
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('TASK_ASSIGNEE_UNAVAILABLE');
  });

  it('does not allow a terminal task to be reassigned', async () => {
    const assign = vi.fn(async () => ({ kind: 'terminal_state' as const }));
    const app = appFor((instance) =>
      instance.put(
        '/tasks/:id/assignee',
        assignTaskController(repository({ assign }), () => actorId),
      ),
    );

    const response = await request(app)
      .put(`/tasks/${task.id}/assignee`)
      .send({ assigneeId: null, version: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TASK_TERMINAL_STATE');
  });

  it('rejects an invalid status transition before repository access', async () => {
    const changeStatus = vi.fn();
    const app = appFor((instance) => instance.put('/tasks/:id/status', changeTaskStatusController(repository({ changeStatus }), access)));

    const response = await request(app)
      .put(`/tasks/${task.id}/status`)
      .send({ fromStatus: 'TODO', status: 'DONE', version: 1 });

    expect(response.status).toBe(422);
    expect(changeStatus).not.toHaveBeenCalled();
  });
});
