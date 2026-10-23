export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  ACADEMIC_ADMIN: "academic_admin",
  TEACHER: "teacher",
  STAFF: "staff",
  STUDENT: "student",
  PARENT: "parent",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

// Roles that can manage school operations + CMS content from the admin dashboard.
export const ADMIN_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACADEMIC_ADMIN];

// Roles that count as "staff" for staff-portal access (teachers + non-teaching staff + admins).
export const STAFF_ROLES: Role[] = [...ADMIN_ROLES, ROLES.TEACHER, ROLES.STAFF];
