import mongoose, { Types } from "mongoose";
import { User, hashPassword } from "../models/User.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { ParentProfile } from "../models/ParentProfile.model";
import { TeacherProfile } from "../models/TeacherProfile.model";
import { StaffProfile } from "../models/StaffProfile.model";
import { Enrollment } from "../models/Enrollment.model";
import { ROLES, Role } from "../utils/roles";
import { generateTemporaryPassword } from "../utils/generatePassword";
import { ApiError } from "../utils/ApiError";
import { sendAccountCreatedEmail } from "./email.service";

export interface CreateUserInput {
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  password?: string;
  createdBy: Types.ObjectId | string;
  // student
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  classId?: string;
  sectionId?: string;
  rollNumber?: string;
  academicYearId?: string;
  guardianInfo?: Record<string, unknown>;
  // teacher/staff
  employeeId?: string;
  designation?: string;
  departmentId?: string;
}

async function nextStudentCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await StudentProfile.countDocuments({ studentCode: new RegExp(`^SS-${year}-`) });
  return `SS-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function nextEmployeeId(prefix: string): Promise<string> {
  const count = await (prefix === "TCH" ? TeacherProfile.countDocuments() : StaffProfile.countDocuments());
  return `CSSC-${prefix}-${String(count + 1).padStart(3, "0")}`;
}

export async function createUserWithProfile(input: CreateUserInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw ApiError.conflict(`A user with email ${input.email} already exists`);

  const temporaryPassword = input.password ?? generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const session = await mongoose.startSession();
  try {
    let userId: Types.ObjectId | undefined;
    let profile: unknown;

    await session.withTransaction(async () => {
      const [user] = await User.create(
        [
          {
            email: input.email,
            passwordHash,
            role: input.role,
            isActive: true,
            mustChangePassword: true,
            createdBy: input.createdBy,
          },
        ],
        { session },
      );
      userId = user._id;

      if (input.role === ROLES.STUDENT) {
        const studentCode = await nextStudentCode();
        const [studentProfile] = await StudentProfile.create(
          [
            {
              userId: user._id,
              studentCode,
              firstName: input.firstName,
              lastName: input.lastName,
              dateOfBirth: input.dateOfBirth,
              gender: input.gender,
              phone: input.phone,
              classId: input.classId,
              sectionId: input.sectionId,
              rollNumber: input.rollNumber,
              academicYearId: input.academicYearId,
              admissionDate: new Date(),
              guardianInfo: input.guardianInfo,
              status: "active",
            },
          ],
          { session },
        );
        profile = studentProfile;

        if (input.classId && input.sectionId && input.academicYearId && input.rollNumber) {
          await Enrollment.create(
            [
              {
                studentId: studentProfile._id,
                classId: input.classId,
                sectionId: input.sectionId,
                academicYearId: input.academicYearId,
                rollNumber: input.rollNumber,
                status: "active",
              },
            ],
            { session },
          );
        }
      } else if (input.role === ROLES.PARENT) {
        const [parentProfile] = await ParentProfile.create(
          [{ userId: user._id, firstName: input.firstName, lastName: input.lastName, phone: input.phone }],
          { session },
        );
        profile = parentProfile;
      } else if (input.role === ROLES.TEACHER) {
        const employeeId = input.employeeId ?? (await nextEmployeeId("TCH"));
        const [teacherProfile] = await TeacherProfile.create(
          [
            {
              userId: user._id,
              employeeId,
              firstName: input.firstName,
              lastName: input.lastName,
              designation: input.designation,
              departmentId: input.departmentId,
              phone: input.phone,
              status: "active",
            },
          ],
          { session },
        );
        profile = teacherProfile;
      } else {
        // staff, admin, academic_admin, super_admin all get a StaffProfile
        const employeeId = input.employeeId ?? (await nextEmployeeId("STF"));
        const [staffProfile] = await StaffProfile.create(
          [
            {
              userId: user._id,
              employeeId,
              firstName: input.firstName,
              lastName: input.lastName,
              designation: input.designation,
              phone: input.phone,
              status: "active",
            },
          ],
          { session },
        );
        profile = staffProfile;
      }
    });

    await sendAccountCreatedEmail(input.email, temporaryPassword);

    return { userId: userId!, profile, temporaryPassword };
  } finally {
    await session.endSession();
  }
}
