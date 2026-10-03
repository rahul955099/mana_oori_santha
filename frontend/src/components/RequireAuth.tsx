import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/common/Loading";
import type { UserRole } from "@/types";

interface RequireAuthProps {
  children: ReactNode;
  /** Restrict access to these roles only (e.g. ["admin"]). Omit to allow any logged-in user. */
  roles?: UserRole[];
}

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Wait for a saved session to be restored before deciding, so a page
  // refresh doesn't bounce a logged-in user to /login.
  if (initializing) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
