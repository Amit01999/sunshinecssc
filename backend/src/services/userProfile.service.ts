import { Types } from "mongoose";
import { IUser } from "../models/User.model";
import { StudentProfile } from "../models/StudentProfile.model";
import { ParentProfile } from "../models/ParentProfile.model";
import { TeacherProfile } from "../models/TeacherProfile.model";
import { StaffProfile } from "../models/StaffProfile.model";
import { StudentParentLink } from "../models/StudentParentLink.model";
import { ROLES } from "../utils/roles";

export async function getProfileForUser(userId: Types.ObjectId | string, role: string) {
  switch (role) {
    case ROLES.STUDENT:
      return StudentProfile.findOne({ userId }).lean();
    case ROLES.PARENT:
      return ParentProfile.findOne({ userId }).lean();
    case ROLES.TEACHER:
      return TeacherProfile.findOne({ userId }).populate("departmentId", "name").lean();
    case ROLES.STAFF:
    case ROLES.ADMIN:
    case ROLES.ACADEMIC_ADMIN:
    case ROLES.SUPER_ADMIN:
      return StaffProfile.findOne({ userId }).lean();
    default:
      return null;
  }
}

/** Student ids a parent is verified to access. Empty array if the parent has no verified links yet. */
export async function getChildrenForParent(parentUserId: Types.ObjectId | string): Promise<Types.ObjectId[]> {
  const parentProfile = await ParentProfile.findOne({ userId: parentUserId }).select("_id").lean();
  if (!parentProfile) return [];
  const links = await StudentParentLink.find({ parentId: parentProfile._id }).select("studentId").lean();
  return links.map((l) => l.studentId);
}

export async function buildMePayload(user: IUser) {
  const profile = await getProfileForUser(user._id, user.role);
  const base = {
    id: user._id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    profile,
  };

  if (user.role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(user._id);
    const children = await StudentProfile.find({ _id: { $in: childIds } })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .lean();
    return { ...base, children };
  }

  return base;
}
