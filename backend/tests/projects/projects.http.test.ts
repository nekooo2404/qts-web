import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { ContactLeadRepository } from '../../src/modules/contact/contact.repository.js';
import type { PublicContentRepository } from '../../src/modules/public-content/public-content.repository.js';
import type { ProjectRepository } from '../../src/modules/projects/project.repository.js';

function buildApp(projectRepository: ProjectRepository) {
  const contactRepository: ContactLeadRepository = {
    createWithNotification: vi.fn(),
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

describe('GET /api/projects', () => {
  it('returns a paginated public project list', async () => {
    const listPublished = vi.fn(async () => ({
      items: [
        {
          id: 'ef3856b6-7e74-4667-b4fa-8308cdfd405d',
          title: 'Trung tâm điều hành an ninh mạng',
          description: 'Nền tảng giám sát tập trung.',
          imageUrl: 'https://cdn.example.com/soc.webp',
          category: 'Cybersecurity',
          publishedAt: new Date('2026-08-10T08:00:00.000Z'),
        },
      ],
      page: 1,
      pageSize: 12,
      totalItems: 1,
    }));
    const projectRepository: ProjectRepository = {
      listPublished,
      findPublishedById: vi.fn(),
    };
    const app = buildApp(projectRepository);

    const response = await request(app).get('/api/projects?category=Cybersecurity');

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 12,
      totalItems: 1,
      totalPages: 1,
    });
    expect(response.body.data[0]).toEqual({
      id: 'ef3856b6-7e74-4667-b4fa-8308cdfd405d',
      title: 'Trung tâm điều hành an ninh mạng',
      description: 'Nền tảng giám sát tập trung.',
      imageUrl: 'https://cdn.example.com/soc.webp',
      category: 'Cybersecurity',
      publishedAt: '2026-08-10T08:00:00.000Z',
    });
    expect(listPublished).toHaveBeenCalledWith({
      page: 1,
      pageSize: 12,
      category: 'Cybersecurity',
    });
  });

  it('does not allow public callers to request draft records', async () => {
    const projectRepository: ProjectRepository = {
      listPublished: vi.fn(),
      findPublishedById: vi.fn(),
    };
    const app = buildApp(projectRepository);

    const response = await request(app).get('/api/projects?status=DRAFT');

    expect(response.status).toBe(422);
    expect(projectRepository.listPublished).not.toHaveBeenCalled();
  });

  it('caps pageSize through validation', async () => {
    const projectRepository: ProjectRepository = {
      listPublished: vi.fn(),
      findPublishedById: vi.fn(),
    };
    const app = buildApp(projectRepository);

    const response = await request(app).get('/api/projects?pageSize=51');

    expect(response.status).toBe(422);
  });
});

describe('GET /api/projects/:id', () => {
  it('returns one published project', async () => {
    const id = 'ef3856b6-7e74-4667-b4fa-8308cdfd405d';
    const projectRepository: ProjectRepository = {
      listPublished: vi.fn(),
      findPublishedById: vi.fn(async () => ({
        id,
        title: 'Trung tâm điều hành an ninh mạng',
        description: 'Nền tảng giám sát tập trung.',
        imageUrl: 'https://cdn.example.com/soc.webp',
        category: 'Cybersecurity',
        publishedAt: new Date('2026-08-10T08:00:00.000Z'),
      })),
    };

    const response = await request(buildApp(projectRepository)).get(
      `/api/projects/${id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(id);
  });

  it('returns the same 404 for missing or non-published projects', async () => {
    const projectRepository: ProjectRepository = {
      listPublished: vi.fn(),
      findPublishedById: vi.fn(async () => null),
    };
    const response = await request(buildApp(projectRepository)).get(
      '/api/projects/ef3856b6-7e74-4667-b4fa-8308cdfd405d',
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
  });
});
