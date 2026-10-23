import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { SiteSettings } from "../models/SiteSettings.model";
import { assertValidUpload, uploadBuffer, destroyAsset } from "../utils/uploadToCloudinary";

async function getOrCreateSettings() {
  let settings = await SiteSettings.findOne();
  if (!settings) settings = await SiteSettings.create({});
  return settings;
}

export const publicGet = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  return ok(res, settings);
});

export const adminGet = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  return ok(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  Object.assign(settings, req.body);
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings);
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) throw ApiError.badRequest("No image provided");
  assertValidUpload(file, "image");
  const settings = await getOrCreateSettings();
  const asset = await uploadBuffer(file.buffer, { folder: "site", resourceType: "image" });

  const field = req.params.target === "favicon" ? "favicon" : "logo";
  if (field === "favicon") {
    if (settings.faviconPublicId) await destroyAsset(settings.faviconPublicId);
    settings.faviconUrl = asset.url;
    settings.faviconPublicId = asset.publicId;
  } else {
    if (settings.logoPublicId) await destroyAsset(settings.logoPublicId);
    settings.logoUrl = asset.url;
    settings.logoPublicId = asset.publicId;
  }
  settings.updatedBy = req.user!.id as any;
  await settings.save();
  return ok(res, settings);
});
