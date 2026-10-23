import { Types } from "mongoose";
import { TeachingAssignment } from "../models/TeachingAssignment.model";
import { SchoolClass } from "../models/SchoolClass.model";
import { TeacherProfile } from "../models/TeacherProfile.model";
import { StudentProfile } from "../models/StudentProfile.model";

export async function getTeacherProfileId(userId: Types.ObjectId | string): Promise<Types.ObjectId | null> {
  const profile = await TeacherProfile.findOne({ userId }).select("_id").lean();
  return profile?._id ?? null;
}

/** True if this teacher is the class teacher OR has a teaching assignment for this class+section. */
export async function canTeacherAccessSection(
  teacherProfileId: Types.ObjectId | string,
  classId: Types.ObjectId | string,
  sectionId: Types.ObjectId | string,
): Promise<boolean> {
  const [isClassTeacher, hasAssignment] = await Promise.all([
    SchoolClass.exists({ _id: classId, classTeacherId: teacherProfileId }),
    TeachingAssignment.exists({ teacherId: teacherProfileId, classId, sectionId }),
  ]);
  return Boolean(isClassTeacher || hasAssignment);
}

/** Every currently-active student this teacher is associated with - either as the class teacher
 *  for their whole class (any section) or via a teaching assignment for their specific
 *  class+section (any subject). Returns the students' User ids, not their profile ids, since
 *  that's what LeaveApplication.applicantId (and most "who is this person" lookups) key off. */
export async function getTeacherAssociatedStudentUserIds(teacherProfileId: Types.ObjectId | string): Promise<Types.ObjectId[]> {
  const [classTeacherClasses, assignments] = await Promise.all([
    SchoolClass.find({ classTeacherId: teacherProfileId }).select("_id").lean(),
    TeachingAssignment.find({ teacherId: teacherProfileId }).select("classId sectionId").lean(),
  ]);

  const or: Record<string, unknown>[] = [];
  if (classTeacherClasses.length) or.push({ classId: { $in: classTeacherClasses.map((c) => c._id) } });
  for (const a of assignments) or.push({ classId: a.classId, sectionId: a.sectionId });
  if (!or.length) return [];

  const students = await StudentProfile.find({ $or: or }).select("userId").lean();
  return students.map((s) => s.userId);
}

export async function canTeacherAccessSubject(
  teacherProfileId: Types.ObjectId | string,
  classId: Types.ObjectId | string,
  sectionId: Types.ObjectId | string,
  subjectId: Types.ObjectId | string,
): Promise<boolean> {
  return Boolean(await TeachingAssignment.exists({ teacherId: teacherProfileId, classId, sectionId, subjectId }));
}
