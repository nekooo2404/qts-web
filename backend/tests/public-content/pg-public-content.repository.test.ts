import { describe, expect, it, vi } from 'vitest';

import type { DatabasePool } from '../../src/database/database.types.js';
import { PgPublicContentRepository } from '../../src/modules/public-content/pg-public-content.repository.js';

describe('PgPublicContentRepository', () => {
  it('lists only published metrics with stable pagination ordering', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            key: 'projects_delivered',
            label: 'Projects delivered',
            value: '250',
            suffix: '+',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: '1' }] });
    const repository = new PgPublicContentRepository({
      query,
    } as unknown as DatabasePool);

    await expect(repository.listMetrics({ page: 2, pageSize: 5 })).resolves.toEqual({
      items: [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          key: 'projects_delivered',
          label: 'Projects delivered',
          value: '250',
          suffix: '+',
        },
      ],
      page: 2,
      pageSize: 5,
      totalItems: 1,
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(
        /cms_metrics[\s\S]+status = 'PUBLISHED'[\s\S]+ORDER BY sort_order ASC, published_at DESC, id ASC/,
      ),
      [5, 5],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/cms_metrics[\s\S]+status = 'PUBLISHED'/),
    );
  });

  it('maps About content from the company singleton', async () => {
    const updatedAt = new Date('2026-08-13T13:00:00.000Z');
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          about: 'QTS company story',
          vision: 'Trusted technology partner',
          mission: 'Build practical solutions',
          address: 'Ha Noi, Viet Nam',
          hotline: '+842473000888',
          updated_at: updatedAt,
        },
      ],
    });
    const repository = new PgPublicContentRepository({
      query,
    } as unknown as DatabasePool);

    await expect(repository.getCompanyInfo()).resolves.toEqual({
      about: 'QTS company story',
      vision: 'Trusted technology partner',
      mission: 'Build practical solutions',
      address: 'Ha Noi, Viet Nam',
      hotline: '+842473000888',
      updatedAt,
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT about,'));
  });
});
