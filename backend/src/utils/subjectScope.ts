import { Types } from "mongoose";
import { Subject } from "../models/Subject.model";
import { AcademicGroup } from "../models/AcademicGroup.model";
import { ApiError } from "./ApiError";

/** Throws if a subject is restricted (directly, or via its academic group) to a set of
 *  classes that does not include classId. A subject with no group and no applicableClasses
 *  is unrestricted and applies to every class. */
export async function assertSubjectApplicableToClass(
  subjectId: Types.ObjectId | string,
  classId: Types.ObjectId | string,
): Promise<void> {
  const subject = await Subject.findById(subjectId).select("name groupId applicableClasses").lean();
  if (!subject) throw ApiError.notFound("Subject not found");

  let allowed: Types.ObjectId[] | null = null;
  if (subject.groupId) {
    const group = await AcademicGroup.findById(subject.groupId).select("classIds").lean();
    allowed = group?.classIds ?? [];
  } else if (subject.applicableClasses?.length) {
    allowed = subject.applicableClasses;
  }

  if (allowed && !allowed.some((id) => String(id) === String(classId))) {
    throw ApiError.badRequest(`"${subject.name}" is not configured for this class.`);
  }
}
