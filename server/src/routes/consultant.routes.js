import { Router } from "express";
import {
  applyForConsultantRole,
  createConsultantConnection,
  createConsultantProfile,
  getConsultants,
  getMyConsultantConnections,
  getMyConsultantProfile,
  getMyConsultationRequests,
  requestConsultation,
  respondConsultantConnection,
  respondConsultationRequest,
  updateConsultantProfile
} from "../controllers/consultant.controller.js";
import { USER_ROLES } from "../constants/roles.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";
import { requirePoliceVerification } from "../middleware/policeVerification.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  applyConsultantRoleSchema,
  consultantConnectionParamsSchema,
  consultationRequestParamsSchema,
  createConsultantConnectionSchema,
  createConsultantProfileSchema,
  listConsultantsQuerySchema,
  listConsultantConnectionsQuerySchema,
  listConsultationRequestsQuerySchema,
  requestConsultationSchema,
  respondConsultantConnectionSchema,
  respondConsultationSchema,
  updateConsultantProfileSchema
} from "../validators/consultant.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(listConsultantsQuerySchema), getConsultants);
router.post(
  "/apply",
  requireRoles(USER_ROLES.NORMAL_USER),
  validateRequest(applyConsultantRoleSchema),
  applyForConsultantRole
);
router.post("/requests", validateRequest(requestConsultationSchema), requestConsultation);
router.post(
  "/connections",
  requireRoles(USER_ROLES.NORMAL_USER),
  requirePoliceVerification,
  validateRequest(createConsultantConnectionSchema),
  createConsultantConnection
);
router.get(
  "/requests/me",
  validateQuery(listConsultationRequestsQuerySchema),
  getMyConsultationRequests
);
router.get(
  "/connections/me",
  requireRoles(USER_ROLES.NORMAL_USER, USER_ROLES.CONSULTANT),
  validateQuery(listConsultantConnectionsQuerySchema),
  getMyConsultantConnections
);

router.get(
  "/profile/me",
  requireRoles(USER_ROLES.CONSULTANT),
  getMyConsultantProfile
);
router.post(
  "/profile/me",
  requireRoles(USER_ROLES.CONSULTANT),
  validateRequest(createConsultantProfileSchema),
  createConsultantProfile
);
router.patch(
  "/profile/me",
  requireRoles(USER_ROLES.CONSULTANT),
  validateRequest(updateConsultantProfileSchema),
  updateConsultantProfile
);

router.patch(
  "/requests/:requestId/respond",
  requireRoles(USER_ROLES.CONSULTANT),
  validateParams(consultationRequestParamsSchema),
  validateRequest(respondConsultationSchema),
  respondConsultationRequest
);
router.patch(
  "/connections/:connectionId/respond",
  requireRoles(USER_ROLES.CONSULTANT),
  validateParams(consultantConnectionParamsSchema),
  validateRequest(respondConsultantConnectionSchema),
  respondConsultantConnection
);

export default router;
