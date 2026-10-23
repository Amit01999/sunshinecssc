import { Router } from "express";
import * as ctrl from "../controllers/newsArticle.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createNewsArticleSchema, updateNewsArticleSchema } from "../validators/content.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { uploadSingle } from "../middleware/upload";

const router = Router();

router.get("/public", ctrl.publicListArticles);
router.get("/public/:slug", ctrl.publicGetArticle);

router.use(authenticate, requireRole(...ADMIN_ROLES));
router.get("/", ctrl.adminListArticles);
router.post("/", validateBody(createNewsArticleSchema), ctrl.createArticle);
router.patch("/:id", validateBody(updateNewsArticleSchema), ctrl.updateArticle);
router.delete("/:id", ctrl.deleteArticle);
router.post("/:id/image", uploadSingle("image"), ctrl.uploadFeaturedImage);
router.delete("/:id/image", ctrl.removeFeaturedImage);

export default router;
