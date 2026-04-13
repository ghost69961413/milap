import { Outlet } from "react-router-dom";
import RolePortalShell from "../components/layout/RolePortalShell";

function ConsultantPortalLayout() {
  return (
    <RolePortalShell
      title="Consultant Portal"
      subtitle="Review pending user verifications and manage consultant-side workflows."
      gradientClassName="bg-[radial-gradient(circle_at_16%_10%,rgba(112,156,224,0.24),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(143,192,236,0.24),transparent_32%),linear-gradient(180deg,#f4f9ff_0%,#f8fbff_100%)]"
    >
      <Outlet />
    </RolePortalShell>
  );
}

export default ConsultantPortalLayout;

