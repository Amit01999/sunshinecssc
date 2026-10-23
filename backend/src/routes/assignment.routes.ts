import { Router } from "express";
import * as ctrl from "../controllers/assignment.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createAssignmentSchema, updateAssignmentSchema, gradeSubmissionSchema } from "../validators/assignment.validators";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { uploadSingle, uploadMultiple } from "../middleware/upload";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.listAssignments);
router.post("/", requireRole(ROLES.TEACHER), validateBody(createAssignmentSchema), ctrl.createAssignment);
router.get("/:id", ctrl.getAssignment);
router.patch("/:id", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), validateBody(updateAssignmentSchema), ctrl.updateAssignment);
router.delete("/:id", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), ctrl.deleteAssignment);
router.post("/:id/attachments", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), uploadSingle("file"), ctrl.uploadAssignmentAttachment);

router.post("/:id/submit", requireRole(ROLES.STUDENT), uploadMultiple("files"), ctrl.submitAssignment);
router.get("/:id/submissions", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), ctrl.listSubmissions);
router.post(
  "/submissions/:submissionId/grade",
  requireRole(ROLES.TEACHER, ...ADMIN_ROLES),
  validateBody(gradeSubmissionSchema),
  ctrl.gradeSubmission,
);
router.post("/submissions/:submissionId/return", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), ctrl.returnSubmission);

export default router;
