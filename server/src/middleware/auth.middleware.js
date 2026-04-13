import ApiError from "../utils/ApiError.js";
import { USER_ROLES } from "../constants/roles.js";
import User from "../models/User.js";
import { verifyAuthToken } from "../utils/jwt.js";

export async function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new ApiError(401, "Authorization token is required"));
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    next(new ApiError(401, "Authorization token is required"));
    return;
  }

  try {
    const decoded = verifyAuthToken(token);

    if (!decoded.userId) {
      next(new ApiError(401, "Invalid authentication token"));
      return;
    }

    const user = await User.findById(decoded.userId).select("_id email role");

    if (!user) {
      next(new ApiError(401, "User account was not found"));
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email || decoded.email,
      role: user.role || decoded.role || USER_ROLES.NORMAL_USER
    };
    next();
  } catch (_error) {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireRoles(...allowedRoles) {
  const allowedRoleSet = new Set(allowedRoles);

  return (req, _res, next) => {
    if (!req.user?.role) {
      next(new ApiError(401, "Authentication role is missing"));
      return;
    }

    if (!allowedRoleSet.has(req.user.role)) {
      next(new ApiError(403, "You are not authorized to access this resource"));
      return;
    }

    next();
  };
}

export function requireAdmin(req, res, next) {
  return requireRoles(USER_ROLES.ADMIN)(req, res, next);
}
