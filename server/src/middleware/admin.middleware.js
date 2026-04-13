import { requireAuth } from "./auth.middleware.js";
import { PERMISSIONS, requirePermission } from "./rbac.middleware.js";

export const requireAdminAccess = [
  requireAuth,
  requirePermission(PERMISSIONS.ADMIN_PANEL_ACCESS, {
    allowAdminOverride: false
  })
];
