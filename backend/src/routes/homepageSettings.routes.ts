import { Router } from "express";
import * as ctrl from "../controllers/homepageSettings.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { heroSlideSchema, messagesSectionTitleSchema, messageCardSchema } from "../validators/cms.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const router = Router();

router.get("/public", ctrl.publicGet);

router.use(authenticate, requireRole(...ADMIN_ROLES));
router.get("/", ctrl.adminGet);
router.post("/draft/slides", uploadSingle("image"), ctrl.addSlide);
router.patch("/draft/slides/:index", validateBody(heroSlideSchema), ctrl.updateSlide);
router.post("/draft/slides/:index/image", uploadSingle("image"), ctrl.replaceSlideImage);
router.delete("/draft/slides/:index", ctrl.removeSlide);
router.post("/draft/slides/reorder", ctrl.reorderSlides);
router.patch("/draft/messages-section", validateBody(messagesSectionTitleSchema), ctrl.updateMessagesSectionTitle);
router.patch("/draft/messages-section/cards/:index", validateBody(messageCardSchema), ctrl.updateMessageCard);
router.post("/draft/messages-section/cards/:index/image", uploadSingle("image"), ctrl.replaceMessageCardImage);
router.delete("/draft/messages-section/cards/:index/image", ctrl.removeMessageCardImage);
router.post("/publish", ctrl.publishDraft);
router.post("/discard-draft", ctrl.discardDraft);

export default router;
