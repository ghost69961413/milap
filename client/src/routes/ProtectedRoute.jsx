import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRoleHomePath, getLoginPathForRole } from "./portalPaths";

function ProtectedRoute({
  allowedRoles = [],
  loginPath = "/login",
  fallbackPath
}) {
  const { isAuthenticated, isSessionReady, user } = useAuth();
  const location = useLocation();

  if (!isSessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fbff] text-[#1f2a44]">
        <p className="rounded-full border border-[#d9e1f3] bg-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#5a6480]">
          Checking session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const currentUserRole = user?.role;

    if (!currentUserRole || !allowedRoles.includes(currentUserRole)) {
      const resolvedFallbackPath =
        fallbackPath || getRoleHomePath(currentUserRole) || getLoginPathForRole(currentUserRole);

      return <Navigate to={resolvedFallbackPath} replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
