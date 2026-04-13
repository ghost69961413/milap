import { Router } from "express";
import { USER_ROLES } from "../constants/roles.js";
import {
  createServiceBooking,
  getBookableServices,
  getMyServiceBookings,
  updateServiceBookingStatus
} from "../controllers/service-booking.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";
import { requirePoliceVerification } from "../middleware/policeVerification.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createServiceBookingSchema,
  listBookableServicesQuerySchema,
  listServiceBookingsQuerySchema,
  serviceBookingParamsSchema,
  updateServiceBookingStatusSchema
} from "../validators/service-booking.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/services", validateQuery(listBookableServicesQuerySchema), getBookableServices);
router.post(
  "/",
  requireRoles(USER_ROLES.NORMAL_USER),
  requirePoliceVerification,
  validateRequest(createServiceBookingSchema),
  createServiceBooking
);
router.get("/me", validateQuery(listServiceBookingsQuerySchema), getMyServiceBookings);
router.patch(
  "/:bookingId/status",
  requireRoles(USER_ROLES.CONSULTANT, USER_ROLES.LAWYER, USER_ROLES.DECORATOR),
  validateParams(serviceBookingParamsSchema),
  validateRequest(updateServiceBookingStatusSchema),
  updateServiceBookingStatus
);

export default router;
