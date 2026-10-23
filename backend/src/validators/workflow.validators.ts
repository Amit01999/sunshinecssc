import { z } from "zod";

export const createAdmissionApplicationSchema = z.object({
  applicantName: z.string().min(1),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["male", "female", "other"]).optional(),
  guardianName: z.string().min(1),
  guardianPhone: z.string().min(1),
  guardianEmail: z.string().email().optional(),
  appliedClassId: z.string().min(1),
});

export const reviewAdmissionSchema = z.object({
  status: z.enum(["under_review", "info_requested", "approved", "rejected"]),
  reviewNote: z.string().optional(),
  // required only when status === "approved"
  email: z.string().email().optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  rollNumber: z.string().optional(),
  academicYearId: z.string().optional(),
});

export const createLeaveApplicationSchema = z.object({
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  reason: z.string().min(1),
});

export const reviewLeaveApplicationSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional(),
});

export const createInquirySchema = z.object({
  toUserId: z.string().optional(),
  studentId: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export const respondInquirySchema = z.object({
  message: z.string().min(1),
});
