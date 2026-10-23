import { Router } from "express";
import * as ctrl from "../controllers/learningMaterial.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createLearningMaterialSchema } from "../validators/learningMaterial.validators";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.listMaterials);
router.post("/", requireRole(ROLES.TEACHER), validateBody(createLearningMaterialSchema), ctrl.createMaterial);
router.patch("/:id", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), ctrl.updateMaterial);
router.delete("/:id", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), ctrl.deleteMaterial);
router.post("/:id/files", requireRole(ROLES.TEACHER, ...ADMIN_ROLES), uploadSingle("file"), ctrl.uploadMaterialFile);

export default router;
