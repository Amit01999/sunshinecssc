import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { TimetableSlot } from "../models/Timetable.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { TeachingAssignment } from "../models/TeachingAssignment.model";
import { ROLES } from "../utils/roles";
import { getTeacherProfileId } from "../services/teachingScope.service";
import { resolveParentScopedStudentId } from "../utils/parentScope";

async function assertNoTeacherConflict(input: {
  academicYearId: string;
  teacherId: string;
  dayOfWeek: number;
  periodIndex: number;
  excludeId?: string;
}) {
  const conflict = await TimetableSlot.findOne({
    academicYearId: input.academicYearId,
    teacherId: input.teacherId,
    dayOfWeek: input.dayOfWeek,
    periodIndex: input.periodIndex,
    ...(input.excludeId ? { _id: { $ne: input.excludeId } } : {}),
  });
  if (conflict) {
    throw ApiError.conflict("This teacher is already scheduled for another class at this day/period");
  }
}

/** A timetable slot must derive from a real teaching assignment - otherwise a class could be
 *  scheduled for a teacher/subject combination nobody was ever assigned to teach there. */
async function assertBackedByTeachingAssignment(input: {
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
}) {
  const exists = await TeachingAssignment.exists({
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
    subjectId: input.subjectId,
    teacherId: input.teacherId,
  });
  if (!exists) {
    throw ApiError.badRequest("This teacher is not assigned to teach this subject for this class/section");
  }
}

export const createSlot = asyncHandler(async (req: Request, res: Response) => {
  await assertBackedByTeachingAssignment(req.body);
  await assertNoTeacherConflict(req.body);
  const slot = await TimetableSlot.create(req.body);
  return created(res, slot);
});

export const updateSlot = asyncHandler(async (req: Request, res: Response) => {
  const slot = await TimetableSlot.findById(req.params.id);
  if (!slot) throw ApiError.notFound("Timetable slot not found");
  const merged = {
    academicYearId: req.body.academicYearId ?? String(slot.academicYearId),
    classId: req.body.classId ?? String(slot.classId),
    sectionId: req.body.sectionId ?? String(slot.sectionId),
    subjectId: req.body.subjectId ?? String(slot.subjectId),
    teacherId: req.body.teacherId ?? String(slot.teacherId),
    dayOfWeek: req.body.dayOfWeek ?? slot.dayOfWeek,
    periodIndex: req.body.periodIndex ?? slot.periodIndex,
  };
  await assertBackedByTeachingAssignment(merged);
  await assertNoTeacherConflict({ ...merged, excludeId: String(slot._id) });
  Object.assign(slot, req.body);
  await slot.save();
  return ok(res, slot);
});

export const deleteSlot = asyncHandler(async (req: Request, res: Response) => {
  const slot = await TimetableSlot.findByIdAndDelete(req.params.id);
  if (!slot) throw ApiError.notFound("Timetable slot not found");
  return ok(res, { message: "Slot deleted" });
});

export const publishClassTimetable = asyncHandler(async (req: Request, res: Response) => {
  await TimetableSlot.updateMany(
    { classId: req.params.classId, sectionId: req.query.sectionId },
    { isPublished: true },
  );
  return ok(res, { message: "Timetable published" });
});

export const listSlots = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};

  if (req.user!.role === ROLES.STUDENT) {
    const student = await StudentProfile.findOne({ userId: req.user!.id });
    if (!student) return ok(res, []);
    filter.classId = student.classId;
    filter.sectionId = student.sectionId;
    filter.isPublished = true;
  } else if (req.user!.role === ROLES.TEACHER) {
    const teacherProfileId = await getTeacherProfileId(req.user!.id);
    filter.teacherId = teacherProfileId;
  } else if (req.user!.role === ROLES.PARENT) {
    const studentId = await resolveParentScopedStudentId(req, req.query.studentId as string | undefined);
    const student = studentId ? await StudentProfile.findById(studentId) : null;
    if (!student) return ok(res, []);
    filter.classId = student.classId;
    filter.sectionId = student.sectionId;
    filter.isPublished = true;
  } else {
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
  }

  const slots = await TimetableSlot.find(filter)
    .populate(["classId", "sectionId", "subjectId", "teacherId"])
    .sort({ dayOfWeek: 1, periodIndex: 1 });
  return ok(res, slots);
});
