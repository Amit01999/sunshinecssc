import { Router } from "express";
import { Department } from "../models/Department.model";
import { createCrudController } from "../utils/crudFactory";
import * as deptCtrl from "../controllers/department.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { departmentSchema } from "../validators/academics.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const ctrl = createCrudController(Department, { targetType: "Department", searchFields: ["name"] });
const router = Router();

router.get("/public", deptCtrl.publicList);

router.use(authenticate, requireRole(...ADMIN_ROLES));
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validateBody(departmentSchema), ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/image", uploadSingle("image"), deptCtrl.uploadDepartmentImage);

export default router;
