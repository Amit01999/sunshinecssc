import { z } from "zod";

export const createTimetableSlotSchema = z.object({
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  dayOfWeek: z.number().min(0).max(6),
  periodIndex: z.number().min(0),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  room: z.string().optional(),
});
