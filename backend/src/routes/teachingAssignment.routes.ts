import { Router } from "express";
import { TeachingAssignment } from "../models/TeachingAssignment.model";
import { TeacherProfile } from "../models/TeacherProfile.model";
import { createCrudController } from "../utils/crudFactory";
import { createTeachingAssignment } from "../controllers/teachingAssignment.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { teachingAssignmentSchema } from "../validators/academics.validators";
import { ADMIN_ROLES, ROLES } from "../utils/roles";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/ApiResponse";

const ctrl = createCrudController(TeachingAssignment, {
  targetType: "TeachingAssignment",
  populate: ["classId", "sectionId", "subjectId", "teacherId"],
});
const router = Router();

router.use(authenticate);

router.get(
  "/mine",
  requireRole(ROLES.TEACHER),
  asyncHandler(async (req, res) => {
    const teacherProfile = await TeacherProfile.findOne({ userId: req.user!.id });
    if (!teacherProfile) return ok(res, []);
    const assignments = await TeachingAssignment.find({ teacherId: teacherProfile._id }).populate([
      "classId",
      "sectionId",
      "subjectId",
    ]);
    return ok(res, assignments);
  }),
);

router.get("/", requireRole(...ADMIN_ROLES), ctrl.list);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(teachingAssignmentSchema), createTeachingAssignment);
router.delete("/:id", requireRole(...ADMIN_ROLES), ctrl.remove);

export default router;
