import { Router } from "express";
import * as ctrl from "../controllers/adminUser.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createUserSchema, updateUserSchema, linkParentSchema } from "../validators/user.validators";
import { ADMIN_ROLES, ROLES } from "../utils/roles";

const router = Router();

router.use(authenticate);

router.get("/", requireRole(...ADMIN_ROLES), ctrl.listUsers);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(createUserSchema), ctrl.createUser);
router.get("/:id", requireRole(...ADMIN_ROLES), ctrl.getUser);
router.patch("/:id", requireRole(...ADMIN_ROLES), validateBody(updateUserSchema), ctrl.updateUser);
router.post("/:id/reset-password", requireRole(...ADMIN_ROLES), ctrl.resetUserPassword);

// Teachers may also reach these three - scoped inside the controller to students in a
// class/section they actually teach, unlike every other route in this file (admin-only).
router.post(
  "/students/:studentId/parents",
  requireRole(...ADMIN_ROLES, ROLES.TEACHER),
  validateBody(linkParentSchema),
  ctrl.linkParentToStudent,
);
router.get("/students/:studentId/parents", requireRole(...ADMIN_ROLES, ROLES.TEACHER), ctrl.listStudentParents);
router.delete(
  "/students/:studentId/parents/:parentId",
  requireRole(...ADMIN_ROLES, ROLES.TEACHER),
  ctrl.unlinkParentFromStudent,
);

export default router;
