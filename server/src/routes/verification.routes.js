import { Router } from "express";
import {
  getMyVerificationStatus,
  getPendingVerifications,
  reviewVerification,
  uploadPoliceVerificationDocument
} from "../controllers/verification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { PERMISSIONS, requirePermission } from "../middleware/rbac.middleware.js";
import { uploadVerificationDocument } from "../middleware/upload.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  listPendingPoliceVerificationQuerySchema,
  policeVerificationUserParamsSchema,
  reviewPoliceVerificationSchema,
  uploadVerificationDocumentSchema
} from "../validators/verification.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyVerificationStatus);
router.post(
  "/upload",
  uploadVerificationDocument,
  validateRequest(uploadVerificationDocumentSchema),
  uploadPoliceVerificationDocument
);

router.get(
  "/pending",
  requirePermission(PERMISSIONS.CONSULTANT_VERIFY_USERS, {
    allowAdminOverride: false
  }),
  validateQuery(listPendingPoliceVerificationQuerySchema),
  getPendingVerifications
);
router.patch(
  "/:userId/review",
  requirePermission(PERMISSIONS.CONSULTANT_VERIFY_USERS, {
    allowAdminOverride: false
  }),
  validateParams(policeVerificationUserParamsSchema),
  validateRequest(reviewPoliceVerificationSchema),
  reviewVerification
);

export default router;
