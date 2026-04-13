import { Router } from "express";
import {
  deleteUserForAdmin,
  getAdminMe,
  getAllUsersForAdmin,
  getPendingConsultantsForAdmin,
  loginAsAdmin,
  promoteConsultantToSecondaryAdminForAdmin,
  promoteUserToConsultantForAdmin,
  reviewConsultantForAdmin
} from "../controllers/admin.controller.js";
import { requireAdminAccess } from "../middleware/admin.middleware.js";
import { PERMISSIONS, requirePermission } from "../middleware/rbac.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  adminLoginSchema,
  adminUserParamsSchema,
  listAdminUsersQuerySchema,
  listPendingConsultantsQuerySchema,
  promoteSecondaryAdminSchema,
  promoteUserToConsultantSchema,
  reviewConsultantApprovalSchema
} from "../validators/admin.validator.js";

const router = Router();

router.post("/auth/login", validateRequest(adminLoginSchema), loginAsAdmin);

router.use(...requireAdminAccess);

router.get("/me", getAdminMe);
router.get(
  "/users",
  requirePermission(PERMISSIONS.ADMIN_VIEW_USERS, { allowAdminOverride: false }),
  validateQuery(listAdminUsersQuerySchema),
  getAllUsersForAdmin
);
router.get(
  "/consultants/pending",
  requirePermission(PERMISSIONS.ADMIN_APPROVE_CONSULTANTS, {
    allowAdminOverride: false
  }),
  validateQuery(listPendingConsultantsQuerySchema),
  getPendingConsultantsForAdmin
);
router.patch(
  "/consultants/:userId/review",
  requirePermission(PERMISSIONS.ADMIN_APPROVE_CONSULTANTS, {
    allowAdminOverride: false
  }),
  validateParams(adminUserParamsSchema),
  validateRequest(reviewConsultantApprovalSchema),
  reviewConsultantForAdmin
);
router.patch(
  "/users/:userId/promote-consultant",
  requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS, {
    allowAdminOverride: false
  }),
  validateParams(adminUserParamsSchema),
  validateRequest(promoteUserToConsultantSchema),
  promoteUserToConsultantForAdmin
);
router.patch(
  "/users/:userId/promote-secondary-admin",
  requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS, {
    allowAdminOverride: false
  }),
  validateParams(adminUserParamsSchema),
  validateRequest(promoteSecondaryAdminSchema),
  promoteConsultantToSecondaryAdminForAdmin
);
router.delete(
  "/users/:userId",
  requirePermission(PERMISSIONS.ADMIN_MANAGE_USERS, { allowAdminOverride: false }),
  validateParams(adminUserParamsSchema),
  deleteUserForAdmin
);

export default router;
