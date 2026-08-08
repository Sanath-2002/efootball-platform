import { Request } from 'express';
import { z } from 'zod';
import { badRequest } from './AppError';

export interface ListQuery {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export const parseListQuery = (req: Request, allowedSortFields: string[] = ['createdAt']): ListQuery => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const sortBy = allowedSortFields.includes(String(req.query.sortBy || ''))
    ? String(req.query.sortBy)
    : allowedSortFields[0];
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = req.query.search ? String(req.query.search).trim() : undefined;

  return { page, limit, skip: (page - 1) * limit, sortBy, sortOrder, search };
};

export const paginationMeta = (total: number, query: ListQuery) => ({
  page: query.page,
  limit: query.limit,
  total,
  totalPages: Math.ceil(total / query.limit) || 1,
});

export const parseUuid = (value: string, label = 'ID') => {
  const result = z.string().uuid().safeParse(value);
  if (!result.success) {
    throw badRequest(`Invalid ${label}`);
  }
  return result.data;
};
