import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ROLE_HOME } from "@/config";
import { useAuth } from "@/hooks/useAuth";
import Spinner from "@/components/ui/Spinner";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: ReactNode;
}

/**
 * Wrap a page with this to make it role-restricted:
 *  - not logged in         -> /login
 *  - logged in, wrong role -> that user's own home page
 *
 * NOTE: this protects the UI only. Real security must also be enforced by the
 * server API (every request checked for a valid session and role).
 */
const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-sunken">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
