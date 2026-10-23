import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { FeeCategory, FeeStructure, Invoice, Payment } from "../models/Fee.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { ROLES } from "../utils/roles";
import { getChildrenForParent } from "../services/userProfile.service";
import { writeAuditLog } from "../models/AuditLog.model";

export const createFeeCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await FeeCategory.create(req.body);
  return created(res, category);
});

export const listFeeCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await FeeCategory.find().sort({ name: 1 });
  return ok(res, categories);
});

export const createFeeStructure = asyncHandler(async (req: Request, res: Response) => {
  const totalAmount = req.body.items.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
  const structure = await FeeStructure.create({ ...req.body, totalAmount });
  return created(res, structure);
});

export const listFeeStructures = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
  const structures = await FeeStructure.find(filter).populate(["classId", "items.categoryId"]);
  return ok(res, structures);
});

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({ invoiceNumber: new RegExp(`^INV-${year}-`) });
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const totalAmount = req.body.items.reduce(
    (sum: number, i: { amount: number; discount?: number }) => sum + i.amount - (i.discount ?? 0),
    0,
  );
  const invoice = await Invoice.create({
    ...req.body,
    invoiceNumber: await nextInvoiceNumber(),
    totalAmount,
    createdBy: req.user!.id,
  });
  return created(res, invoice);
});

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};

  if (req.user!.role === ROLES.STUDENT) {
    const student = await StudentProfile.findOne({ userId: req.user!.id }).select("_id");
    filter.studentId = student?._id;
  } else if (req.user!.role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(req.user!.id);
    const studentId = req.query.studentId as string | undefined;
    if (studentId && !childIds.some((id) => String(id) === studentId)) throw ApiError.forbidden();
    filter.studentId = studentId ?? { $in: childIds };
  } else if (req.query.studentId) {
    filter.studentId = req.query.studentId;
  }
  if (req.query.status) filter.status = req.query.status;

  const invoices = await Invoice.find(filter).populate("studentId", "firstName lastName studentCode").sort({ createdAt: -1 });
  return ok(res, invoices);
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate("studentId", "firstName lastName studentCode")
    .populate("items.categoryId", "name");
  if (!invoice) throw ApiError.notFound("Invoice not found");

  if (req.user!.role === ROLES.STUDENT) {
    const student = await StudentProfile.findOne({ userId: req.user!.id }).select("_id");
    if (String(invoice.studentId._id ?? invoice.studentId) !== String(student?._id)) throw ApiError.forbidden();
  } else if (req.user!.role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(req.user!.id);
    if (!childIds.some((id) => String(id) === String(invoice.studentId._id ?? invoice.studentId))) throw ApiError.forbidden();
  }

  const payments = await Payment.find({ invoiceId: invoice._id }).sort({ paidAt: -1 });
  return ok(res, { invoice, payments });
});

async function nextReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Payment.countDocuments({ receiptNumber: new RegExp(`^RCPT-${year}-`) });
  return `RCPT-${year}-${String(count + 1).padStart(5, "0")}`;
}

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  try {
    let payment;
    await session.withTransaction(async () => {
      const invoice = await Invoice.findById(req.params.id).session(session);
      if (!invoice) throw ApiError.notFound("Invoice not found");

      const remaining = invoice.totalAmount - invoice.amountPaid;
      if (req.body.amount > remaining + 0.01) {
        throw ApiError.badRequest(`Payment of ${req.body.amount} exceeds the remaining balance of ${remaining.toFixed(2)}`);
      }

      const [created_] = await Payment.create(
        [
          {
            invoiceId: invoice._id,
            amount: req.body.amount,
            method: req.body.method,
            note: req.body.note,
            receiptNumber: await nextReceiptNumber(),
            recordedBy: req.user!.id,
          },
        ],
        { session },
      );
      payment = created_;

      invoice.amountPaid += req.body.amount;
      invoice.status = invoice.amountPaid >= invoice.totalAmount ? "paid" : "partially_paid";
      await invoice.save({ session });
    });

    await writeAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: "fee.record_payment",
      targetType: "Invoice",
      targetId: req.params.id,
      after: { amount: req.body.amount },
      ip: req.ip,
    });

    return created(res, payment);
  } finally {
    await session.endSession();
  }
});
