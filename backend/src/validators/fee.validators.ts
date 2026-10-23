import { z } from "zod";

export const feeCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const feeStructureSchema = z.object({
  classId: z.string().min(1),
  academicYearId: z.string().min(1),
  items: z.array(z.object({ categoryId: z.string().min(1), amount: z.number().min(0) })).min(1),
});

export const createInvoiceSchema = z.object({
  studentId: z.string().min(1),
  academicYearId: z.string().min(1),
  feeStructureId: z.string().optional(),
  items: z.array(z.object({ categoryId: z.string().min(1), amount: z.number().min(0), discount: z.number().min(0).optional() })).min(1),
  dueDate: z.coerce.date(),
});

export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(["cash", "bank", "mobile_banking", "other"]),
  note: z.string().optional(),
});
