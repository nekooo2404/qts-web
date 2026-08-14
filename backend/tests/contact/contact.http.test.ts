import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { ContactLeadRepository } from '../../src/modules/contact/contact.repository.js';
import type { PublicContentRepository } from '../../src/modules/public-content/public-content.repository.js';
import type { ProjectRepository } from '../../src/modules/projects/project.repository.js';

const validPayload = {
  customerName: 'Nguyễn Minh Anh',
  phone: '0901234567',
  email: 'minh.anh@example.com',
  message: 'Tôi cần tư vấn giải pháp chuyển đổi số.',
};

function buildApp(contactRepository: ContactLeadRepository) {
  const projectRepository: ProjectRepository = {
    listPublished: vi.fn(),
    findPublishedById: vi.fn(),
  };
  const publicContentRepository: PublicContentRepository = {
    listCapabilities: vi.fn(),
    listSolutions: vi.fn(),
    listMetrics: vi.fn(),
    getCompanyInfo: vi.fn(),
  };

  return createApp({
    contactRepository,
    projectRepository,
    publicContentRepository,
    contactRateLimit: false,
    enableRequestLogging: false,
  });
}

describe('POST /api/contact', () => {
  it('returns 201 without echoing lead PII', async () => {
    const createWithNotification = vi.fn(async () => ({
      id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
      status: 'NEW' as const,
      createdAt: new Date('2026-08-13T13:00:00.000Z'),
    }));
    const app = buildApp({ createWithNotification });

    const response = await request(app).post('/api/contact').send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: {
        id: '0e00e7a5-c3e4-4187-af18-8dc38a8128bf',
        status: 'NEW',
        createdAt: '2026-08-13T13:00:00.000Z',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(validPayload.email);
    expect(createWithNotification).toHaveBeenCalledWith({
      customerName: 'Nguyễn Minh Anh',
      phone: '+84901234567',
      email: 'minh.anh@example.com',
      message: validPayload.message,
    });
  });

  it('returns a structured 422 error for invalid input', async () => {
    const createWithNotification = vi.fn();
    const app = buildApp({ createWithNotification });

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, email: 'invalid' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.requestId).toEqual(expect.any(String));
    expect(createWithNotification).not.toHaveBeenCalled();
  });

  it('rejects non-JSON requests with 415', async () => {
    const app = buildApp({ createWithNotification: vi.fn() });

    const response = await request(app)
      .post('/api/contact')
      .type('form')
      .send(validPayload);

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns a generic service error without leaking database details', async () => {
    const app = buildApp({
      createWithNotification: vi.fn(async () => {
        throw new Error('password=secret postgres connection refused');
      }),
    });

    const response = await request(app).post('/api/contact').send(validPayload);

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('password=secret');
  });

  it('returns 400 for malformed JSON', async () => {
    const app = buildApp({ createWithNotification: vi.fn() });

    const response = await request(app)
      .post('/api/contact')
      .set('Content-Type', 'application/json')
      .send('{"customerName":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_JSON');
  });

  it('returns 413 when the JSON body exceeds 16 KiB', async () => {
    const app = buildApp({ createWithNotification: vi.fn() });

    const response = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, message: 'x'.repeat(17 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
