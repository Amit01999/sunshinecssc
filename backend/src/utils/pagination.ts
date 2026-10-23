import { Request } from "express";

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
}

export function parsePagination(req: Request, defaultSort = "-createdAt"): ParsedPagination {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const sortParam = typeof req.query.sort === "string" ? req.query.sort : defaultSort;
  const sort: Record<string, 1 | -1> = {};
  sortParam
    .split(",")
    .filter(Boolean)
    .forEach((field) => {
      if (field.startsWith("-")) {
        sort[field.slice(1)] = -1;
      } else {
        sort[field] = 1;
      }
    });

  return { page, limit, skip, sort };
}
