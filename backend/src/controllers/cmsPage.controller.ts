import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { CMSPage, CMS_PAGE_KEYS } from "../models/CMSPage.model";

const MAX_HISTORY = 10;

export const publicGetPage = asyncHandler(async (req: Request, res: Response) => {
  const page = await CMSPage.findOne({ pageKey: req.params.pageKey, status: "published" }).select("-history");
  if (!page) {
    // No CMS override yet - the frontend falls back to its built-in static content for this page.
    return ok(res, null);
  }
  return ok(res, page);
});

export const adminGetPage = asyncHandler(async (req: Request, res: Response) => {
  const page = await CMSPage.findOne({ pageKey: req.params.pageKey });
  if (!page) return ok(res, null);
  return ok(res, page);
});

export const adminListPageKeys = asyncHandler(async (_req: Request, res: Response) => {
  const pages = await CMSPage.find().select("pageKey title status updatedAt");
  return ok(res, { keys: CMS_PAGE_KEYS, pages });
});

export const upsertPage = asyncHandler(async (req: Request, res: Response) => {
  const { pageKey } = req.params;
  if (!CMS_PAGE_KEYS.includes(pageKey as any)) throw ApiError.badRequest(`Unknown CMS page key: ${pageKey}`);

  const existing = await CMSPage.findOne({ pageKey });
  const history = existing
    ? [{ snapshot: existing.toObject(), updatedBy: existing.updatedBy, updatedAt: existing.updatedAt }, ...existing.history].slice(
        0,
        MAX_HISTORY,
      )
    : [];

  const page = await CMSPage.findOneAndUpdate(
    { pageKey },
    {
      pageKey,
      title: req.body.title,
      seoTitle: req.body.seoTitle,
      seoDescription: req.body.seoDescription,
      sections: req.body.sections,
      status: req.body.status ?? "published",
      updatedBy: req.user!.id,
      history,
    },
    { upsert: true, new: true },
  );
  return ok(res, page);
});

export const restoreVersion = asyncHandler(async (req: Request, res: Response) => {
  const page = await CMSPage.findOne({ pageKey: req.params.pageKey });
  if (!page) throw ApiError.notFound("Page not found");
  const entry = page.history[Number(req.params.index)];
  if (!entry) throw ApiError.notFound("History entry not found");

  const snapshot = entry.snapshot as Record<string, unknown>;
  page.title = snapshot.title as string;
  page.seoTitle = snapshot.seoTitle as string | undefined;
  page.seoDescription = snapshot.seoDescription as string | undefined;
  page.sections = snapshot.sections as typeof page.sections;
  page.updatedBy = req.user!.id as any;
  await page.save();
  return ok(res, page);
});
