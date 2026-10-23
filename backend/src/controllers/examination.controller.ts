import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { Examination } from "../models/Examination.model";
import { ExamResult } from "../models/ExamResult.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { writeAuditLog } from "../models/AuditLog.model";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { getTeacherProfileId, canTeacherAccessSubject } from "../services/teachingScope.service";
import { getChildrenForParent } from "../services/userProfile.service";
import { computeGrade } from "../utils/grading";
import { resolveParentScopedStudentId } from "../utils/parentScope";
import { assertSubjectApplicableToClass } from "../utils/subjectScope";

export const createExamination = asyncHandler(async (req: Request, res: Response) => {
  const subjects = req.body.subjects ?? [];
  for (const subjectConfig of subjects) {
    await assertSubjectApplicableToClass(subjectConfig.subjectId, req.body.classId);
  }

  const examination = await Examination.create({ ...req.body, createdBy: req.user!.id });
  return created(res, examination);
});

export const listExaminations = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;

  if (req.user!.role === ROLES.STUDENT) {
    const student = await StudentProfile.findOne({ userId: req.user!.id });
    if (!student) return ok(res, []);
    filter.classId = student.classId;
  } else if (req.user!.role === ROLES.PARENT) {
    const studentId = await resolveParentScopedStudentId(req, req.query.studentId as string | undefined);
    const student = studentId ? await StudentProfile.findById(studentId) : null;
    if (!student) return ok(res, []);
    filter.classId = student.classId;
  }

  const examinations = await Examination.find(filter).populate("classId").populate("subjects.subjectId").sort({ createdAt: -1 });
  return ok(res, examinations);
});

export const getExamination = asyncHandler(async (req: Request, res: Response) => {
  const examination = await Examination.findById(req.params.id).populate("classId").populate("subjects.subjectId");
  if (!examination) throw ApiError.notFound("Examination not found");
  return ok(res, examination);
});

/** Teacher enters or edits marks for a subject they teach - creates drafts, or re-opens rejected entries. */
export const enterMarks = asyncHandler(async (req: Request, res: Response) => {
  const examination = await Examination.findById(req.params.id);
  if (!examination) throw ApiError.notFound("Examination not found");

  const { subjectId, marks } = req.body;
  const subjectConfig = examination.subjects.find((s) => String(s.subjectId) === subjectId);
  if (!subjectConfig) throw ApiError.badRequest("This subject is not configured for this examination");

  let teacherProfileId: string | undefined;
  if (!ADMIN_ROLES.includes(req.user!.role as any)) {
    teacherProfileId = (await getTeacherProfileId(req.user!.id))?.toString();
    if (!teacherProfileId) throw ApiError.forbidden();
  }

  const results = [];
  for (const mark of marks) {
    if (mark.marksObtained > subjectConfig.maxMarks) {
      throw ApiError.badRequest(`Marks for one student exceed the maximum of ${subjectConfig.maxMarks}`);
    }
    const student = await StudentProfile.findById(mark.studentId).select("sectionId");
    if (!student) throw ApiError.notFound(`Student ${mark.studentId} not found`);

    if (teacherProfileId) {
      const canAccess = await canTeacherAccessSubject(
        teacherProfileId,
        String(examination.classId),
        String(student.sectionId),
        subjectId,
      );
      if (!canAccess) throw ApiError.forbidden(`You are not assigned to teach this subject for student ${mark.studentId}`);
    }

    const existing = await ExamResult.findOne({ examinationId: examination._id, studentId: mark.studentId, subjectId });
    if (existing && ["approved", "published"].includes(existing.status)) {
      throw ApiError.conflict("This result has already been approved and can no longer be edited directly");
    }

    const grade = computeGrade(mark.marksObtained, subjectConfig.maxMarks);
    const doc = await ExamResult.findOneAndUpdate(
      { examinationId: examination._id, studentId: mark.studentId, subjectId },
      {
        examinationId: examination._id,
        studentId: mark.studentId,
        subjectId,
        marksObtained: mark.marksObtained,
        grade,
        remarks: mark.remarks,
        status: "draft",
        enteredBy: req.user!.id,
        rejectedReason: undefined,
      },
      { upsert: true, new: true },
    );
    results.push(doc);
  }

  return created(res, results);
});

export const submitResultsForApproval = asyncHandler(async (req: Request, res: Response) => {
  const { resultIds } = req.body;
  const results = await ExamResult.find({ _id: { $in: resultIds } });
  for (const result of results) {
    if (result.status !== "draft") throw ApiError.conflict(`Result ${result._id} is not a draft`);
    if (!ADMIN_ROLES.includes(req.user!.role as any) && String(result.enteredBy) !== String(req.user!.id)) {
      throw ApiError.forbidden("You can only submit results you entered yourself");
    }
  }

  await ExamResult.updateMany({ _id: { $in: resultIds } }, { status: "submitted", submittedAt: new Date() });
  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "exam_result.submit",
    targetType: "ExamResult",
    after: { resultIds },
    ip: req.ip,
  });
  return ok(res, { message: `${results.length} result(s) submitted for approval` });
});

