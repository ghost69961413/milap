import { Outlet } from "react-router-dom";
import RolePortalShell from "../components/layout/RolePortalShell";

function LawyerPortalLayout() {
  return (
    <RolePortalShell
      title="Lawyer Portal"
      subtitle="Handle legal consultation requests with a dedicated role-specific workspace."
      gradientClassName="bg-[radial-gradient(circle_at_16%_10%,rgba(173,147,108,0.24),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(98,122,168,0.2),transparent_32%),linear-gradient(180deg,#fbf8f1_0%,#f8fafc_100%)]"
    >
      <Outlet />
    </RolePortalShell>
  );
}

export default LawyerPortalLayout;

