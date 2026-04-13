import { Router } from "express";
import {
  createLawyerProfile,
  getLawyers,
  getMyLawyerBookingRequests,
  getMyLawyerProfile,
  getMyLegalConsultationRequests,
  requestLegalConsultation,
  respondLawyerBookingRequest,
  respondLegalConsultationRequest,
  updateLawyerProfile
} from "../controllers/lawyer.controller.js";
import { USER_ROLES } from "../constants/roles.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createLawyerProfileSchema,
  legalConsultationRequestParamsSchema,
  listLawyersQuerySchema,
  listLegalConsultationRequestsQuerySchema,
  requestLegalConsultationSchema,
  respondLegalConsultationSchema,
  updateLawyerProfileSchema
} from "../validators/lawyer.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(listLawyersQuerySchema), getLawyers);
router.post("/requests", validateRequest(requestLegalConsultationSchema), requestLegalConsultation);
router.get(
  "/requests/me",
  validateQuery(listLegalConsultationRequestsQuerySchema),
  getMyLegalConsultationRequests
);
router.get(
  "/bookings/me",
  requireRoles(USER_ROLES.LAWYER),
  validateQuery(listLegalConsultationRequestsQuerySchema),
  getMyLawyerBookingRequests
);

router.get("/profile/me", requireRoles(USER_ROLES.LAWYER), getMyLawyerProfile);
router.post(
  "/profile/me",
  requireRoles(USER_ROLES.LAWYER),
  validateRequest(createLawyerProfileSchema),
  createLawyerProfile
);
router.patch(
  "/profile/me",
  requireRoles(USER_ROLES.LAWYER),
  validateRequest(updateLawyerProfileSchema),
  updateLawyerProfile
);

router.patch(
  "/requests/:requestId/respond",
  requireRoles(USER_ROLES.LAWYER),
  validateParams(legalConsultationRequestParamsSchema),
  validateRequest(respondLegalConsultationSchema),
  respondLegalConsultationRequest
);
router.patch(
  "/bookings/:requestId/respond",
  requireRoles(USER_ROLES.LAWYER),
  validateParams(legalConsultationRequestParamsSchema),
  validateRequest(respondLegalConsultationSchema),
  respondLawyerBookingRequest
);

export default router;
