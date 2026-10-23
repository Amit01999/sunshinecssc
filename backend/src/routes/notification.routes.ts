import { Router } from "express";
import { Notification } from "../models/Notification.model";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { userId: req.user!.id };
    if (req.query.unreadOnly === "true") filter.isRead = false;
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    const unreadCount = await Notification.countDocuments({ userId: req.user!.id, isRead: false });
    return ok(res, notifications, { unreadCount });
  }),
);

router.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { isRead: true },
      { new: true },
    );
    if (!notification) throw ApiError.notFound("Notification not found");
    return ok(res, notification);
  }),
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    return ok(res, { message: "All notifications marked as read" });
  }),
);

export default router;
