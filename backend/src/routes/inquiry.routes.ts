import { Router } from "express";
import * as ctrl from "../controllers/inquiry.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createInquirySchema, respondInquirySchema } from "../validators/workflow.validators";
import { ADMIN_ROLES } from "../utils/roles";

const router = Router();
router.use(authenticate);

router.post("/", validateBody(createInquirySchema), ctrl.createInquiry);
router.get("/mine", ctrl.listMyInquiries);
router.get("/", requireRole(...ADMIN_ROLES), ctrl.listAllInquiries);
router.post("/:id/respond", validateBody(respondInquirySchema), ctrl.respondToInquiry);
router.post("/:id/close", ctrl.closeInquiry);

export default router;
