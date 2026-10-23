import { Router } from "express";
import { TeacherProfile } from "../models/TeacherProfile.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/ApiResponse";

const router = Router();

router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { isPublic: true, status: "active" };
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    const teachers = await TeacherProfile.find(filter)
      .select("firstName lastName designation photo bio departmentId")
      .populate("departmentId", "name slug")
      .sort({ firstName: 1 });
    return ok(res, teachers);
  }),
);

export default router;
