import { Response } from "express";

export function ok<T>(res: Response, data: T, meta?: unknown, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, meta });
}

export function created<T>(res: Response, data: T, meta?: unknown) {
  return ok(res, data, meta, 201);
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
