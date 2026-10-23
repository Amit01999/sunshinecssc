import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { LearningMaterial } from "../models/LearningMaterial.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { getTeacherProfileId, canTeacherAccessSubject } from "../services/teachingScope.service";
import { assertValidUpload, uploadBuffer } from "../utils/uploadToCloudinary";
import { resolveParentScopedStudentId } from "../utils/parentScope";

async function assertOwnerOrAdmin(req: Request, material: { teacherId: unknown }) {
  if (ADMIN_ROLES.includes(req.user!.role as any)) return;
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId || String(teacherProfileId) !== String(material.teacherId)) {
    throw ApiError.forbidden("You do not own this material");
  }
}

export const createMaterial = asyncHandler(async (req: Request, res: Response) => {
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId) throw ApiError.forbidden("No teacher profile found for this account");

  if (req.body.sectionId) {
    const canAccess = await canTeacherAccessSubject(teacherProfileId, req.body.classId, req.body.sectionId, req.body.subjectId);
    if (!canAccess) throw ApiError.forbidden("You are not assigned to teach this subject for this section");
  }

  const material = await LearningMaterial.create({ ...req.body, teacherId: teacherProfileId });
  return created(res, material);
});

export const uploadMaterialFile = asyncHandler(async (req: Request, res: Response) => {
  const material = await LearningMaterial.findById(req.params.id);
  if (!material) throw ApiError.notFound("Material not found");
  await assertOwnerOrAdmin(req, material);

  const file = req.file;
  if (!file) throw ApiError.badRequest("No file provided");
  assertValidUpload(file, "document");
  const asset = await uploadBuffer(file.buffer, { folder: "learning-materials", resourceType: "auto" });
  material.files.push({ url: asset.url, publicId: asset.publicId, filename: file.originalname });
  await material.save();
  return ok(res, material);
});

export const updateMaterial = asyncHandler(async (req: Request, res: Response) => {
  const material = await LearningMaterial.findById(req.params.id);
  if (!material) throw ApiError.notFound("Material not found");
  await assertOwnerOrAdmin(req, material);
  Object.assign(material, req.body);
  await material.save();
  return ok(res, material);
});

export const deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
  const material = await LearningMaterial.findById(req.params.id);
  if (!material) throw ApiError.notFound("Material not found");
  await assertOwnerOrAdmin(req, material);
  await material.deleteOne();
  return ok(res, { message: "Material deleted" });
});

export const listMaterials = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};

  if (req.user!.role === ROLES.STUDENT) {
    const student = await StudentProfile.findOne({ userId: req.user!.id });
    if (!student) return ok(res, []);
    filter.classId = student.classId;
    filter.isPublished = true;
    filter.$or = [{ sectionId: student.sectionId }, { sectionId: { $exists: false } }];
  } else if (req.user!.role === ROLES.TEACHER) {
    const teacherProfileId = await getTeacherProfileId(req.user!.id);
    filter.teacherId = teacherProfileId;
  } else if (req.user!.role === ROLES.PARENT) {
    const studentId = await resolveParentScopedStudentId(req, req.query.studentId as string | undefined);
    const student = studentId ? await StudentProfile.findById(studentId) : null;
    if (!student) return ok(res, []);
    filter.classId = student.classId;
    filter.isPublished = true;
    filter.$or = [{ sectionId: student.sectionId }, { sectionId: { $exists: false } }];
  } else {
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
  }

  const materials = await LearningMaterial.find(filter).populate(["classId", "sectionId", "subjectId"]).sort({ createdAt: -1 });
  return ok(res, materials);
});
