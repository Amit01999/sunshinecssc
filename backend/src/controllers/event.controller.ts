import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created, paginationMeta } from "../utils/ApiResponse";
import { parsePagination } from "../utils/pagination";
import { Event } from "../models/Event.model";
import { buildAudienceFilter } from "../utils/audienceFilter";
import { assertValidUpload, uploadBuffer, destroyAsset } from "../utils/uploadToCloudinary";

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.create({ ...req.body, createdBy: req.user!.id });
  return created(res, event);
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!event) throw ApiError.notFound("Event not found");
  return ok(res, event);
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) throw ApiError.notFound("Event not found");
  return ok(res, { message: "Event deleted" });
});

export const adminListEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req, "-startDate");
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Event.find(filter).sort(sort).skip(skip).limit(limit),
    Event.countDocuments(filter),
  ]);
  return ok(res, items, paginationMeta(page, limit, total));
});

export const listVisibleEvents = asyncHandler(async (req: Request, res: Response) => {
  const filter = await buildAudienceFilter(req);
  // "Visible events" is advertised everywhere (portal and public site) as upcoming events, but
  // nothing here previously excluded past ones - combined with the ascending sort, a long-running
  // school would have its oldest events permanently stuck ahead of anything actually upcoming.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = await Event.find({ ...filter, startDate: { $gte: today } }).sort({ startDate: 1 }).limit(100);
  return ok(res, events);
});

export const uploadEventImage = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound("Event not found");
  const file = req.file;
  if (!file) throw ApiError.badRequest("No image provided");
  assertValidUpload(file, "image");
  const asset = await uploadBuffer(file.buffer, { folder: "events", resourceType: "image" });
  if (event.image?.publicId) await destroyAsset(event.image.publicId);
  event.image = { url: asset.url, publicId: asset.publicId };
  await event.save();
  return ok(res, event);
});
