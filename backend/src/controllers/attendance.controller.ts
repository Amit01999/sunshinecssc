import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { Attendance } from "../models/Attendance.model";
import { AttendanceCorrectionRequest } from "../models/AttendanceCorrectionRequest.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { SchoolClass } from "../models/SchoolClass.model";
import { Section } from "../models/Section.model";
import { Enrollment } from "../models/Enrollment.model";
import { AcademicYear } from "../models/AcademicYear.model";
import { writeAuditLog } from "../models/AuditLog.model";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { getTeacherProfileId, canTeacherAccessSection } from "../services/teachingScope.service";
import { getChildrenForParent } from "../services/userProfile.service";
import { computeAttendanceSummary } from "../services/attendanceSummary.service";

const EDIT_WINDOW_DAYS = 2;

// markAttendance anchors the stored `date` to the server's *local* midnight, not UTC. $dateToString
// defaults to UTC, so formatting it back into a "YYYY-MM-DD" grouping key needs this same local
// offset explicitly, or the key silently lands on the wrong calendar day near local midnight.
function localMongoTimezone(): string {
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** `new Date("YYYY-MM-DD")` parses as UTC midnight, which doesn't line up with the local-midnight
 *  anchoring above - so a date-only "from"/"to" (e.g. from an HTML date input) can silently miss
 *  records near local midnight. Build the bound directly from the Y/M/D digits instead; this works
 *  the same whether the input is a bare date or a full ISO timestamp (only the first 10 chars are used). */
function localDayBound(dateStr: string, end: boolean): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return end ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function withinEditWindow(date: Date): boolean {
  const diffMs = Date.now() - new Date(date).getTime();
  return diffMs <= EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** A record is freely editable by a teacher for a short window after the day it covers; after
 *  that (or once an admin has explicitly locked it) it requires an approved correction request. */
function isEditable(attendance: { isLocked: boolean; date: Date }): boolean {
  return !attendance.isLocked && withinEditWindow(attendance.date);
}

async function assertTeacherCanMark(req: Request, classId: string, sectionId: string) {
  if (ADMIN_ROLES.includes(req.user!.role as any)) return;
  if (req.user!.role !== ROLES.TEACHER) throw ApiError.forbidden();
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId || !(await canTeacherAccessSection(teacherProfileId, classId, sectionId))) {
    throw ApiError.forbidden("You are not assigned to this class/section");
  }
}

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { classId, sectionId, academicYearId, date, records } = req.body;
  await assertTeacherCanMark(req, classId, sectionId);

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const results = [];
  for (const record of records) {
    const existing = await Attendance.findOne({ studentId: record.studentId, date: day });
    if (existing && !isEditable(existing)) {
      throw ApiError.conflict(
        `Attendance for ${record.studentId} on ${day.toDateString()} is locked. Submit a correction request instead.`,
      );
    }
    const doc = await Attendance.findOneAndUpdate(
      { studentId: record.studentId, date: day },
      {
        studentId: record.studentId,
        classId,
        sectionId,
        academicYearId,
        date: day,
        status: record.status,
        remarks: record.remarks,
        markedBy: req.user!.id,
      },
      { upsert: true, new: true },
    );
    results.push(doc);
  }

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "attendance.mark",
    targetType: "Attendance",
    after: { classId, sectionId, date: day, count: results.length },
    ip: req.ip,
  });

  return created(res, results);
});

export const updateAttendanceRecord = asyncHandler(async (req: Request, res: Response) => {
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) throw ApiError.notFound("Attendance record not found");
  await assertTeacherCanMark(req, String(attendance.classId), String(attendance.sectionId));

  if (!isEditable(attendance)) {
    throw ApiError.conflict("This record is locked. Submit a correction request instead.");
  }

  const before = attendance.toObject();
  attendance.status = req.body.status;
  attendance.remarks = req.body.remarks;
  await attendance.save();

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "attendance.update",
    targetType: "Attendance",
    targetId: attendance._id,
    before: { status: before.status },
    after: { status: attendance.status },
    ip: req.ip,
  });

  return ok(res, attendance);
});

export const listAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, classId, sectionId, from, to } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  let isAdminBranch = false;

  if (req.user!.role === ROLES.STUDENT) {
    const profile = await StudentProfile.findOne({ userId: req.user!.id }).select("_id");
    if (!profile) return ok(res, []);
    filter.studentId = profile._id;
  } else if (req.user!.role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(req.user!.id);
    if (studentId && !childIds.some((id) => String(id) === studentId)) {
      throw ApiError.forbidden("You can only view attendance for your own linked children");
    }
    filter.studentId = studentId ?? { $in: childIds };
  } else if (req.user!.role === ROLES.TEACHER) {
    if (!classId || !sectionId) {
      throw ApiError.badRequest("classId and sectionId are required");
    }
    const teacherProfileId = await getTeacherProfileId(req.user!.id);
    if (!teacherProfileId || !(await canTeacherAccessSection(teacherProfileId, classId, sectionId))) {
      throw ApiError.forbidden("You are not assigned to this class/section");
    }
    filter.classId = classId;
    filter.sectionId = sectionId;
    if (studentId) filter.studentId = studentId;
  } else {
    isAdminBranch = true;
    if (studentId) filter.studentId = studentId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
  }

  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, unknown>).$gte = localDayBound(from, false);
    if (to) (filter.date as Record<string, unknown>).$lte = localDayBound(to, true);
  }

  let query = Attendance.find(filter).sort({ date: -1 }).limit(1000);
  // Only the admin/staff branch gets enriched records - student/parent/teacher branches compare
  // studentId as a raw string against roster ids, which populate() would break.
  if (isAdminBranch) {
    query = query.populate([
      { path: "studentId", select: "firstName lastName rollNumber studentCode" },
      { path: "classId", select: "name" },
      { path: "sectionId", select: "name" },
      { path: "markedBy", select: "email role" },
    ]);
  }
  const records = await query;
  return ok(res, records);
});

