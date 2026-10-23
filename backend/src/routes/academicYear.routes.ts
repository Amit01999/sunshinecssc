import { Router } from "express";
import { AcademicYear } from "../models/AcademicYear.model";
import { createCrudController } from "../utils/crudFactory";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { academicYearSchema } from "../validators/academics.validators";
import { ADMIN_ROLES, STAFF_ROLES } from "../utils/roles";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";

const ctrl = createCrudController(AcademicYear, { targetType: "AcademicYear" });
const router = Router();

router.use(authenticate);

router.get("/", requireRole(...STAFF_ROLES), ctrl.list);
router.get("/:id", requireRole(...STAFF_ROLES), ctrl.getOne);
router.post("/", requireRole(...ADMIN_ROLES), validateBody(academicYearSchema), ctrl.create);
router.patch("/:id", requireRole(...ADMIN_ROLES), ctrl.update);

router.post(
  "/:id/activate",
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) throw ApiError.notFound("Academic year not found");
    await AcademicYear.updateMany({ _id: { $ne: year._id } }, { isActive: false });
    year.isActive = true;
    await year.save();
    return ok(res, year);
  }),
);

export default router;
