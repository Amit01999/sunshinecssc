import { Router } from "express";
import * as ctrl from "../controllers/timetable.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createTimetableSlotSchema } from "../validators/timetable.validators";
import { ADMIN_ROLES } from "../utils/roles";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.listSlots);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(createTimetableSlotSchema), ctrl.createSlot);
router.patch("/:id", requireRole(...ADMIN_ROLES), ctrl.updateSlot);
router.delete("/:id", requireRole(...ADMIN_ROLES), ctrl.deleteSlot);
router.post("/classes/:classId/publish", requireRole(...ADMIN_ROLES), ctrl.publishClassTimetable);

export default router;
