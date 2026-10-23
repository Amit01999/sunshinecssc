import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ok, created } from "../utils/ApiResponse";
import { Assignment } from "../models/Assignment.model";
import { AssignmentSubmission } from "../models/AssignmentSubmission.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { ROLES, ADMIN_ROLES } from "../utils/roles";
import { getTeacherProfileId, canTeacherAccessSubject } from "../services/teachingScope.service";
import { assertValidUpload, uploadBuffer } from "../utils/uploadToCloudinary";
import { resolveParentScopedStudentId } from "../utils/parentScope";

async function assertTeacherOwnsAssignment(req: Request, assignment: { teacherId: unknown }) {
  if (ADMIN_ROLES.includes(req.user!.role as any)) return;
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId || String(teacherProfileId) !== String(assignment.teacherId)) {
    throw ApiError.forbidden("You do not own this assignment");
  }
}

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const teacherProfileId = await getTeacherProfileId(req.user!.id);
  if (!teacherProfileId) throw ApiError.forbidden("No teacher profile found for this account");

  const canAccess = await canTeacherAccessSubject(
    teacherProfileId,
    req.body.classId,
    req.body.sectionId,
    req.body.subjectId,
  );
  if (!canAccess) throw ApiError.forbidden("You are not assigned to teach this subject for this section");

  const assignment = await Assignment.create({ ...req.body, teacherId: teacherProfileId });
  return created(res, assignment);
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound("Assignment not found");
  await assertTeacherOwnsAssignment(req, assignment);
  Object.assign(assignment, req.body);
  await assignment.save();
  return ok(res, assignment);
});

export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound("Assignment not found");
  await assertTeacherOwnsAssignment(req, assignment);
  await AssignmentSubmission.deleteMany({ assignmentId: assignment._id });
  await assignment.deleteOne();
  return ok(res, { message: "Assignment deleted" });
});

export const uploadAssignmentAttachment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound("Assignment not found");
  await assertTeacherOwnsAssignment(req, assignment);

  const file = req.file;
  if (!file) throw ApiError.badRequest("No file provided");
  assertValidUpload(file, "document");
  const asset = await uploadBuffer(file.buffer, { folder: "assignments", resourceType: "auto" });
  assignment.attachments.push({ url: asset.url, publicId: asset.publicId, filename: file.originalname });
  await assignment.save();
  return ok(res, assignment);
});

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};

  let scopedStudent: { _id: unknown } | null = null;

  if (req.user!.role === ROLES.TEACHER) {
    const teacherProfileId = await getTeacherProfileId(req.user!.id);
    filter.teacherId = teacherProfileId;
  } else if (req.user!.role === ROLES.STUDENT) {
    scopedStudent = await StudentProfile.findOne({ userId: req.user!.id });
    if (!scopedStudent) return ok(res, []);
    filter.classId = (scopedStudent as any).classId;
    filter.sectionId = (scopedStudent as any).sectionId;
    filter.status = "published";
  } else if (req.user!.role === ROLES.PARENT) {
    const studentId = await resolveParentScopedStudentId(req, req.query.studentId as string | undefined);
    if (!studentId) return ok(res, []);
    scopedStudent = await StudentProfile.findById(studentId);
    if (!scopedStudent) return ok(res, []);
    filter.classId = (scopedStudent as any).classId;
    filter.sectionId = (scopedStudent as any).sectionId;
    filter.status = "published";
  } else {
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.teacherId) filter.teacherId = req.query.teacherId;
  }

  const assignments = await Assignment.find(filter)
    .populate(["classId", "sectionId", "subjectId"])
    .sort({ dueDate: -1 });

  if (scopedStudent) {
    const submissions = await AssignmentSubmission.find({ studentId: scopedStudent._id }).lean();
    const byAssignment = new Map(submissions.map((s) => [String(s.assignmentId), s]));
    const withStatus = assignments.map((a) => ({
      ...a.toObject(),
      submission: byAssignment.get(String(a._id)) ?? null,
    }));
    return ok(res, withStatus);
  }

  return ok(res, assignments);
});

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await Assignment.findById(req.params.id).populate(["classId", "sectionId", "subjectId"]);
  if (!assignment) throw ApiError.notFound("Assignment not found");
  return ok(res, assignment);
});

export const submitAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound("Assignment not found");
  if (assignment.status !== "published") throw ApiError.badRequest("This assignment is not open for submissions");

  const student = await StudentProfile.findOne({ userId: req.user!.id });
  if (!student) throw ApiError.forbidden();
  if (String(student.classId) !== String(assignment.classId) || String(student.sectionId) !== String(assignment.sectionId)) {
    throw ApiError.forbidden("This assignment is not assigned to your class");
  }

  const existing = await AssignmentSubmission.findOne({ assignmentId: assignment._id, studentId: student._id });
  if (existing && existing.status !== "submitted") {
    throw ApiError.conflict("This submission has already been graded and can no longer be changed");
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const uploaded = [];
  for (const file of files) {
    assertValidUpload(file, "document");
    const asset = await uploadBuffer(file.buffer, { folder: "submissions", resourceType: "auto" });
    uploaded.push({ url: asset.url, publicId: asset.publicId, filename: file.originalname });
  }

  const isLate = new Date() > assignment.dueDate;
  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignmentId: assignment._id, studentId: student._id },
    {
      assignmentId: assignment._id,
      studentId: student._id,
      textAnswer: req.body.textAnswer,
      files: uploaded.length > 0 ? uploaded : existing?.files ?? [],
      submittedAt: new Date(),
      isLate,
      status: "submitted",
    },
    { upsert: true, new: true },
  );

  return created(res, submission);
});

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound("Assignment not found");
  await assertTeacherOwnsAssignment(req, assignment);

  const filter: Record<string, unknown> = { assignmentId: assignment._id };
  if (req.query.status) filter.status = req.query.status;

  const submissions = await AssignmentSubmission.find(filter).populate("studentId", "firstName lastName studentCode");
  return ok(res, submissions);
});

export const gradeSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await AssignmentSubmission.findById(req.params.submissionId);
  if (!submission) throw ApiError.notFound("Submission not found");
  const assignment = await Assignment.findById(submission.assignmentId);
  if (!assignment) throw ApiError.notFound("Assignment not found");
  await assertTeacherOwnsAssignment(req, assignment);

  if (req.body.marksObtained > assignment.maxMarks) {
    throw ApiError.badRequest(`Marks cannot exceed the maximum of ${assignment.maxMarks}`);
  }

  submission.marksObtained = req.body.marksObtained;
  submission.feedback = req.body.feedback;
  submission.status = "graded";
  submission.gradedBy = req.user!.id as any;
  submission.gradedAt = new Date();
  await submission.save();
  return ok(res, submission);
});

export const returnSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await AssignmentSubmission.findById(req.params.submissionId);
  if (!submission) throw ApiError.notFound("Submission not found");
  if (submission.status !== "graded") throw ApiError.badRequest("Only graded submissions can be returned");
  const assignment = await Assignment.findById(submission.assignmentId);
  await assertTeacherOwnsAssignment(req, assignment!);

  submission.status = "returned";
  await submission.save();
  return ok(res, submission);
});
