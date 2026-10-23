import { z } from "zod";

const statusEnum = z.enum(["present", "absent", "late", "excused"]);

export const markAttendanceSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  academicYearId: z.string().min(1),
  date: z.coerce.date(),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: statusEnum,
        remarks: z.string().optional(),
      }),
    )
    .min(1),
});

export const updateAttendanceSchema = z.object({
  status: statusEnum,
  remarks: z.string().optional(),
});

export const attendanceCorrectionRequestSchema = z.object({
  attendanceId: z.string().min(1),
  requestedStatus: statusEnum,
  reason: z.string().min(1),
});

export const reviewCorrectionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional(),
});
