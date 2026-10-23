import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { LeaveApplication } from "../models/LeaveApplication.model";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { getTeacherProfileId, getTeacherAssociatedStudentUserIds } from "../services/teachingScope.service";

function applicantRoleFor(role: string): "student" | "teacher" | "staff" {
  if (role === ROLES.STUDENT) return "student";
  if (role === ROLES.TEACHER) return "teacher";
  return "staff";
}

export const createLeaveApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await LeaveApplication.create({
    applicantId: req.user!.id,
    applicantRole: applicantRoleFor(req.user!.role),
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    reason: req.body.reason,
  });
  return created(res, application);
});

export const listMyLeaveApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await LeaveApplication.find({ applicantId: req.user!.id }).sort({ createdAt: -1 });
  return ok(res, applications);
});

export const listAllLeaveApplications = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;

  if (req.user!.role === ROLES.TEACHER) {
    // Not every teacher, only the ones actually associated with that student (their class
    // teacher, or anyone teaching that student's class+section) - never the whole student body.
    const teacherProfileId = await getTeacherProfileId(req.user!.id);
    const studentUserIds = teacherProfileId ? await getTeacherAssociatedStudentUserIds(teacherProfileId) : [];
    filter.applicantRole = "student";
    filter.applicantId = { $in: studentUserIds };
  }

  const applications = await LeaveApplication.find(filter).populate("applicantId", "email role").sort({ createdAt: -1 });
  return ok(res, applications);
});

export const reviewLeaveApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await LeaveApplication.findById(req.params.id);
  if (!application) throw ApiError.notFound("Leave application not found");
  if (application.status !== "pending") throw ApiError.conflict("This application has already been reviewed");

  application.status = req.body.status;
  application.reviewNote = req.body.reviewNote;
  application.reviewedBy = req.user!.id as any;
  application.reviewedAt = new Date();
  await application.save();
  return ok(res, application);
});
