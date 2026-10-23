import { Request } from "express";
import { StudentProfile } from "../models/StudentProfile.model";
import { getChildrenForParent } from "../services/userProfile.service";
import { ROLES } from "../utils/roles";

/** Builds a Mongo filter restricting published notices/events to what this viewer's role+class may see. */
export async function buildAudienceFilter(req: Request): Promise<Record<string, unknown>> {
  const now = new Date();
  const base: Record<string, unknown> = {
    status: "published",
    $and: [
      { $or: [{ publishAt: { $exists: false } }, { publishAt: { $lte: now } }] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] },
    ],
  };

  if (!req.user) {
    return { ...base, audience: "all" };
  }

  const role = req.user.role;
  let classId: string | undefined;

  if (role === ROLES.STUDENT) {
    const student = await StudentProfile.findOne({ userId: req.user.id }).select("classId");
    classId = student?.classId ? String(student.classId) : undefined;
  } else if (role === ROLES.PARENT) {
    const childIds = await getChildrenForParent(req.user.id);
    const students = await StudentProfile.find({ _id: { $in: childIds } }).select("classId");
    const classIds = students.map((s) => String(s.classId));
    const audienceOr: Record<string, unknown>[] = [{ audience: "all" }, { audience: "parents" }];
    if (classIds.length) audienceOr.push({ audience: "class", classId: { $in: classIds } });
    return { ...base, $or: audienceOr };
  }

  const audienceByRole: Record<string, string[]> = {
    [ROLES.STUDENT]: ["all", "students"],
    [ROLES.TEACHER]: ["all", "teachers"],
    [ROLES.STAFF]: ["all", "staff"],
  };
  const allowed = audienceByRole[role] ?? ["all", "students", "parents", "teachers", "staff", "class"];

  const audienceOr: Record<string, unknown>[] = allowed.map((a) => ({ audience: a }));
  if (classId) audienceOr.push({ audience: "class", classId });

  return { ...base, $or: audienceOr };
}
