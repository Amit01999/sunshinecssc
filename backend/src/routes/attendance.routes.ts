import { Router } from "express";
import * as ctrl from "../controllers/attendance.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  markAttendanceSchema,
  updateAttendanceSchema,
  attendanceCorrectionRequestSchema,
  reviewCorrectionSchema,
} from "../validators/attendance.validators";
import { ADMIN_ROLES, ROLES } from "../utils/roles";

const router = Router();
router.use(authenticate);

router.post("/", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), validateBody(markAttendanceSchema), ctrl.markAttendance);
router.get("/", ctrl.listAttendance);
router.get("/admin-summary", requireRole(...ADMIN_ROLES), ctrl.attendanceAdminSummary);
router.get("/student/:studentId/summary", ctrl.attendanceSummary);
router.get("/student/:studentId/years", ctrl.attendanceYearOptions);
router.patch("/:id", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), validateBody(updateAttendanceSchema), ctrl.updateAttendanceRecord);

router.post(
  "/corrections",
  requireRole(ROLES.TEACHER, ...ADMIN_ROLES),
  validateBody(attendanceCorrectionRequestSchema),
  ctrl.requestCorrection,
);
router.get("/corrections", requireRole(...ADMIN_ROLES), ctrl.listCorrectionRequests);
router.post(
  "/corrections/:id/review",
  requireRole(...ADMIN_ROLES),
  validateBody(reviewCorrectionSchema),
  ctrl.reviewCorrectionRequest,
);

export default router;
