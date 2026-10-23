import { Router } from "express";
import * as ctrl from "../controllers/profile.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  updateOwnProfileSchema,
  profileChangeRequestSchema,
  reviewProfileChangeSchema,
} from "../validators/profile.validators";
import { ADMIN_ROLES, ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const router = Router();
router.use(authenticate);

router.get("/me", ctrl.getMyProfile);
router.patch("/me", validateBody(updateOwnProfileSchema), ctrl.updateMyContactInfo);
router.post("/me/photo", uploadSingle("image"), ctrl.uploadMyPhoto);

router.post("/me/change-requests", validateBody(profileChangeRequestSchema), ctrl.submitProfileChangeRequest);
router.get("/me/change-requests", ctrl.listMyProfileChangeRequests);

router.get("/change-requests", requireRole(...ADMIN_ROLES), ctrl.adminListProfileChangeRequests);
router.post(
  "/change-requests/:id/review",
  requireRole(...ADMIN_ROLES),
  validateBody(reviewProfileChangeSchema),
  ctrl.reviewProfileChangeRequest,
);

router.get("/children/:studentId", requireRole(ROLES.PARENT), ctrl.getChild);

export default router;
