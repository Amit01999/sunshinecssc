import { Router } from "express";
import * as ctrl from "../controllers/examination.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createExaminationSchema, enterMarksSchema, reviewResultsSchema } from "../validators/examination.validators";
import { ROLES, ADMIN_ROLES } from "../utils/roles";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.listExaminations);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(createExaminationSchema), ctrl.createExamination);
router.get("/:id", ctrl.getExamination);
router.post("/:id/marks", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), validateBody(enterMarksSchema), ctrl.enterMarks);

router.get("/results/all", ctrl.listResults);
router.post(
  "/results/submit",
  requireRole(ROLES.TEACHER, ...ADMIN_ROLES),
  validateBody(reviewResultsSchema),
  ctrl.submitResultsForApproval,
);
router.post("/results/approve", requireRole(...ADMIN_ROLES), validateBody(reviewResultsSchema), ctrl.approveResults);
router.post("/results/reject", requireRole(...ADMIN_ROLES), validateBody(reviewResultsSchema), ctrl.rejectResults);
router.post(
  "/results/publish",
  requireRole(ROLES.TEACHER, ...ADMIN_ROLES),
  validateBody(reviewResultsSchema),
  ctrl.publishResults,
);

export default router;
