import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created, paginationMeta } from "../utils/ApiResponse";
import { parsePagination } from "../utils/pagination";
import { User } from "../models/User.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { ParentProfile } from "../models/ParentProfile.model";
import { TeacherProfile } from "../models/TeacherProfile.model";
import { StaffProfile } from "../models/StaffProfile.model";
import { StudentParentLink } from "../models/StudentParentLink.model";
import { getProfileForUser } from "../services/userProfile.service";
import { createUserWithProfile } from "../services/userCreation.service";
import { resetUserPasswordAndNotify } from "../services/passwordReset.service";
import { writeAuditLog } from "../models/AuditLog.model";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { getTeacherProfileId, canTeacherAccessSection } from "../services/teachingScope.service";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req);
  const { role, status, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.isActive = status === "active";
  if (search) filter.email = new RegExp(search.trim(), "i");

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const withProfiles = await Promise.all(
    users.map(async (u) => ({ ...u, profile: await getProfileForUser(u._id, u.role) })),
  );

  return ok(res, withProfiles, paginationMeta(page, limit, total));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound("User not found");
  const profile = await getProfileForUser(user._id, user.role);
  return ok(res, { ...user, profile });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await createUserWithProfile({ ...req.body, createdBy: req.user!.id });
  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "user.create",
    targetType: "User",
    targetId: result.userId,
    after: { email: req.body.email, role: req.body.role },
    ip: req.ip,
  });
  return created(res, {
    userId: result.userId,
    profile: result.profile,
    temporaryPassword: result.temporaryPassword,
  });
});

async function assertNotLastSuperAdmin(userId: string, nextIsActive?: boolean, nextRole?: string) {
  const target = await User.findById(userId);
  if (!target) throw ApiError.notFound("User not found");
  const isDemotingOrDeactivating =
    target.role === ROLES.SUPER_ADMIN && ((nextRole && nextRole !== ROLES.SUPER_ADMIN) || nextIsActive === false);
  if (isDemotingOrDeactivating) {
    const activeSuperAdmins = await User.countDocuments({ role: ROLES.SUPER_ADMIN, isActive: true });
    if (activeSuperAdmins <= 1) {
      throw ApiError.forbidden("Cannot deactivate or demote the last active super admin");
    }
  }
  return target;
}

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { isActive, firstName, lastName, phone, designation, departmentId, classId, sectionId } = req.body;
  const target = await assertNotLastSuperAdmin(req.params.id, isActive);

  const before = target.toObject();
  if (isActive !== undefined) target.isActive = isActive;
  await target.save();

  const profileUpdate: Record<string, unknown> = {};
  if (firstName) profileUpdate.firstName = firstName;
  if (lastName) profileUpdate.lastName = lastName;
  if (phone) profileUpdate.phone = phone;
  if (designation) profileUpdate.designation = designation;
  if (departmentId) profileUpdate.departmentId = departmentId;

  if (Object.keys(profileUpdate).length > 0 || classId || sectionId) {
    if (target.role === ROLES.STUDENT) {
      if (classId) profileUpdate.classId = classId;
      if (sectionId) profileUpdate.sectionId = sectionId;
      await StudentProfile.findOneAndUpdate({ userId: target._id }, profileUpdate);
    } else if (target.role === ROLES.PARENT) {
      await ParentProfile.findOneAndUpdate({ userId: target._id }, profileUpdate);
    } else if (target.role === ROLES.TEACHER) {
      await TeacherProfile.findOneAndUpdate({ userId: target._id }, profileUpdate);
    } else {
      await StaffProfile.findOneAndUpdate({ userId: target._id }, profileUpdate);
    }
  }

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "user.update",
    targetType: "User",
    targetId: target._id,
    before: { isActive: before.isActive },
    after: { isActive: target.isActive, ...profileUpdate },
    ip: req.ip,
  });

  const profile = await getProfileForUser(target._id, target.role);
  return ok(res, { ...target.toObject(), profile });
});

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  const temporaryPassword = await resetUserPasswordAndNotify(user, req.user!.id, req.user!.role, req.ip);
  return ok(res, { temporaryPassword });
});

/** Admins can manage any student's parent links. A teacher may too, but only for a student in
 *  a class/section they actually teach (class teacher or any teaching assignment there) -
 *  the same rule already used to scope a teacher's visibility elsewhere (e.g. leave applications). */
async function assertCanManageStudentParents(req: Request, student: { classId?: unknown; sectionId?: unknown }) {
  if (ADMIN_ROLES.includes(req.user!.role as any)) return;
  if (req.user!.role !== ROLES.TEACHER) throw ApiError.forbidden();
  if (!student.classId || !student.sectionId) throw ApiError.forbidden();
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId) throw ApiError.forbidden();
  const allowed = await canTeacherAccessSection(teacherProfileId, student.classId as any, student.sectionId as any);
  if (!allowed) throw ApiError.forbidden("You are not associated with this student's class");
}

export const linkParentToStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await StudentProfile.findById(req.params.studentId);
  if (!student) throw ApiError.notFound("Student not found");
  await assertCanManageStudentParents(req, student);

  const parentUser = await User.findById(req.body.parentUserId);
  if (!parentUser || parentUser.role !== ROLES.PARENT) {
    throw ApiError.badRequest("parentUserId must reference an existing parent account");
  }
  const parentProfile = await ParentProfile.findOne({ userId: parentUser._id });
  if (!parentProfile) throw ApiError.notFound("Parent profile not found");

  const link = await StudentParentLink.findOneAndUpdate(
    { studentId: student._id, parentId: parentProfile._id },
    {
      relationship: req.body.relationship,
      isPrimary: Boolean(req.body.isPrimary),
      verifiedBy: req.user!.id,
      verifiedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "user.link_parent",
    targetType: "StudentProfile",
    targetId: student._id,
    after: { parentId: parentProfile._id, relationship: req.body.relationship },
    ip: req.ip,
  });

  return created(res, link);
});

export const unlinkParentFromStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await StudentProfile.findById(req.params.studentId).select("classId sectionId");
  if (!student) throw ApiError.notFound("Student not found");
  await assertCanManageStudentParents(req, student);

  await StudentParentLink.findOneAndDelete({ studentId: req.params.studentId, parentId: req.params.parentId });
  return ok(res, { message: "Link removed" });
});

export const listStudentParents = asyncHandler(async (req: Request, res: Response) => {
  const student = await StudentProfile.findById(req.params.studentId).select("classId sectionId");
  if (!student) throw ApiError.notFound("Student not found");
  await assertCanManageStudentParents(req, student);

  const links = await StudentParentLink.find({ studentId: req.params.studentId }).populate({
    path: "parentId",
    populate: { path: "userId", select: "email isActive" },
  });
  return ok(res, links);
});
