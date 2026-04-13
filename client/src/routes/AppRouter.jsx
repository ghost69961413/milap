import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import AuthPage from "../pages/AuthPage";
import ChatPage from "../pages/ChatPage";
import ConsultantPortalPage from "../pages/ConsultantPortalPage";
import DashboardPage from "../pages/DashboardPage";
import DecoratorPortalPage from "../pages/DecoratorPortalPage";
import DiscoverPage from "../pages/DiscoverPage";
import LandingPage from "../pages/LandingPage";
import LawyerPortalPage from "../pages/LawyerPortalPage";
import UserServicesPage from "../pages/UserServicesPage";
import AdminPortalLayout from "../layouts/AdminPortalLayout";
import ConsultantPortalLayout from "../layouts/ConsultantPortalLayout";
import DecoratorPortalLayout from "../layouts/DecoratorPortalLayout";
import LawyerPortalLayout from "../layouts/LawyerPortalLayout";
import NormalUserPortalLayout from "../layouts/NormalUserPortalLayout";
import ProtectedRoute from "./ProtectedRoute";
import { normalizeLegacyPath } from "./portalPaths";

function AppRouter() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["normal_user"]}
              loginPath="/login"
            />
          }
        >
          <Route path="/dashboard" element={<NormalUserPortalLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="services" element={<UserServicesPage />} />
          </Route>
        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["consultant"]}
              loginPath="/login"
            />
          }
        >
          <Route path="/consultant" element={<ConsultantPortalLayout />}>
            <Route index element={<ConsultantPortalPage />} />
          </Route>
          <Route path="/consultant/chat" element={<ChatPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["lawyer"]}
              loginPath="/login"
            />
          }
        >
          <Route path="/lawyer" element={<LawyerPortalLayout />}>
            <Route index element={<LawyerPortalPage />} />
          </Route>
          <Route path="/lawyer/chat" element={<ChatPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["decorator"]}
              loginPath="/login"
            />
          }
        >
          <Route path="/decorator" element={<DecoratorPortalLayout />}>
            <Route index element={<DecoratorPortalPage />} />
          </Route>
          <Route path="/decorator/chat" element={<ChatPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["admin"]}
              loginPath="/admin/login"
            />
          }
        >
          <Route path="/admin" element={<AdminPortalLayout />}>
            <Route index element={<AdminDashboardPage />} />
          </Route>
        </Route>

        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/user/login" element={<Navigate to="/login" replace />} />
        <Route path="/user/auth" element={<Navigate to="/login" replace />} />
        <Route path="/discover" element={<Navigate to="/dashboard/discover" replace />} />
        <Route path="/chat" element={<Navigate to="/dashboard/chat" replace />} />
        <Route path="/services" element={<Navigate to="/dashboard/services" replace />} />
        <Route path="/user/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/user/discover" element={<Navigate to="/dashboard/discover" replace />} />
        <Route path="/user/chat" element={<Navigate to="/dashboard/chat" replace />} />
        <Route path="/user/services" element={<Navigate to="/dashboard/services" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

        <Route
          path="*"
          element={
            <Navigate
              to={normalizeLegacyPath(location.pathname) === location.pathname ? "/" : normalizeLegacyPath(location.pathname)}
              replace
            />
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default AppRouter;
