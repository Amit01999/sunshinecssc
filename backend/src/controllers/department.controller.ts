import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { Department } from "../models/Department.model";
import { assertValidUpload, uploadBuffer, destroyAsset } from "../utils/uploadToCloudinary";

export const publicList = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await Department.find({ isPublished: true }).sort({ order: 1, name: 1 }).lean();
  return ok(res, departments);
});

export const uploadDepartmentImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw ApiError.badRequest("No image file provided");
  assertValidUpload(file, "image");

  const department = await Department.findById(req.params.id);
  if (!department) throw ApiError.notFound("Department not found");

  const asset = await uploadBuffer(file.buffer, { folder: "departments", resourceType: "image" });
  if (department.image?.publicId) await destroyAsset(department.image.publicId);

  department.image = { url: asset.url, publicId: asset.publicId };
  await department.save();
  return ok(res, department);
});
