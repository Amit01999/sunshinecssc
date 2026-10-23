import { Router } from "express";
import * as ctrl from "../controllers/admission.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createAdmissionApplicationSchema, reviewAdmissionSchema } from "../validators/workflow.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { writeRateLimiter } from "../middleware/rateLimiters";
import { uploadSingle } from "../middleware/upload";

const router = Router();

// Public: anyone can apply, and attach documents to their own application, without an account.
router.post("/", writeRateLimiter, validateBody(createAdmissionApplicationSchema), ctrl.submitApplication);
router.post("/:id/documents", writeRateLimiter, uploadSingle("file"), ctrl.uploadApplicationDocument);

router.use(authenticate, requireRole(...ADMIN_ROLES));
router.get("/", ctrl.listApplications);
router.get("/:id", ctrl.getApplication);
router.post("/:id/review", validateBody(reviewAdmissionSchema), ctrl.reviewApplication);

export default router;
