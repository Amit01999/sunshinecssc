import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created, paginationMeta } from "../utils/ApiResponse";
import { parsePagination } from "../utils/pagination";
import { AdmissionApplication } from "../models/AdmissionApplication.model";
import { writeAuditLog } from "../models/AuditLog.model";
import { assertValidUpload, uploadBuffer } from "../utils/uploadToCloudinary";
import { createUserWithProfile } from "../services/userCreation.service";
import { ROLES } from "../utils/roles";

export const submitApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await AdmissionApplication.create(req.body);
  return created(res, { id: application._id, message: "Application received. We will contact your guardian regarding next steps." });
});

export const uploadApplicationDocument = asyncHandler(async (req: Request, res: Response) => {
  const application = await AdmissionApplication.findById(req.params.id);
  if (!application) throw ApiError.notFound("Application not found");
  const file = req.file;
  if (!file) throw ApiError.badRequest("No file provided");
  assertValidUpload(file, "document");
  const asset = await uploadBuffer(file.buffer, { folder: "admissions", resourceType: "auto" });
  application.documents.push({ url: asset.url, publicId: asset.publicId, filename: file.originalname });
  await application.save();
  return ok(res, application);
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    AdmissionApplication.find(filter).populate("appliedClassId", "name").sort(sort).skip(skip).limit(limit),
    AdmissionApplication.countDocuments(filter),
  ]);
  return ok(res, items, paginationMeta(page, limit, total));
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await AdmissionApplication.findById(req.params.id).populate("appliedClassId", "name");
  if (!application) throw ApiError.notFound("Application not found");
  return ok(res, application);
});

export const reviewApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await AdmissionApplication.findById(req.params.id);
  if (!application) throw ApiError.notFound("Application not found");
  if (["approved", "rejected"].includes(application.status)) {
    throw ApiError.conflict("This application has already been finalized");
  }

  if (req.body.status === "approved") {
    const { email, classId, sectionId, rollNumber, academicYearId } = req.body;
    if (!email || !classId || !sectionId || !rollNumber || !academicYearId) {
      throw ApiError.badRequest(
        "Approving an application requires email, classId, sectionId, rollNumber and academicYearId to create the student account",
      );
    }
    const [firstName, ...rest] = application.applicantName.trim().split(" ");
    const result = await createUserWithProfile({
      email,
      role: ROLES.STUDENT,
      firstName,
      lastName: rest.join(" ") || firstName,
      dateOfBirth: application.dateOfBirth,
      gender: application.gender,
      classId,
      sectionId,
      rollNumber,
      academicYearId,
      guardianInfo: { guardianPhone: application.guardianPhone, guardianEmail: application.guardianEmail },
      createdBy: req.user!.id,
    });
    application.createdStudentUserId = result.userId;
  }

  application.status = req.body.status;
  application.reviewNote = req.body.reviewNote;
  application.reviewedBy = req.user!.id as any;
  application.reviewedAt = new Date();
  await application.save();

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "admission.review",
    targetType: "AdmissionApplication",
    targetId: application._id,
    after: { status: req.body.status },
    ip: req.ip,
  });

  return ok(res, application);
});
