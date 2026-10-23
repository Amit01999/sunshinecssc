import { Router } from "express";
import { teacherCreateStudent, teacherResetStudentPassword, listParentAccountsForTeacher } from "../controllers/teacherStudent.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { teacherCreateStudentSchema } from "../validators/user.validators";
import { ROLES } from "../utils/roles";

const router = Router();

router.use(authenticate, requireRole(ROLES.TEACHER));
router.post("/", validateBody(teacherCreateStudentSchema), teacherCreateStudent);
router.post("/:studentId/reset-password", teacherResetStudentPassword);
router.get("/parents", listParentAccountsForTeacher);

export default router;