/** Resolves which academic year a bare (no ?academicYearId) summary request should use: the
 *  student's own current enrollment year, per StudentProfile.academicYearId - never the
 *  globally "active" AcademicYear, which may not be the year this particular student is
 *  actually enrolled in (e.g. not yet promoted). */
async function resolveDefaultAcademicYearId(studentId: string): Promise<string | undefined> {
  const student = await StudentProfile.findById(studentId).select("academicYearId");
  return student?.academicYearId ? String(student.academicYearId) : undefined;
}

export const attendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  if (req.user!.role === ROLES.STUDENT) {
    const profile = await StudentProfile.findOne({ userId: req.user!.id }).select("_id");
    if (!profile || String(profile._id) !== studentId) throw ApiError.forbidden();
  } else if (req.user!.role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(req.user!.id);
    if (!childIds.some((id) => String(id) === studentId)) throw ApiError.forbidden();
  }

  const requestedYear = req.query.academicYearId as string | undefined;
  let academicYearId: string | undefined;
  if (requestedYear === "all") {
    academicYearId = undefined;
  } else if (requestedYear) {
    if (!Types.ObjectId.isValid(requestedYear)) throw ApiError.badRequest("Invalid academicYearId");
    const exists = await AcademicYear.exists({ _id: requestedYear });
    if (!exists) throw ApiError.badRequest("Academic year not found");
    academicYearId = requestedYear;
  } else {
    academicYearId = await resolveDefaultAcademicYearId(studentId);
  }

  const from = req.query.from ? localDayBound(String(req.query.from), false) : undefined;
  const to = req.query.to ? localDayBound(String(req.query.to), true) : undefined;

  const summary = await computeAttendanceSummary(studentId, { academicYearId, from, to });
  return ok(res, summary);
});

/** Academic years a student can meaningfully pick in the attendance year selector: every year
 *  they've been enrolled in (even with zero attendance recorded) plus any year that happens to
 *  have attendance records, so historical data is never unreachable from the dropdown. */
export const attendanceYearOptions = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  if (req.user!.role === ROLES.STUDENT) {
    const profile = await StudentProfile.findOne({ userId: req.user!.id }).select("_id");
    if (!profile || String(profile._id) !== studentId) throw ApiError.forbidden();
  } else if (req.user!.role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(req.user!.id);
    if (!childIds.some((id) => String(id) === studentId)) throw ApiError.forbidden();
  }

  const [enrollmentYearIds, attendanceYearIds, student] = await Promise.all([
    Enrollment.find({ studentId }).distinct("academicYearId"),
    Attendance.find({ studentId }).distinct("academicYearId"),
    StudentProfile.findById(studentId).select("academicYearId"),
  ]);
  const idSet = new Set<string>([...enrollmentYearIds, ...attendanceYearIds].map(String));
  if (student?.academicYearId) idSet.add(String(student.academicYearId));

  const years = await AcademicYear.find({ _id: { $in: [...idSet] } })
    .select("name startDate endDate isActive")
    .sort({ startDate: -1 });

  return ok(res, {
    years,
    currentAcademicYearId: student?.academicYearId ? String(student.academicYearId) : null,
  });
});

