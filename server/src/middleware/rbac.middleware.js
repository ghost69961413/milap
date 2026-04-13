import {
  PERMISSIONS,
  ROLE_HIERARCHY,
  getPermissionsForRole,
  hasPermission
} from "../constants/permissions.js";
import { USER_ROLES } from "../constants/roles.js";
import ApiError from "../utils/ApiError.js";

function ensureAuthenticatedRole(req) {
  const role = req.user?.role;

  if (!role) {
    throw new ApiError(401, "Authentication role is missing");
  }

  return role;
}

function withRoleMeta(req) {
  const role = req.user?.role;

  if (!role) {
    return;
  }

  req.user.permissions = getPermissionsForRole(role);
  req.user.roleLevel = ROLE_HIERARCHY[role] || 0;
}

export function requirePermission(permission, options = {}) {
  const allowAdminOverride = options.allowAdminOverride !== false;

  return (req, _res, next) => {
    try {
      const role = ensureAuthenticatedRole(req);
      withRoleMeta(req);

      if (allowAdminOverride && role === USER_ROLES.ADMIN) {
        next();
        return;
      }

      if (!hasPermission(role, permission)) {
        next(new ApiError(403, "You are not authorized to access this resource"));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAnyPermission(...permissions) {
  return (req, _res, next) => {
    try {
      const role = ensureAuthenticatedRole(req);
      withRoleMeta(req);

      if (role === USER_ROLES.ADMIN) {
        next();
        return;
      }

      const hasAnyPermission = permissions.some((permission) =>
        hasPermission(role, permission)
      );

      if (!hasAnyPermission) {
        next(new ApiError(403, "You are not authorized to access this resource"));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export { PERMISSIONS };

