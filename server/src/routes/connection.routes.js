import { Router } from "express";
import {
  acceptConnection,
  cancelConnection,
  getConnectionRequests,
  rejectConnection,
  sendConnection
} from "../controllers/connection.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { PERMISSIONS, requirePermission } from "../middleware/rbac.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  cancelConnectionRequestSchema,
  connectionRequestParamsSchema,
  createConnectionRequestSchema,
  listConnectionRequestsQuerySchema,
  respondConnectionRequestSchema
} from "../validators/connection.validator.js";

const router = Router();

router.use(requireAuth);

router.post("/requests", validateRequest(createConnectionRequestSchema), sendConnection);
router.get(
  "/requests",
  validateQuery(listConnectionRequestsQuerySchema),
  getConnectionRequests
);

router.patch(
  "/requests/:requestId/accept",
  requirePermission(PERMISSIONS.SERVICE_PROVIDER_RESPOND_REQUESTS),
  validateParams(connectionRequestParamsSchema),
  validateRequest(respondConnectionRequestSchema),
  acceptConnection
);
router.patch(
  "/requests/:requestId/reject",
  requirePermission(PERMISSIONS.SERVICE_PROVIDER_RESPOND_REQUESTS),
  validateParams(connectionRequestParamsSchema),
  validateRequest(respondConnectionRequestSchema),
  rejectConnection
);
router.patch(
  "/requests/:requestId/cancel",
  validateParams(connectionRequestParamsSchema),
  validateRequest(cancelConnectionRequestSchema),
  cancelConnection
);

export default router;
