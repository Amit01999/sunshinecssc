import { useAuth } from "@/context/AuthContext";

/** For a parent, API calls must be scoped to the selected child; for a student, the backend infers it from the JWT. */
export function useStudentScope() {
  const { user, activeChildId } = useAuth();
  const isParent = user?.role === "parent";
  const hasChildren = (user?.children?.length ?? 0) > 0;
  return {
    studentId: isParent ? activeChildId ?? undefined : undefined,
    isParent,
    hasChildren,
    ready: !isParent || Boolean(activeChildId) || !hasChildren,
  };
}
