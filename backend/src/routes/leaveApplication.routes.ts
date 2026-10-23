import { Router } from "express";
import * as ctrl from "../controllers/leaveApplication.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createLeaveApplicationSchema, reviewLeaveApplicationSchema } from "../validators/workflow.validators";
import { ADMIN_ROLES, ROLES } from "../utils/roles";

const router = Router();
router.use(authenticate);

router.post("/", validateBody(createLeaveApplicationSchema), ctrl.createLeaveApplication);
router.get("/mine", ctrl.listMyLeaveApplications);
// Teachers get a read-only, associated-students-only view (scoped inside the controller);
// only admins can reach the unscoped list or review/decide an application.
router.get("/", requireRole(...ADMIN_ROLES, ROLES.TEACHER), ctrl.listAllLeaveApplications);
router.post("/:id/review", requireRole(...ADMIN_ROLES), validateBody(reviewLeaveApplicationSchema), ctrl.reviewLeaveApplication);

export default router;
