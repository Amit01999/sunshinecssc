import { Router } from "express";
import * as ctrl from "../controllers/cmsPage.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { upsertCmsPageSchema } from "../validators/cms.validators";
import { ADMIN_ROLES } from "../utils/roles";

const router = Router();

router.get("/public/:pageKey", ctrl.publicGetPage);

router.use(authenticate, requireRole(...ADMIN_ROLES));
router.get("/", ctrl.adminListPageKeys);
router.get("/:pageKey", ctrl.adminGetPage);
router.put("/:pageKey", validateBody(upsertCmsPageSchema), ctrl.upsertPage);
router.post("/:pageKey/restore/:index", ctrl.restoreVersion);

export default router;
