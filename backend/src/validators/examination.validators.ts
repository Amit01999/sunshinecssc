import { z } from "zod";

export const createExaminationSchema = z.object({
  name: z.string().min(1),
  examType: z.string().min(1),
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  subjects: z
    .array(
      z.object({
        subjectId: z.string().min(1),
        maxMarks: z.number().min(1),
        passMarks: z.number().min(0),
        examDate: z.coerce.date().optional(),
      }),
    )
    .min(1),
});

export const enterMarksSchema = z.object({
  subjectId: z.string().min(1),
  marks: z
    .array(
      z.object({
        studentId: z.string().min(1),
        marksObtained: z.number().min(0),
        remarks: z.string().optional(),
      }),
    )
    .min(1),
});

export const reviewResultsSchema = z.object({
  resultIds: z.array(z.string().min(1)).min(1),
  reason: z.string().optional(),
});
