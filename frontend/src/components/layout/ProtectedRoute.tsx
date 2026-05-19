import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, Role } from "@/lib/auth";

export function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();
  if (!accessToken || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
