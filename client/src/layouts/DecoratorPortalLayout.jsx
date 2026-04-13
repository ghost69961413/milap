import { Outlet } from "react-router-dom";
import RolePortalShell from "../components/layout/RolePortalShell";

function DecoratorPortalLayout() {
  return (
    <RolePortalShell
      title="Decorator Portal"
      subtitle="Manage event service listings, portfolios, and booking responses from one portal."
      gradientClassName="bg-[radial-gradient(circle_at_16%_10%,rgba(227,152,121,0.26),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(173,143,207,0.22),transparent_32%),linear-gradient(180deg,#fff8f3_0%,#fffdfb_100%)]"
    >
      <Outlet />
    </RolePortalShell>
  );
}

export default DecoratorPortalLayout;

