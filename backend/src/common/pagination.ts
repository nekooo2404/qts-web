import { z } from 'zod';

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
}

export function toPaginatedResponse<T>(result: PaginationResult<T>) {
  return {
    data: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
      totalPages:
        result.totalItems === 0 ? 0 : Math.ceil(result.totalItems / result.pageSize),
    },
  };
}