interface ClassSectionRow {
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  enrolled: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

/** Admin-only aggregated attendance view: enrollment + attendance counts grouped by class/section
 *  and by date, computed in the database rather than pulling raw records into the app. Backs the
 *  admin dashboard's summary cards, daily class/section coverage table, and monthly report -
 *  three UI needs sharing one query shape (a date range, optionally narrowed to one class/section). */
export const attendanceAdminSummary = asyncHandler(async (req: Request, res: Response) => {
  const { academicYearId, classId, sectionId, from, to } = req.query as Record<string, string | undefined>;
  if (!academicYearId || !from || !to) {
    throw ApiError.badRequest("academicYearId, from, and to are required");
  }

  const fromDate = localDayBound(from, false);
  const toDate = localDayBound(to, true);

  const classFilter: Record<string, unknown> = { academicYearId };
  if (classId) classFilter._id = classId;
  const classes = await SchoolClass.find(classFilter).select("_id name").lean();
  const classIds = classes.map((c) => c._id);
  const classNameById = new Map(classes.map((c) => [String(c._id), c.name]));

  const studentMatch: Record<string, unknown> = { status: "active", classId: { $in: classIds } };
  const attendanceMatch: Record<string, unknown> = { classId: { $in: classIds }, date: { $gte: fromDate, $lte: toDate } };
  if (sectionId) {
    const sectionObjectId = new Types.ObjectId(sectionId);
    studentMatch.sectionId = sectionObjectId;
    attendanceMatch.sectionId = sectionObjectId;
  }

  const [enrolledRows, attendanceByClassSection, attendanceByDate, overallCounts, sectionDocs] = await Promise.all([
    StudentProfile.aggregate([
      { $match: studentMatch },
      { $group: { _id: { classId: "$classId", sectionId: "$sectionId" }, enrolled: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: attendanceMatch },
      { $group: { _id: { classId: "$classId", sectionId: "$sectionId", status: "$status" }, count: { $sum: 1 } } },
    ]),
    Attendance.aggregate([
      { $match: attendanceMatch },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: localMongoTimezone() } }, status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]),
    Attendance.aggregate([{ $match: attendanceMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Section.find({ classId: { $in: classIds } }).select("name classId").lean(),
  ]);

  const sectionNameById = new Map(sectionDocs.map((s) => [String(s._id), s.name]));
  const rows = new Map<string, ClassSectionRow>();
  const rowFor = (cId: string, sId: string): ClassSectionRow => {
    const key = `${cId}:${sId}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        classId: cId,
        sectionId: sId,
        className: classNameById.get(cId) ?? "Unknown",
        sectionName: sectionNameById.get(sId) ?? "Unknown",
        enrolled: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
      rows.set(key, row);
    }
    return row;
  };

  for (const e of enrolledRows as { _id: { classId: unknown; sectionId: unknown }; enrolled: number }[]) {
    rowFor(String(e._id.classId), String(e._id.sectionId)).enrolled = e.enrolled;
  }
  for (const a of attendanceByClassSection as { _id: { classId: unknown; sectionId: unknown; status: keyof ClassSectionRow }; count: number }[]) {
    rowFor(String(a._id.classId), String(a._id.sectionId))[a._id.status] = a.count as never;
  }

  const byDateMap = new Map<string, { date: string; present: number; absent: number; late: number; excused: number }>();
  for (const d of attendanceByDate as { _id: { date: string; status: "present" | "absent" | "late" | "excused" }; count: number }[]) {
    const row = byDateMap.get(d._id.date) ?? { date: d._id.date, present: 0, absent: 0, late: 0, excused: 0 };
    row[d._id.status] = d.count;
    byDateMap.set(d._id.date, row);
  }

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const c of overallCounts as { _id: keyof typeof counts; count: number }[]) counts[c._id] = c.count;
  const totalRecorded = counts.present + counts.absent + counts.late + counts.excused;
  const byClassSection = [...rows.values()].sort(
    (a, b) => a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName),
  );
  const totalEnrolled = byClassSection.reduce((sum, r) => sum + r.enrolled, 0);

  return ok(res, {
    totalEnrolled,
    counts,
    attendanceRate: totalRecorded > 0 ? Math.round(((counts.present + counts.late) / totalRecorded) * 1000) / 10 : 0,
    byClassSection,
    byDate: [...byDateMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
  });
});

export const requestCorrection = asyncHandler(async (req: Request, res: Response) => {
  const { attendanceId, requestedStatus, reason } = req.body;
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw ApiError.notFound("Attendance record not found");
  await assertTeacherCanMark(req, String(attendance.classId), String(attendance.sectionId));

  const correction = await AttendanceCorrectionRequest.create({
    attendanceId,
    requestedBy: req.user!.id,
    requestedStatus,
    reason,
  });
  return created(res, correction);
});

export const listCorrectionRequests = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = req.query.status;
  const requests = await AttendanceCorrectionRequest.find(filter)
    .populate("attendanceId")
    .populate("requestedBy", "email role")
    .sort({ createdAt: -1 });
  return ok(res, requests);
});

export const reviewCorrectionRequest = asyncHandler(async (req: Request, res: Response) => {
  const correctionRequest = await AttendanceCorrectionRequest.findById(req.params.id);
  if (!correctionRequest) throw ApiError.notFound("Correction request not found");
  if (correctionRequest.status !== "pending") throw ApiError.conflict("This request has already been reviewed");

  correctionRequest.status = req.body.status;
  correctionRequest.reviewedBy = req.user!.id as any;
  correctionRequest.reviewedAt = new Date();
  correctionRequest.reviewNote = req.body.reviewNote;
  await correctionRequest.save();

  if (req.body.status === "approved") {
    await Attendance.findByIdAndUpdate(correctionRequest.attendanceId, {
      status: correctionRequest.requestedStatus,
      isLocked: false,
    });
  }

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "attendance.correction_review",
    targetType: "AttendanceCorrectionRequest",
    targetId: correctionRequest._id,
    after: { status: req.body.status },
    ip: req.ip,
  });

  return ok(res, correctionRequest);
});
