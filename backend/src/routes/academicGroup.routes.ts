import { Router } from "express";
import { AcademicGroup } from "../models/AcademicGroup.model";
import { createCrudController } from "../utils/crudFactory";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { academicGroupSchema } from "../validators/academics.validators";
import { ADMIN_ROLES, STAFF_ROLES } from "../utils/roles";

const ctrl = createCrudController(AcademicGroup, { targetType: "AcademicGroup", populate: "classIds" });
const router = Router();

router.use(authenticate);
router.get("/", requireRole(...STAFF_ROLES), ctrl.list);
router.get("/:id", requireRole(...STAFF_ROLES), ctrl.getOne);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(academicGroupSchema), ctrl.create);
router.patch("/:id", requireRole(...ADMIN_ROLES), ctrl.update);
router.delete("/:id", requireRole(...ADMIN_ROLES), ctrl.remove);

export default router;
