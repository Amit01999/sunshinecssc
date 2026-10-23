import type { Role } from "@/context/AuthContext";

export function portalBase(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/staff-portal")) return "/staff-portal";
  return "/portal";
}

export function dashboardBaseForRole(role: Role): string {
  if (role === "super_admin" || role === "admin" || role === "academic_admin") return "/admin";
  if (role === "teacher" || role === "staff") return "/staff-portal";
  return "/portal";
}
