import { Router } from "express";
import * as ctrl from "../controllers/siteSettings.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { siteSettingsSchema } from "../validators/cms.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const router = Router();

router.get("/public", ctrl.publicGet);

router.use(authenticate, requireRole(...ADMIN_ROLES));
router.get("/", ctrl.adminGet);
router.patch("/", validateBody(siteSettingsSchema), ctrl.updateSettings);
router.post("/images/:target", uploadSingle("image"), ctrl.uploadLogo);

export default router;
