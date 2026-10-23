export function portalBase(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/staff-portal")) return "/staff-portal";
  return "/portal";
}
