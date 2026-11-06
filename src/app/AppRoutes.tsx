import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ROLE_HOME } from "@/config";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/features/auth/Login";
import Spinner from "@/components/ui/Spinner";
import ProtectedRoute from "./ProtectedRoute";

// Each role's page is its own chunk, so a caller never downloads admin code.
const AdminPage = lazy(() => import("@/features/admin/AdminPage"));
const SupportPage = lazy(() => import("@/features/support/SupportPage"));
const CallerPage = lazy(() => import("@/features/caller/CallerPage"));

/** "/" sends people to their own home (or to the login page). */
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  return <Navigate to={user ? ROLE_HOME[user.role] : "/login"} replace />;
};

const AppRoutes = () => (
  <Suspense
    fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface-sunken">
        <Spinner />
      </div>
    }
  >
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute allowedRoles={["support"]}>
            <SupportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/caller"
        element={
          <ProtectedRoute allowedRoles={["caller"]}>
            <CallerPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
