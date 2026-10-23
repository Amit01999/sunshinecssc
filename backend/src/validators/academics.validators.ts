import { z } from "zod";

export const academicYearSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const departmentSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
  order: z.number().optional(),
});

export const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  departmentId: z.string().optional(),
  description: z.string().optional(),
  groupId: z.string().optional(),
  applicableClasses: z.array(z.string()).optional(),
  isElective: z.boolean().optional(),
});

export const schoolClassSchema = z.object({
  name: z.string().min(1),
  academicYearId: z.string().min(1),
  classTeacherId: z.string().optional(),
  order: z.number().optional(),
});

export const sectionSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().optional(),
  groupId: z.string().optional(),
});

export const academicGroupSchema = z.object({
  name: z.string().min(1),
  classIds: z.array(z.string()).optional(),
});

export const teachingAssignmentSchema = z.object({
  academicYearId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
});

export const enrollmentSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  academicYearId: z.string().min(1),
  rollNumber: z.string().min(1),
});

export const transferStudentSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  rollNumber: z.string().min(1),
});
