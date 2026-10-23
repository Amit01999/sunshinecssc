import { Request, Response } from "express";
import { Model } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { User } from "../models/User.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { ParentProfile } from "../models/ParentProfile.model";
import { TeacherProfile } from "../models/TeacherProfile.model";
import { StaffProfile } from "../models/StaffProfile.model";
import { ProfileChangeRequest } from "../models/ProfileChangeRequest.model";
import { buildMePayload, getChildrenForParent } from "../services/userProfile.service";
import { ROLES } from "../utils/roles";
import { assertValidUpload, uploadBuffer, destroyAsset } from "../utils/uploadToCloudinary";

function profileModelForRole(role: string): Model<any> {
  switch (role) {
    case ROLES.STUDENT:
      return StudentProfile;
    case ROLES.PARENT:
      return ParentProfile;
    case ROLES.TEACHER:
      return TeacherProfile;
    default:
      return StaffProfile;
  }
}

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound("User not found");
  return ok(res, await buildMePayload(user));
});

export const updateMyContactInfo = asyncHandler(async (req: Request, res: Response) => {
  const Model = profileModelForRole(req.user!.role);
  const profile = await Model.findOneAndUpdate({ userId: req.user!.id }, req.body, { new: true });
  if (!profile) throw ApiError.notFound("Profile not found");
  return ok(res, profile);
});

export const uploadMyPhoto = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw ApiError.badRequest("No image provided");
  assertValidUpload(file, "image");

  const Model = profileModelForRole(req.user!.role);
  const profile = await Model.findOne({ userId: req.user!.id });
  if (!profile) throw ApiError.notFound("Profile not found");

  const asset = await uploadBuffer(file.buffer, { folder: "profile-photos", resourceType: "image" });
  if ((profile as any).photo?.publicId) await destroyAsset((profile as any).photo.publicId);
  (profile as any).photo = { url: asset.url, publicId: asset.publicId };
  await profile.save();
  return ok(res, profile);
});

export const submitProfileChangeRequest = asyncHandler(async (req: Request, res: Response) => {
  const request_ = await ProfileChangeRequest.create({
    userId: req.user!.id,
    requestedChanges: req.body.requestedChanges,
    reason: req.body.reason,
  });
  return created(res, request_);
});

export const listMyProfileChangeRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await ProfileChangeRequest.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  return ok(res, requests);
});

export const adminListProfileChangeRequests = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  const requests = await ProfileChangeRequest.find(filter).populate("userId", "email role").sort({ createdAt: -1 });
  return ok(res, requests);
});

export const reviewProfileChangeRequest = asyncHandler(async (req: Request, res: Response) => {
  const changeRequest = await ProfileChangeRequest.findById(req.params.id);
  if (!changeRequest) throw ApiError.notFound("Request not found");
  if (changeRequest.status !== "pending") throw ApiError.conflict("This request has already been reviewed");

  changeRequest.status = req.body.status;
  changeRequest.reviewedBy = req.user!.id as any;
  changeRequest.reviewedAt = new Date();
  changeRequest.reviewNote = req.body.reviewNote;
  await changeRequest.save();

  if (req.body.status === "approved") {
    const user = await User.findById(changeRequest.userId);
    if (user) {
      const Model = profileModelForRole(user.role);
      await Model.findOneAndUpdate({ userId: user._id }, changeRequest.requestedChanges);
    }
  }

  return ok(res, changeRequest);
});

export const getChild = asyncHandler(async (req: Request, res: Response) => {
  const childIds = await getChildrenForParent(req.user!.id);
  if (!childIds.some((id) => String(id) === req.params.studentId)) {
    throw ApiError.forbidden("You can only view your own linked children");
  }
  const child = await StudentProfile.findById(req.params.studentId).populate(["classId", "sectionId"]);
  if (!child) throw ApiError.notFound("Student not found");
  return ok(res, child);
});
