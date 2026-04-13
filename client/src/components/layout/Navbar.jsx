import { motion } from "framer-motion";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getLoginPathForRole } from "../../routes/portalPaths";

function getNavLinks(role) {
  if (role === "admin") {
    return [
      { to: "/", label: "Landing" },
      { to: "/admin", label: "Admin Portal" }
    ];
  }

  if (role === "consultant") {
    return [
      { to: "/", label: "Landing" },
      { to: "/consultant", label: "Consultant Portal" },
      { to: "/consultant/chat", label: "Chat" }
    ];
  }

  if (role === "lawyer") {
    return [
      { to: "/", label: "Landing" },
      { to: "/lawyer", label: "Lawyer Portal" },
      { to: "/lawyer/chat", label: "Chat" }
    ];
  }

  if (role === "decorator") {
    return [
      { to: "/", label: "Landing" },
      { to: "/decorator", label: "Decorator Portal" },
      { to: "/decorator/chat", label: "Chat" }
    ];
  }

  return [
    { to: "/", label: "Landing" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/dashboard/services", label: "Services" },
    { to: "/dashboard/discover", label: "Discover" },
    { to: "/dashboard/chat", label: "Chat" }
  ];
}

function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, clearAuth } = useAuth();
  const navLinks = getNavLinks(user?.role);

  function handleAuthButton() {
    if (isAuthenticated) {
      clearAuth();
      navigate(getLoginPathForRole(user?.role), { replace: true });
      return;
    }

    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/55 bg-[#fefaf4]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link to="/" className="group">
          <p className="font-display text-2xl font-semibold tracking-tight text-[#8a2918]">
            Milap
          </p>
          <p className="text-[0.63rem] uppercase tracking-[0.32em] text-[#8d6c57] transition group-hover:text-[#8a2918]">
            Modern Matrimony
          </p>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-[#efdfd3] bg-white/75 p-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                [
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  isActive ? "bg-[#1f2a44] text-white" : "text-[#495067] hover:bg-[#f5ede6]"
                ].join(" ")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <p className="hidden rounded-full border border-[#ebdfd4] bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#59607b] lg:block">
              {user?.fullName}
            </p>
          )}
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAuthButton}
            className="rounded-full bg-[#1f2a44] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#1f2a44]/20 transition hover:bg-[#273453]"
          >
            {isAuthenticated ? "Logout" : "Start Free"}
          </motion.button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
