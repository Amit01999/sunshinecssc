import { Router } from "express";
import * as ctrl from "../controllers/notice.controller";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createNoticeSchema } from "../validators/content.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const router = Router();

router.get("/public", optionalAuthenticate, ctrl.listVisibleNotices);

router.use(authenticate);
router.get("/mine", ctrl.listVisibleNotices);
router.get("/admin", requireRole(...ADMIN_ROLES), ctrl.adminListNotices);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(createNoticeSchema), ctrl.createNotice);
router.patch("/:id", requireRole(...ADMIN_ROLES), ctrl.updateNotice);
router.delete("/:id", requireRole(...ADMIN_ROLES), ctrl.deleteNotice);
router.post("/:id/attachments", requireRole(...ADMIN_ROLES), uploadSingle("file"), ctrl.uploadNoticeAttachment);

export default router;
