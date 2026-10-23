import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { Section } from "../models/Section.model";
import { SchoolClass } from "../models/SchoolClass.model";
import { AcademicYear } from "../models/AcademicYear.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { Enrollment } from "../models/Enrollment.model";
import { writeAuditLog } from "../models/AuditLog.model";

/** Public: just enough for the admissions form's "applying for" dropdown - no auth, no
 *  sensitive fields, scoped to whichever academic year is currently active. */
export const publicList = asyncHandler(async (_req: Request, res: Response) => {
  const activeYear = await AcademicYear.findOne({ isActive: true }).select("_id").lean();
  if (!activeYear) return ok(res, []);
  const classes = await SchoolClass.find({ academicYearId: activeYear._id })
    .select("name order")
    .sort({ order: 1, name: 1 })
    .lean();
  return ok(res, classes);
});

export const listSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = await Section.find({ classId: req.params.classId }).sort({ name: 1 });
  return ok(res, sections);
});

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await Section.create({ ...req.body, classId: req.params.classId });
  return created(res, section);
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await Section.findOneAndUpdate(
    { _id: req.params.sectionId, classId: req.params.classId },
    req.body,
    { new: true },
  );
  if (!section) throw ApiError.notFound("Section not found");
  return ok(res, section);
});

export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await Section.findOneAndDelete({ _id: req.params.sectionId, classId: req.params.classId });
  if (!section) throw ApiError.notFound("Section not found");
  return ok(res, { message: "Section deleted" });
});

export const classRoster = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { classId: req.params.classId, status: "active" };
  if (req.query.sectionId) filter.sectionId = req.query.sectionId;
  const students = await StudentProfile.find(filter)
    .populate("sectionId", "name")
    .populate("userId", "email mustChangePassword")
    .sort({ rollNumber: 1 });
  return ok(res, students);
});

export const transferStudent = asyncHandler(async (req: Request, res: Response) => {
  const { classId, sectionId, rollNumber } = req.body;
  const student = await StudentProfile.findById(req.params.studentId);
  if (!student) throw ApiError.notFound("Student not found");

  // The target class carries its own academicYearId (classes are year-scoped), so a transfer
  // into a class from a different year must move the student's year pointer along with it -
  // otherwise the new Enrollment row and the student's "current" year silently go stale.
  const targetClass = await SchoolClass.findById(classId).select("academicYearId");
  if (!targetClass) throw ApiError.notFound("Target class not found");

  const targetSection = await Section.findOne({ _id: sectionId, classId }).select("_id");
  if (!targetSection) throw ApiError.badRequest("Target section does not belong to the target class");

  const before = {
    classId: student.classId,
    sectionId: student.sectionId,
    rollNumber: student.rollNumber,
    academicYearId: student.academicYearId,
  };

  // Wrapped in a transaction: closing the old Enrollment row and opening the new one (which can
  // fail on a roll-number collision in the target section) must succeed or fail together, or a
  // failed transfer would leave the student with no active enrollment at all.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Enrollment.updateMany(
        { studentId: student._id, status: "active" },
        { status: "transferred", transferredAt: new Date() },
        { session },
      );

      await Enrollment.create(
        [
          {
            studentId: student._id,
            classId,
            sectionId,
            academicYearId: targetClass.academicYearId,
            rollNumber,
            status: "active",
            previousClassId: before.classId,
            previousSectionId: before.sectionId,
          },
        ],
        { session },
      );

      student.classId = classId;
      student.sectionId = sectionId;
      student.rollNumber = rollNumber;
      student.academicYearId = targetClass.academicYearId as any;
      await student.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "student.transfer",
    targetType: "StudentProfile",
    targetId: student._id,
    before,
    after: { classId, sectionId, rollNumber, academicYearId: targetClass.academicYearId },
    ip: req.ip,
  });

  return ok(res, student);
});
