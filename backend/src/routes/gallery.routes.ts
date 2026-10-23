import { Router } from "express";
import * as ctrl from "../controllers/gallery.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createGalleryAlbumSchema, updateGalleryImageSchema } from "../validators/content.validators";
import { ADMIN_ROLES } from "../utils/roles";
import { uploadMultiple } from "../middleware/upload";

const router = Router();

router.get("/albums/public", ctrl.publicListAlbums);
router.get("/images/public", ctrl.publicListImages);

router.use(authenticate, requireRole(...ADMIN_ROLES));
router.get("/albums", ctrl.adminListAlbums);
router.post("/albums", validateBody(createGalleryAlbumSchema), ctrl.createAlbum);
router.patch("/albums/:id", ctrl.updateAlbum);
router.delete("/albums/:id", ctrl.deleteAlbum);

router.get("/images", ctrl.adminListImages);
router.post("/images", uploadMultiple("images", 25), ctrl.uploadImages);
router.patch("/images/reorder", ctrl.reorderImages);
router.patch("/images/:id", validateBody(updateGalleryImageSchema), ctrl.updateImage);
router.delete("/images/:id", ctrl.deleteImage);

export default router;
