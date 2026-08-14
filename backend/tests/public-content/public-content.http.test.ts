import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { ContactLeadRepository } from '../../src/modules/contact/contact.repository.js';
import type { ProjectRepository } from '../../src/modules/projects/project.repository.js';
import type { PublicContentRepository } from '../../src/modules/public-content/public-content.repository.js';

function buildApp(publicContentRepository: PublicContentRepository) {
  const contactRepository: ContactLeadRepository = {
    createWithNotification: vi.fn(),
  };
  const projectRepository: ProjectRepository = {
    listPublished: vi.fn(),
    findPublishedById: vi.fn(),
  };

  return createApp({
    contactRepository,
    projectRepository,
    publicContentRepository,
    contactRateLimit: false,
    enableRequestLogging: false,
  });
}

describe('public content APIs', () => {
  it('returns paginated published capabilities', async () => {
    const repository: PublicContentRepository = {
      listCapabilities: vi.fn(async ({ page, pageSize }) => ({
        items: [
          {
            id: '77777777-7777-4777-8777-777777777777',
            title: 'An toàn thông tin',
            description: 'Bảo vệ hạ tầng và dữ liệu nhiều lớp.',
            iconUrl: null,
          },
        ],
        page,
        pageSize,
        totalItems: 1,
      })),
      listSolutions: vi.fn(),
      listMetrics: vi.fn(),
      getCompanyInfo: vi.fn(),
    };
    const response = await request(buildApp(repository)).get(
      '/api/capabilities?page=1&pageSize=10',
    );

    expect(response.status).toBe(200);
    expect(response.body.data[0].title).toBe('An toàn thông tin');
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('returns published problem-to-solution content', async () => {
    const repository: PublicContentRepository = {
      listCapabilities: vi.fn(),
      listSolutions: vi.fn(async ({ page, pageSize }) => ({
        items: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            problem: 'Hạ tầng phân mảnh',
            solution: 'Hiện đại hóa hạ tầng số',
            description: 'Chuẩn hóa kiến trúc và tài nguyên.',
          },
        ],
        page,
        pageSize,
        totalItems: 1,
      })),
      listMetrics: vi.fn(),
      getCompanyInfo: vi.fn(),
    };
    const response = await request(buildApp(repository)).get('/api/solutions');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      problem: 'Hạ tầng phân mảnh',
      solution: 'Hiện đại hóa hạ tầng số',
    });
  });

  it('returns current company information with an ISO timestamp', async () => {
    const repository: PublicContentRepository = {
      listCapabilities: vi.fn(),
      listSolutions: vi.fn(),
      listMetrics: vi.fn(),
      getCompanyInfo: vi.fn(async () => ({
        about: 'QTS protects digital operations.',
        vision: 'Đối tác công nghệ tin cậy.',
        mission: 'Kiến tạo giải pháp thực tiễn.',
        address: 'Hà Nội, Việt Nam',
        hotline: '+842473000888',
        updatedAt: new Date('2026-08-13T13:00:00.000Z'),
      })),
    };
    const response = await request(buildApp(repository)).get('/api/company-info');

    expect(response.status).toBe(200);
    expect(response.body.data.about).toBe('QTS protects digital operations.');
    expect(response.body.data.updatedAt).toBe('2026-08-13T13:00:00.000Z');
  });

  it('returns paginated published metrics', async () => {
    const repository: PublicContentRepository = {
      listCapabilities: vi.fn(),
      listSolutions: vi.fn(),
      listMetrics: vi.fn(async ({ page, pageSize }) => ({
        items: [
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            key: 'projects_delivered',
            label: 'Projects delivered',
            value: '250',
            suffix: '+',
          },
        ],
        page,
        pageSize,
        totalItems: 1,
      })),
      getCompanyInfo: vi.fn(),
    };

    const response = await request(buildApp(repository)).get(
      '/api/metrics?page=2&pageSize=5',
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({ key: 'projects_delivered', suffix: '+' }),
    ]);
    expect(response.body.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('returns 404 when company information has not been configured', async () => {
    const repository: PublicContentRepository = {
      listCapabilities: vi.fn(),
      listSolutions: vi.fn(),
      listMetrics: vi.fn(),
      getCompanyInfo: vi.fn(async () => null),
    };
    const response = await request(buildApp(repository)).get('/api/company-info');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('COMPANY_INFO_NOT_FOUND');
  });
});
