import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created } from "../utils/ApiResponse";
import { TeachingAssignment } from "../models/TeachingAssignment.model";
import { assertSubjectApplicableToClass } from "../utils/subjectScope";
import { writeAuditLog } from "../models/AuditLog.model";

export const createTeachingAssignment = asyncHandler(async (req: Request, res: Response) => {
  await assertSubjectApplicableToClass(req.body.subjectId, req.body.classId);

  const assignment = await TeachingAssignment.create(req.body);
  await writeAuditLog({
    actorId: req.user!.id,
    actorRole: req.user!.role,
    action: "teachingassignment.create",
    targetType: "TeachingAssignment",
    targetId: assignment._id,
    after: req.body,
    ip: req.ip,
  });
  return created(res, assignment);
});
