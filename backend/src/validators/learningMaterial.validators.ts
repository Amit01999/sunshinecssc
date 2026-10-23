import { z } from "zod";

export const createLearningMaterialSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().optional(),
  subjectId: z.string().min(1),
  academicYearId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
});
