import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created, paginationMeta } from "../utils/ApiResponse";
import { parsePagination } from "../utils/pagination";
import { NewsArticle } from "../models/NewsArticle.model";
import { slugify } from "../utils/slugify";
import { assertValidUpload, uploadBuffer, destroyAsset } from "../utils/uploadToCloudinary";

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || "article";
  let slug = base;
  let n = 1;
  while (await NewsArticle.exists({ slug, _id: { $ne: excludeId } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

export const createArticle = asyncHandler(async (req: Request, res: Response) => {
  const slug = await uniqueSlug(req.body.title);
  const article = await NewsArticle.create({
    ...req.body,
    slug,
    author: req.user!.id,
    publishedAt: req.body.status === "published" ? new Date() : undefined,
  });
  return created(res, article);
});

export const updateArticle = asyncHandler(async (req: Request, res: Response) => {
  const article = await NewsArticle.findById(req.params.id);
  if (!article) throw ApiError.notFound("Article not found");

  if (req.body.title && req.body.title !== article.title) {
    req.body.slug = await uniqueSlug(req.body.title, String(article._id));
  }
  const wasPublished = article.status === "published";
  Object.assign(article, req.body);
  if (!wasPublished && article.status === "published") article.publishedAt = new Date();
  await article.save();
  return ok(res, article);
});

export const deleteArticle = asyncHandler(async (req: Request, res: Response) => {
  const article = await NewsArticle.findByIdAndDelete(req.params.id);
  if (!article) throw ApiError.notFound("Article not found");
  if (article.featuredImage?.publicId) await destroyAsset(article.featuredImage.publicId);
  return ok(res, { message: "Article deleted" });
});

export const uploadFeaturedImage = asyncHandler(async (req: Request, res: Response) => {
  const article = await NewsArticle.findById(req.params.id);
  if (!article) throw ApiError.notFound("Article not found");
  const file = req.file;
  if (!file) throw ApiError.badRequest("No image provided");
  assertValidUpload(file, "image");
  const asset = await uploadBuffer(file.buffer, { folder: "news", resourceType: "image" });
  if (article.featuredImage?.publicId) await destroyAsset(article.featuredImage.publicId);
  article.featuredImage = { url: asset.url, publicId: asset.publicId };
  await article.save();
  return ok(res, article);
});

export const removeFeaturedImage = asyncHandler(async (req: Request, res: Response) => {
  const article = await NewsArticle.findById(req.params.id);
  if (!article) throw ApiError.notFound("Article not found");
  if (article.featuredImage?.publicId) await destroyAsset(article.featuredImage.publicId);
  article.featuredImage = undefined;
  await article.save();
  return ok(res, article);
});

export const adminListArticles = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req);
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    NewsArticle.find(filter).sort(sort).skip(skip).limit(limit),
    NewsArticle.countDocuments(filter),
  ]);
  return ok(res, items, paginationMeta(page, limit, total));
});

export const publicListArticles = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req, "-publishedAt");
  const filter: Record<string, unknown> = { status: "published" };
  if (req.query.category) filter.category = req.query.category;
  const [items, total] = await Promise.all([
    NewsArticle.find(filter).select("-body").sort(sort).skip(skip).limit(limit),
    NewsArticle.countDocuments(filter),
  ]);
  return ok(res, items, paginationMeta(page, limit, total));
});

export const publicGetArticle = asyncHandler(async (req: Request, res: Response) => {
  const article = await NewsArticle.findOne({ slug: req.params.slug, status: "published" });
  if (!article) throw ApiError.notFound("Article not found");
  return ok(res, article);
});