export const approveResults = asyncHandler(async (req: Request, res: Response) => {
  const { resultIds } = req.body;
  const results = await ExamResult.find({ _id: { $in: resultIds }, status: "submitted" });
  if (results.length !== resultIds.length) {
    throw ApiError.badRequest("Some results are not in a submitted state");
  }
  await ExamResult.updateMany(
    { _id: { $in: resultIds } },
    { status: "approved", approvedBy: req.user!.id, approvedAt: new Date() },
  );
  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "exam_result.approve",
    targetType: "ExamResult",
    after: { resultIds },
    ip: req.ip,
  });
  return ok(res, { message: `${results.length} result(s) approved` });
});

export const rejectResults = asyncHandler(async (req: Request, res: Response) => {
  const { resultIds, reason } = req.body;
  await ExamResult.updateMany(
    { _id: { $in: resultIds }, status: "submitted" },
    { status: "rejected", rejectedReason: reason },
  );
  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "exam_result.reject",
    targetType: "ExamResult",
    after: { resultIds, reason },
    ip: req.ip,
  });
  return ok(res, { message: "Result(s) rejected and returned to the teacher" });
});

export const publishResults = asyncHandler(async (req: Request, res: Response) => {
  const { resultIds } = req.body;
  const isAdmin = ADMIN_ROLES.includes(req.user!.role as any);

  if (isAdmin) {
    // Unchanged admin path: only results an admin has already approved can be published.
    const results = await ExamResult.find({ _id: { $in: resultIds }, status: "approved" });
    if (results.length !== resultIds.length) {
      throw ApiError.badRequest("Only approved results can be published");
    }
    await ExamResult.updateMany({ _id: { $in: resultIds } }, { status: "published", publishedAt: new Date() });
  } else {
    // Teacher direct-publish: skips the submit/approve steps entirely for results they entered
    // themselves. Already-published results are left alone rather than erroring on a no-op.
    const results = await ExamResult.find({ _id: { $in: resultIds } });
    if (results.length !== resultIds.length) throw ApiError.notFound("Some results were not found");
    if (results.some((r) => String(r.enteredBy) !== String(req.user!.id))) {
      throw ApiError.forbidden("You can only publish results you entered yourself");
    }
    const toPublish = results.filter((r) => r.status !== "published").map((r) => r._id);
    await ExamResult.updateMany({ _id: { $in: toPublish } }, { status: "published", publishedAt: new Date() });
  }

  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "exam_result.publish",
    targetType: "ExamResult",
    after: { resultIds },
    ip: req.ip,
  });
  return ok(res, { message: `${resultIds.length} result(s) published` });
});

export const listResults = asyncHandler(async (req: Request, res: Response) => {
  const { examinationId, studentId, subjectId, status, classId, academicYearId } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = {};
  if (subjectId) filter.subjectId = subjectId;
  if (status) filter.status = status;

  if (examinationId) {
    filter.examinationId = examinationId;
  } else if (classId || academicYearId) {
    // Admin's cross-class/cross-year result browser - resolve to the matching exams first,
    // since class/year aren't stored directly on ExamResult.
    const examFilter: Record<string, unknown> = {};
    if (classId) examFilter.classId = classId;
    if (academicYearId) examFilter.academicYearId = academicYearId;
    const examIds = await Examination.find(examFilter).distinct("_id");
    filter.examinationId = { $in: examIds };
  }

  if (req.user!.role === ROLES.STUDENT) {
    const student = await StudentProfile.findOne({ userId: req.user!.id });
    if (!student) return ok(res, []);
    filter.studentId = student._id;
    filter.status = "published";
  } else if (req.user!.role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(req.user!.id);
    if (studentId && !childIds.some((id) => String(id) === studentId)) throw ApiError.forbidden();
    filter.studentId = studentId ?? { $in: childIds };
    filter.status = "published";
  } else if (req.user!.role === ROLES.TEACHER) {
    if (studentId) filter.studentId = studentId;
    filter.enteredBy = req.user!.id;
  } else {
    if (studentId) filter.studentId = studentId;
  }

  const results = await ExamResult.find(filter)
    .populate("studentId", "firstName lastName studentCode")
    .populate("subjectId", "name code")
    .populate({
      path: "examinationId",
      // "subjects" (each row's maxMarks/passMarks/examDate) is included so the frontend can group
      // a student's individual subject results into one complete, totaled examination result
      // without guessing at full marks - see /portal/results.
      select: "name examType classId academicYearId subjects",
      populate: [
        { path: "classId", select: "name" },
        { path: "academicYearId", select: "name" },
        { path: "subjects.subjectId", select: "name code" },
      ],
    })
    .sort({ updatedAt: -1 });
  return ok(res, results);
});
