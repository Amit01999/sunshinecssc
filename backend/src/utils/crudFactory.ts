import { Request, Response } from "express";
import { Model } from "mongoose";
import { asyncHandler } from "./asyncHandler";
import { ApiError } from "./ApiError";
import { ok, created, paginationMeta } from "./ApiResponse";
import { parsePagination } from "./pagination";
import { writeAuditLog } from "../models/AuditLog.model";

interface CrudOptions {
  targetType: string;
  searchFields?: string[];
  populate?: string | string[];
  /** Build an extra Mongo filter from the authenticated request (e.g. scoping by role). */
  scopeFilter?: (req: Request) => Record<string, unknown>;
}

export function createCrudController<T extends Record<string, unknown>>(model: Model<any>, options: CrudOptions) {
  const list = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter: Record<string, unknown> = { ...(options.scopeFilter?.(req) ?? {}) };

    for (const [key, value] of Object.entries(req.query)) {
      if (["page", "limit", "sort", "search"].includes(key) || value === undefined) continue;
      filter[key] = value;
    }

    if (req.query.search && options.searchFields?.length) {
      filter.$or = options.searchFields.map((field) => ({ [field]: new RegExp(String(req.query.search), "i") }));
    }

    let query = model.find(filter).sort(sort).skip(skip).limit(limit);
    if (options.populate) query = query.populate(options.populate as any);
    const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);
    return ok(res, items, paginationMeta(page, limit, total));
  });

  const getOne = asyncHandler(async (req: Request, res: Response) => {
    let query = model.findById(req.params.id);
    if (options.populate) query = query.populate(options.populate as any);
    const doc = await query;
    if (!doc) throw ApiError.notFound(`${options.targetType} not found`);
    return ok(res, doc);
  });

  const create = asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.create(req.body);
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: `${options.targetType.toLowerCase()}.create`,
      targetType: options.targetType,
      targetId: doc._id,
      after: req.body,
      ip: req.ip,
    });
    return created(res, doc);
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    const before = await model.findById(req.params.id).lean();
    if (!before) throw ApiError.notFound(`${options.targetType} not found`);
    const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: `${options.targetType.toLowerCase()}.update`,
      targetType: options.targetType,
      targetId: req.params.id,
      before,
      after: req.body,
      ip: req.ip,
    });
    return ok(res, doc);
  });

  const remove = asyncHandler(async (req: Request, res: Response) => {
    const doc = await model.findByIdAndDelete(req.params.id);
    if (!doc) throw ApiError.notFound(`${options.targetType} not found`);
    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: `${options.targetType.toLowerCase()}.delete`,
      targetType: options.targetType,
      targetId: req.params.id,
      before: doc,
      ip: req.ip,
    });
    return ok(res, { message: `${options.targetType} deleted` });
  });

  return { list, getOne, create, update, remove };
}
