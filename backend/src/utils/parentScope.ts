import { Request } from "express";
import { ApiError } from "./ApiError";
import { getChildrenForParent } from "../services/userProfile.service";

/** Resolves the student id a parent's query is scoped to, verifying it against their verified links.
 *  Throws 403 if the parent asked for a student that isn't (yet) linked to them. */
export async function resolveParentScopedStudentId(req: Request, requestedStudentId?: string): Promise<string | null> {
  const childIds = (await getChildrenForParent(req.user!.id)).map(String);
  if (requestedStudentId) {
    if (!childIds.includes(requestedStudentId)) {
      throw ApiError.forbidden("You can only view records for your own linked children");
    }
    return requestedStudentId;
  }
  return childIds[0] ?? null;
}

export async function getParentChildIds(req: Request): Promise<string[]> {
  return (await getChildrenForParent(req.user!.id)).map(String);
}
