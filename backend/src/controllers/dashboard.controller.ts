import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok } from "../utils/ApiResponse";
import { ROLES } from "../utils/roles";
import { User } from "../models/User.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { SchoolClass } from "../models/SchoolClass.model";
import { Department } from "../models/Department.model";
import { Attendance } from "../models/Attendance.model";
import { Examination } from "../models/Examination.model";
import { Event } from "../models/Event.model";
import { AdmissionApplication } from "../models/AdmissionApplication.model";
import { LeaveApplication } from "../models/LeaveApplication.model";
import { ExamResult } from "../models/ExamResult.model";
import { AuditLog } from "../models/AuditLog.model";
import { Assignment } from "../models/Assignment.model";
import { AssignmentSubmission } from "../models/AssignmentSubmission.model";
import { TeachingAssignment } from "../models/TeachingAssignment.model";
import { TimetableSlot } from "../models/Timetable.model";
import { getTeacherProfileId, getTeacherAssociatedStudentUserIds } from "../services/teachingScope.service";
import { getChildrenForParent } from "../services/userProfile.service";
import { computeAttendanceSummary } from "../services/attendanceSummary.service";
import { Notice } from "../models/Notice.model";
import { buildAudienceFilter } from "../utils/audienceFilter";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function adminSummary() {
  const today = startOfToday();
  const [
    totalStudents,
    totalParents,
    totalTeachers,
    totalStaff,
    activeClasses,
    activeDepartments,
    todayAttendance,
    upcomingExaminations,
    upcomingEvents,
    pendingAdmissions,
    pendingLeaveApplications,
    pendingResultApprovals,
    pendingFirstLogin,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.STUDENT, isActive: true }),
    User.countDocuments({ role: ROLES.PARENT, isActive: true }),
    User.countDocuments({ role: ROLES.TEACHER, isActive: true }),
    User.countDocuments({ role: ROLES.STAFF, isActive: true }),
    SchoolClass.countDocuments(),
    Department.countDocuments({ isPublished: true }),
    Attendance.aggregate([{ $match: { date: today } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Examination.find({ status: { $in: ["scheduled", "ongoing"] } }).sort({ createdAt: -1 }).limit(5),
    Event.find({ status: "published", startDate: { $gte: today } }).sort({ startDate: 1 }).limit(5),
    AdmissionApplication.countDocuments({ status: { $in: ["pending", "under_review"] } }),
    LeaveApplication.countDocuments({ status: "pending" }),
    ExamResult.countDocuments({ status: "submitted" }),
    User.countDocuments({ mustChangePassword: true, isActive: true }),
    AuditLog.find().sort({ createdAt: -1 }).limit(10).populate("actorId", "email role"),
  ]);

  const attendanceCounts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const row of todayAttendance as { _id: string; count: number }[]) attendanceCounts[row._id] = row.count;

  return {
    totals: { students: totalStudents, parents: totalParents, teachers: totalTeachers, staff: totalStaff, classes: activeClasses, departments: activeDepartments },
    todayAttendance: attendanceCounts,
    upcomingExaminations,
    upcomingEvents,
    pending: {
      admissions: pendingAdmissions,
      leaveApplications: pendingLeaveApplications,
      resultApprovals: pendingResultApprovals,
      firstLogin: pendingFirstLogin,
    },
    recentActivity,
  };
}

async function teacherSummary(userId: string) {
  const teacherProfileId = await getTeacherProfileId(userId);
  if (!teacherProfileId) {
    return { assignments: [], todayTimetable: [], pendingGrading: 0, upcomingExaminations: [], rejectedResults: 0, pendingStudentLeaveRequests: 0 };
  }

  const today = new Date().getDay();
  const assignments = await TeachingAssignment.find({ teacherId: teacherProfileId }).populate(["classId", "sectionId", "subjectId"]);
  // classId is populated above, so pull its _id rather than stringifying the whole document.
  const classIds = [...new Set(assignments.filter((a) => a.classId).map((a) => String((a.classId as unknown as { _id: unknown })._id)))];

  const [todayTimetable, myAssignments, upcomingExaminations, rejectedResults, associatedStudentUserIds] = await Promise.all([
    TimetableSlot.find({ teacherId: teacherProfileId, dayOfWeek: today, isPublished: true })
      .populate(["classId", "sectionId", "subjectId"])
      .sort({ periodIndex: 1 }),
    Assignment.find({ teacherId: teacherProfileId }).select("_id"),
    // Scoped to classes this teacher actually teaches - previously returned examinations system-wide.
    Examination.find({ classId: { $in: classIds }, status: { $in: ["scheduled", "ongoing"] } })
      .populate("classId", "name")
      .limit(5),
    ExamResult.countDocuments({ enteredBy: userId, status: "rejected" }),
    getTeacherAssociatedStudentUserIds(teacherProfileId),
  ]);

  const [pendingGrading, pendingStudentLeaveRequests] = await Promise.all([
    AssignmentSubmission.countDocuments({
      assignmentId: { $in: myAssignments.map((a) => a._id) },
      status: "submitted",
    }),
    LeaveApplication.countDocuments({
      applicantRole: "student",
      applicantId: { $in: associatedStudentUserIds },
      status: "pending",
    }),
  ]);

  return { assignments, todayTimetable, pendingGrading, upcomingExaminations, rejectedResults, pendingStudentLeaveRequests };
}

