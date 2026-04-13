import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
  PERMISSIONS,
  ROLE_HIERARCHY,
  getPermissionsForRole
} from "../constants/permissions.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePoliceVerification } from "../middleware/policeVerification.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import ApiResponse from "../utils/ApiResponse.js";

const router = Router();

router.use(requireAuth);

router.get("/permissions/me", (req, res) => {
  const role = req.user.role;
  const permissions = getPermissionsForRole(role);

  res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, "Role permissions fetched successfully", {
      userId: req.user.id,
      role,
      roleLevel: ROLE_HIERARCHY[role] || 0,
      permissions,
      permissionMap: PERMISSIONS
    })
  );
});

router.get(
  "/examples/admin/approve-consultants",
  requirePermission(PERMISSIONS.ADMIN_APPROVE_CONSULTANTS, {
    allowAdminOverride: false
  }),
  (req, res) => {
    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, "Admin-only route access granted", {
        userId: req.user.id,
        role: req.user.role
      })
    );
  }
);

router.get(
  "/examples/consultant/verify-users",
  requirePermission(PERMISSIONS.CONSULTANT_VERIFY_USERS, {
    allowAdminOverride: false
  }),
  (req, res) => {
    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, "Consultant-only verification route access granted", {
        userId: req.user.id,
        role: req.user.role
      })
    );
  }
);

router.get(
  "/examples/core/matchmaking",
  requirePermission(PERMISSIONS.CORE_MATCHMAKING_ACCESS),
  requirePoliceVerification,
  (req, res) => {
    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, "Verified user matchmaking route access granted", {
        userId: req.user.id,
        role: req.user.role
      })
    );
  }
);

router.get(
  "/examples/core/chat",
  requirePermission(PERMISSIONS.CORE_CHAT_ACCESS),
  requirePoliceVerification,
  (req, res) => {
    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, "Verified user chat route access granted", {
        userId: req.user.id,
        role: req.user.role
      })
    );
  }
);

router.get(
  "/examples/service-provider/respond",
  requirePermission(PERMISSIONS.SERVICE_PROVIDER_RESPOND_REQUESTS),
  (req, res) => {
    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        "Service provider route access granted",
        {
          userId: req.user.id,
          role: req.user.role
        }
      )
    );
  }
);

export default router;
