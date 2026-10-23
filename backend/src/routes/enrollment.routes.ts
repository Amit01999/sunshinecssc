import { Router } from "express";
import { Enrollment } from "../models/Enrollment.model";
import { createCrudController } from "../utils/crudFactory";
import { authenticate, requireRole } from "../middleware/auth";
import { STAFF_ROLES } from "../utils/roles";

const ctrl = createCrudController(Enrollment, {
  targetType: "Enrollment",
  populate: ["studentId", "classId", "sectionId"],
});
const router = Router();

router.use(authenticate, requireRole(...STAFF_ROLES));
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);

export default router;