/** The full dashboard payload for one student - attendance, upcoming exams, pending
 *  assignments, recent published results, and scoped notices. Shared by the student's own
 *  dashboard and the parent dashboard for a selected child, so the two can never drift apart
 *  (e.g. a different "pending assignments" definition) the way they used to. */
async function buildChildDashboardPayload(
  student: { _id: unknown; classId?: unknown; sectionId?: unknown; academicYearId?: unknown },
  noticeFilter: Record<string, unknown>,
) {
  const [attendanceSummary, upcomingExaminations, pendingAssignments, recentResults, notices] = await Promise.all([
    // Scoped to the student's own current enrollment year - never the globally "active" year,
    // which may not be the year this student is actually enrolled in (e.g. not yet promoted).
    computeAttendanceSummary(student._id as any, { academicYearId: student.academicYearId as any }),
    Examination.find({ classId: student.classId, status: { $in: ["scheduled", "ongoing"] } }).limit(5),
    Assignment.find({ classId: student.classId, sectionId: student.sectionId, status: "published", dueDate: { $gte: new Date() } }).limit(5),
    ExamResult.find({ studentId: student._id, status: "published" }).sort({ publishedAt: -1 }).limit(5).populate("subjectId", "name"),
    Notice.find(noticeFilter).sort({ isPinned: -1, createdAt: -1 }).limit(5),
  ]);

  return {
    student,
    attendancePercentage: attendanceSummary.percentage,
    attendanceAcademicYearId: student.academicYearId ? String(student.academicYearId) : null,
    upcomingExaminations,
    pendingAssignments,
    recentResults,
    notices,
  };
}

async function studentSummary(req: Request) {
  const student = await StudentProfile.findOne({ userId: req.user!.id }).populate(["classId", "sectionId"]);
  if (!student) return null;

  // Same audience/class scoping as /notices/mine - this widget must never show a notice the
  // student couldn't also see on the dedicated Notices page (e.g. a "teachers only" or a
  // different class's notice).
  const noticeFilter = await buildAudienceFilter(req);
  return buildChildDashboardPayload(student, noticeFilter);
}

/** Full dashboard for ONE of the parent's verified children - the one named by ?studentId=,
 *  or the first linked child if none was specified (matching the frontend's own default).
 *  Also returns the parent's full child list so the UI never needs a second call just to
 *  render the child switcher/context card. */
async function parentSummary(req: Request) {
  const childIds = await getChildrenForParent(req.user!.id);
  if (!childIds.length) return { hasChildren: false, children: [] };

  const requestedStudentId = req.query.studentId as string | undefined;
  if (requestedStudentId && !childIds.some((id) => String(id) === requestedStudentId)) {
    throw ApiError.forbidden();
  }
  const selectedId = requestedStudentId ?? String(childIds[0]);

  // Notices use the parent's own aggregated audience (same as /notices/mine: every linked
  // child's class, plus "all"/"parents") rather than a single child's, so the dashboard widget
  // and the dedicated Notices page never disagree about what this parent account can see.
  const [selectedStudent, children, noticeFilter] = await Promise.all([
    StudentProfile.findById(selectedId).populate(["classId", "sectionId"]),
    StudentProfile.find({ _id: { $in: childIds } })
      .select("firstName lastName studentCode classId sectionId")
      .populate(["classId", "sectionId"])
      .lean(),
    buildAudienceFilter(req),
  ]);
  if (!selectedStudent) return { hasChildren: true, children, selectedChildId: null };

  const payload = await buildChildDashboardPayload(selectedStudent, noticeFilter);
  return { hasChildren: true, children, selectedChildId: String(selectedStudent._id), ...payload };
}

export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACADEMIC_ADMIN].includes(role as any)) {
    return ok(res, await adminSummary());
  }
  if (role === ROLES.TEACHER) {
    return ok(res, await teacherSummary(req.user!.id));
  }
  if (role === ROLES.STUDENT) {
    return ok(res, await studentSummary(req));
  }
  if (role === ROLES.PARENT) {
    return ok(res, await parentSummary(req));
  }
  return ok(res, {});
});
