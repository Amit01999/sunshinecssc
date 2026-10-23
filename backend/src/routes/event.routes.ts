import { Router } from "express";
import * as ctrl from "../controllers/event.controller";
import { authenticate, optionalAuthenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createEventSchema } from "../validators/content.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const router = Router();

router.get("/public", optionalAuthenticate, ctrl.listVisibleEvents);

router.use(authenticate);
router.get("/mine", ctrl.listVisibleEvents);
router.get("/admin", requireRole(...ADMIN_ROLES), ctrl.adminListEvents);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(createEventSchema), ctrl.createEvent);
router.patch("/:id", requireRole(...ADMIN_ROLES), ctrl.updateEvent);
router.delete("/:id", requireRole(...ADMIN_ROLES), ctrl.deleteEvent);
router.post("/:id/image", requireRole(...ADMIN_ROLES), uploadSingle("image"), ctrl.uploadEventImage);

export default router;
