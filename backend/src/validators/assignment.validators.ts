import { z } from "zod";

export const createAssignmentSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  academicYearId: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().optional(),
  maxMarks: z.number().min(0),
  dueDate: z.coerce.date(),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).optional(),
  instructions: z.string().optional(),
  maxMarks: z.number().min(0).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["draft", "published", "closed"]).optional(),
});

export const submitAssignmentSchema = z.object({
  textAnswer: z.string().optional(),
});

export const gradeSubmissionSchema = z.object({
  marksObtained: z.number().min(0),
  feedback: z.string().optional(),
});
