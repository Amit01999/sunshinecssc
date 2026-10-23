import { Router } from "express";
import { AuditLog } from "../models/AuditLog.model";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, paginationMeta } from "../utils/ApiResponse";
import { parsePagination } from "../utils/pagination";
import { ADMIN_ROLES } from "../utils/roles";

const router = Router();
router.use(authenticate, requireRole(...ADMIN_ROLES));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter: Record<string, unknown> = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.actorId) filter.actorId = req.query.actorId;

    const [items, total] = await Promise.all([
      AuditLog.find(filter).populate("actorId", "email role").sort(sort).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    return ok(res, items, paginationMeta(page, limit, total));
  }),
);

export default router;
