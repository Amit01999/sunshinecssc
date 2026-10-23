import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { GalleryAlbum, GalleryImage } from "../models/Gallery.model";
import { assertValidUpload, uploadBuffer, destroyAsset } from "../utils/uploadToCloudinary";

export const createAlbum = asyncHandler(async (req: Request, res: Response) => {
  const album = await GalleryAlbum.create(req.body);
  return created(res, album);
});

export const updateAlbum = asyncHandler(async (req: Request, res: Response) => {
  const album = await GalleryAlbum.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!album) throw ApiError.notFound("Album not found");
  return ok(res, album);
});

export const deleteAlbum = asyncHandler(async (req: Request, res: Response) => {
  const album = await GalleryAlbum.findByIdAndDelete(req.params.id);
  if (!album) throw ApiError.notFound("Album not found");
  await GalleryImage.updateMany({ albumId: album._id }, { $unset: { albumId: 1 } });
  return ok(res, { message: "Album deleted" });
});

export const adminListAlbums = asyncHandler(async (_req: Request, res: Response) => {
  const albums = await GalleryAlbum.find().sort({ order: 1, createdAt: -1 });
  return ok(res, albums);
});

export const publicListAlbums = asyncHandler(async (_req: Request, res: Response) => {
  const albums = await GalleryAlbum.find({ isPublished: true }).sort({ order: 1, createdAt: -1 });
  return ok(res, albums);
});

export const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw ApiError.badRequest("No images provided");

  const created_: unknown[] = [];
  for (const file of files) {
    assertValidUpload(file, "image");
    const asset = await uploadBuffer(file.buffer, { folder: "gallery", resourceType: "image" });
    const image = await GalleryImage.create({
      albumId: req.body.albumId || undefined,
      url: asset.url,
      publicId: asset.publicId,
      uploadedBy: req.user!.id,
    });
    created_.push(image);
  }
  return created(res, created_);
});

export const updateImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await GalleryImage.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!image) throw ApiError.notFound("Image not found");
  return ok(res, image);
});

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await GalleryImage.findByIdAndDelete(req.params.id);
  if (!image) throw ApiError.notFound("Image not found");
  await destroyAsset(image.publicId);
  return ok(res, { message: "Image deleted" });
});

export const reorderImages = asyncHandler(async (req: Request, res: Response) => {
  const { orderedIds } = req.body as { orderedIds: string[] };
  await Promise.all(orderedIds.map((id, index) => GalleryImage.findByIdAndUpdate(id, { order: index })));
  return ok(res, { message: "Order updated" });
});

export const adminListImages = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.albumId) filter.albumId = req.query.albumId;
  const images = await GalleryImage.find(filter).sort({ order: 1, createdAt: -1 });
  return ok(res, images);
});

export const publicListImages = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { isPublished: true };
  if (req.query.albumId) filter.albumId = req.query.albumId;
  if (req.query.featured === "true") filter.isFeatured = true;
  const images = await GalleryImage.find(filter).sort({ order: 1, createdAt: -1 }).limit(200);
  return ok(res, images);
});
