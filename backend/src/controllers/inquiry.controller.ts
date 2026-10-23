import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { Inquiry } from "../models/Inquiry.model";
import { ADMIN_ROLES, STAFF_ROLES } from "../utils/roles";

const POPULATE = [
  { path: "fromUserId", select: "email role" },
  { path: "toUserId", select: "email role" },
  { path: "studentId", select: "firstName lastName studentCode" },
  { path: "responses.byUserId", select: "email role" },
];

export const createInquiry = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await Inquiry.create({
    fromUserId: req.user!.id,
    toUserId: req.body.toUserId,
    studentId: req.body.studentId,
    subject: req.body.subject,
    message: req.body.message,
  });
  return created(res, inquiry);
});

export const listMyInquiries = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const conditions: Record<string, unknown>[] = [{ fromUserId: userId }, { toUserId: userId }];
  // Staff/teachers/admins can also see open inquiries nobody has claimed yet, so the first
  // person to respond can pick one up - toUserId is then set automatically (see respondToInquiry).
  if (STAFF_ROLES.includes(req.user!.role as any)) {
    conditions.push({ toUserId: { $exists: false }, status: "open" });
  }
  const inquiries = await Inquiry.find({ $or: conditions }).populate(POPULATE).sort({ updatedAt: -1 });
  return ok(res, inquiries);
});

export const listAllInquiries = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  const inquiries = await Inquiry.find(filter).populate(POPULATE).sort({ updatedAt: -1 });
  return ok(res, inquiries);
});

async function assertCanRespond(req: Request, inquiry: { fromUserId: unknown; toUserId?: unknown }) {
  if (ADMIN_ROLES.includes(req.user!.role as any)) return;
  const userId = req.user!.id;
  if (String(inquiry.fromUserId) === userId) return;
  if (inquiry.toUserId && String(inquiry.toUserId) === userId) return;
  // Any staff member may claim an inquiry nobody has responded to yet.
  if (!inquiry.toUserId && STAFF_ROLES.includes(req.user!.role as any)) return;
  throw ApiError.forbidden("You are not part of this conversation");
}

export const respondToInquiry = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) throw ApiError.notFound("Inquiry not found");
  await assertCanRespond(req, inquiry);

  inquiry.responses.push({ byUserId: req.user!.id as any, message: req.body.message, at: new Date() });
  if (!inquiry.toUserId) inquiry.toUserId = req.user!.id as any;
  await inquiry.save();
  await inquiry.populate(POPULATE);
  return ok(res, inquiry);
});

export const closeInquiry = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) throw ApiError.notFound("Inquiry not found");
  await assertCanRespond(req, inquiry);
  inquiry.status = "closed";
  await inquiry.save();
  return ok(res, inquiry);
});
