import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { SchoolClass } from "../models/SchoolClass.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { User } from "../models/User.model";
import { createUserWithProfile } from "../services/userCreation.service";
import { resetUserPasswordAndNotify } from "../services/passwordReset.service";
import { getTeacherProfileId, canTeacherAccessSection } from "../services/teachingScope.service";
import { writeAuditLog } from "../models/AuditLog.model";
import { ROLES } from "../utils/roles";

/** Lets a teacher create a student account directly in a class/section they are assigned
 *  to teach (same "assigned to this section" check used for attendance and assignments) -
 *  so a homeroom/subject teacher doesn't have to wait on an admin for routine enrollment. */
export const teacherCreateStudent = asyncHandler(async (req: Request, res: Response) => {
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId) throw ApiError.forbidden("No teacher profile found for this account");

  const { classId, sectionId } = req.body;
  const canAccess = await canTeacherAccessSection(teacherProfileId, classId, sectionId);
  if (!canAccess) {
    throw ApiError.forbidden("You are not assigned to this class/section");
  }

  const schoolClass = await SchoolClass.findById(classId).select("academicYearId");
  if (!schoolClass) throw ApiError.notFound("Class not found");

  const result = await createUserWithProfile({
    ...req.body,
    role: ROLES.STUDENT,
    academicYearId: String(schoolClass.academicYearId),
    createdBy: req.user!.id,
  });

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "user.create_by_teacher",
    targetType: "User",
    targetId: result.userId,
    after: { email: req.body.email, classId, sectionId, rollNumber: req.body.rollNumber },
    ip: req.ip,
  });

  return created(res, {
    userId: result.userId,
    profile: result.profile,
    temporaryPassword: result.temporaryPassword,
  });
});

/** Lets a teacher re-issue a temporary password for a student in a class/section they teach -
 *  for when the original one-time password was lost before the student's first login. Scoped
 *  by the same "assigned to this section" check as creation, so a teacher can't reset an
 *  arbitrary account. */
export const teacherResetStudentPassword = asyncHandler(async (req: Request, res: Response) => {
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId) throw ApiError.forbidden("No teacher profile found for this account");

  const student = await StudentProfile.findById(req.params.studentId);
  if (!student) throw ApiError.notFound("Student not found");

  const canAccess = await canTeacherAccessSection(teacherProfileId, String(student.classId), String(student.sectionId));
  if (!canAccess) throw ApiError.forbidden("You are not assigned to this class/section");

  const user = await User.findById(student.userId);
  if (!user) throw ApiError.notFound("Student account not found");

  const temporaryPassword = await resetUserPasswordAndNotify(user, req.user!.id, req.user!.role, req.ip);
  return ok(res, { temporaryPassword });
});

/** Minimal parent-account list for the "link a parent" picker - email only, no other admin
 *  user-management detail, since a teacher only needs enough to identify the right account. */
export const listParentAccountsForTeacher = asyncHandler(async (_req: Request, res: Response) => {
  const parents = await User.find({ role: ROLES.PARENT, isActive: true }).select("email").sort({ email: 1 });
  return ok(res, parents);
});
