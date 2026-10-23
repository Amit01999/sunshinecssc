import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created, paginationMeta } from "../utils/ApiResponse";
import { parsePagination } from "../utils/pagination";
import { Notice } from "../models/Notice.model";
import { buildAudienceFilter } from "../utils/audienceFilter";
import { assertValidUpload, uploadBuffer } from "../utils/uploadToCloudinary";

export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  const notice = await Notice.create({ ...req.body, createdBy: req.user!.id });
  return created(res, notice);
});

export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!notice) throw ApiError.notFound("Notice not found");
  return ok(res, notice);
});

export const deleteNotice = asyncHandler(async (req: Request, res: Response) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) throw ApiError.notFound("Notice not found");
  return ok(res, { message: "Notice deleted" });
});

export const adminListNotices = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req, "-isPinned -createdAt");
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Notice.find(filter).sort(sort).skip(skip).limit(limit),
    Notice.countDocuments(filter),
  ]);
  return ok(res, items, paginationMeta(page, limit, total));
});

/** Published notices visible to the current viewer (role + class aware); also used unauthenticated for the public site. */
export const listVisibleNotices = asyncHandler(async (req: Request, res: Response) => {
  const filter = await buildAudienceFilter(req);
  const notices = await Notice.find(filter).sort({ isPinned: -1, createdAt: -1 }).limit(100);
  return ok(res, notices);
});

export const uploadNoticeAttachment = asyncHandler(async (req: Request, res: Response) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) throw ApiError.notFound("Notice not found");
  const file = req.file;
  if (!file) throw ApiError.badRequest("No file provided");
  assertValidUpload(file, "document");
  const asset = await uploadBuffer(file.buffer, { folder: "notices", resourceType: "auto" });
  notice.attachments.push({ url: asset.url, publicId: asset.publicId, filename: file.originalname });
  await notice.save();
  return ok(res, notice);
});
