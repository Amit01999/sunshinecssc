import { z } from "zod";
import { ALL_ROLES } from "../utils/roles";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(ALL_ROLES as unknown as [string, ...string[]]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  // Student-only
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  rollNumber: z.string().optional(),
  academicYearId: z.string().optional(),
  guardianInfo: z
    .object({
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      guardianPhone: z.string().optional(),
      guardianEmail: z.string().email().optional(),
    })
    .optional(),
  // Teacher/Staff-only
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().optional(),
});

export const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().optional(),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(ALL_ROLES as unknown as [string, ...string[]]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
});

export const teacherCreateStudentSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  rollNumber: z.string().min(1),
  guardianInfo: z
    .object({
      fatherName: z.string().optional(),
      motherName: z.string().optional(),
      guardianPhone: z.string().optional(),
      guardianEmail: z.string().email().optional(),
    })
    .optional(),
});

export const linkParentSchema = z.object({
  parentUserId: z.string().min(1),
  relationship: z.enum(["father", "mother", "guardian"]),
  isPrimary: z.boolean().optional(),
});
