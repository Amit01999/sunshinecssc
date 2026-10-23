import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, Role } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { portalBase } from "./portalBase";

export function ProtectedRoute({ allowedRoles, children }: { allowedRoles: Role[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    const loginPath = location.pathname.startsWith("/staff-portal") || location.pathname.startsWith("/admin")
      ? "/login/teachers"
      : "/login/students";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const profilePath = `${portalBase(location.pathname)}/profile`;
  if (user.mustChangePassword && location.pathname !== profilePath) {
    return <Navigate to={`${profilePath}?tab=security&forced=1`} replace />;
  }

  return <>{children}</>;
}
