export const ROLE_PORTAL_HOME_PATHS = Object.freeze({
  normal_user: "/dashboard",
  consultant: "/consultant",
  lawyer: "/lawyer",
  decorator: "/decorator",
  admin: "/admin"
});

export function getRoleHomePath(role) {
  if (!role) {
    return "/login";
  }

  return ROLE_PORTAL_HOME_PATHS[role] || "/login";
}

export function getLoginPathForRole(role) {
  return role === "admin" ? "/admin/login" : "/login";
}

export function normalizeLegacyPath(pathname) {
  if (!pathname || typeof pathname !== "string") {
    return "/";
  }

  const map = {
    "/auth": "/login",
    "/user/login": "/login",
    "/user/auth": "/login",
    "/user/dashboard": "/dashboard",
    "/user/discover": "/dashboard/discover",
    "/user/services": "/dashboard/services",
    "/user/chat": "/dashboard/chat",
    "/services": "/dashboard/services",
    "/admin/dashboard": "/admin"
  };

  return map[pathname] || pathname;
}
