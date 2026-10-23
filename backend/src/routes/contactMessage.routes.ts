import { Router } from "express";
import { z } from "zod";
import { ContactMessage } from "../models/ContactMessage.model";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { writeRateLimiter } from "../middleware/rateLimiters";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, paginationMeta } from "../utils/ApiResponse";
import { parsePagination } from "../utils/pagination";
import { ADMIN_ROLES } from "../utils/roles";

const createContactMessageSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
});

const router = Router();

router.post(
  "/",
  writeRateLimiter,
  validateBody(createContactMessageSchema),
  asyncHandler(async (req, res) => {
    const contactMessage = await ContactMessage.create(req.body);
    return created(res, { id: contactMessage._id, message: "Thank you — your message has been received." });
  }),
);

router.use(authenticate, requireRole(...ADMIN_ROLES));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter: Record<string, unknown> = {};
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";
    const [items, total] = await Promise.all([
      ContactMessage.find(filter).sort(sort).skip(skip).limit(limit),
      ContactMessage.countDocuments(filter),
    ]);
    return ok(res, items, paginationMeta(page, limit, total));
  }),
);

router.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    return ok(res, msg);
  }),
);

export default router;
