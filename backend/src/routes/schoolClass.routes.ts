import { Router } from "express";
import { SchoolClass } from "../models/SchoolClass.model";
import { createCrudController } from "../utils/crudFactory";
import * as classCtrl from "../controllers/schoolClass.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { schoolClassSchema, sectionSchema, transferStudentSchema } from "../validators/academics.validators";
import { ADMIN_ROLES, STAFF_ROLES } from "../utils/roles";

const ctrl = createCrudController(SchoolClass, { targetType: "SchoolClass", populate: "classTeacherId" });
const router = Router();

router.get("/public", classCtrl.publicList);

router.use(authenticate);

router.get("/", requireRole(...STAFF_ROLES), ctrl.list);
router.get("/:id", requireRole(...STAFF_ROLES), ctrl.getOne);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(schoolClassSchema), ctrl.create);
router.patch("/:id", requireRole(...ADMIN_ROLES), ctrl.update);
router.delete("/:id", requireRole(...ADMIN_ROLES), ctrl.remove);

router.get("/:classId/sections", requireRole(...STAFF_ROLES), classCtrl.listSections);
router.post("/:classId/sections", requireRole(...ADMIN_ROLES), validateBody(sectionSchema), classCtrl.createSection);
router.patch("/:classId/sections/:sectionId", requireRole(...ADMIN_ROLES), classCtrl.updateSection);
router.delete("/:classId/sections/:sectionId", requireRole(...ADMIN_ROLES), classCtrl.deleteSection);

router.get("/:classId/roster", requireRole(...STAFF_ROLES), classCtrl.classRoster);
router.post(
  "/students/:studentId/transfer",
  requireRole(...ADMIN_ROLES),
  validateBody(transferStudentSchema),
  classCtrl.transferStudent,
);

export default router;
