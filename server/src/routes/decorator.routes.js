import { Router } from "express";
import {
  cancelDecoratorBooking,
  createDecoratorService,
  getDecoratorServices,
  getMyDecoratorBookings,
  getMyDecoratorServices,
  requestDecoratorBooking,
  respondDecoratorBooking,
  updateDecoratorService
} from "../controllers/decorator.controller.js";
import { USER_ROLES } from "../constants/roles.js";
import { requireAuth, requireRoles } from "../middleware/auth.middleware.js";
import { uploadDecoratorPortfolioImages } from "../middleware/upload.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  bookingParamsSchema,
  cancelDecoratorBookingSchema,
  createDecoratorServiceSchema,
  listDecoratorBookingsQuerySchema,
  listDecoratorServicesQuerySchema,
  listMyDecoratorServicesQuerySchema,
  requestDecoratorBookingSchema,
  respondDecoratorBookingSchema,
  serviceParamsSchema,
  updateDecoratorServiceSchema
} from "../validators/decorator.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/services", validateQuery(listDecoratorServicesQuerySchema), getDecoratorServices);
router.post(
  "/bookings",
  validateRequest(requestDecoratorBookingSchema),
  requestDecoratorBooking
);
router.get(
  "/bookings/me",
  validateQuery(listDecoratorBookingsQuerySchema),
  getMyDecoratorBookings
);

router.get(
  "/services/me",
  requireRoles(USER_ROLES.DECORATOR),
  validateQuery(listMyDecoratorServicesQuerySchema),
  getMyDecoratorServices
);
router.get(
  "/dashboard/services/me",
  requireRoles(USER_ROLES.DECORATOR),
  validateQuery(listMyDecoratorServicesQuerySchema),
  getMyDecoratorServices
);
router.post(
  "/services",
  requireRoles(USER_ROLES.DECORATOR),
  uploadDecoratorPortfolioImages,
  validateRequest(createDecoratorServiceSchema),
  createDecoratorService
);
router.post(
  "/dashboard/services",
  requireRoles(USER_ROLES.DECORATOR),
  uploadDecoratorPortfolioImages,
  validateRequest(createDecoratorServiceSchema),
  createDecoratorService
);
router.patch(
  "/services/:serviceId",
  requireRoles(USER_ROLES.DECORATOR),
  uploadDecoratorPortfolioImages,
  validateParams(serviceParamsSchema),
  validateRequest(updateDecoratorServiceSchema),
  updateDecoratorService
);
router.patch(
  "/dashboard/services/:serviceId",
  requireRoles(USER_ROLES.DECORATOR),
  uploadDecoratorPortfolioImages,
  validateParams(serviceParamsSchema),
  validateRequest(updateDecoratorServiceSchema),
  updateDecoratorService
);
router.patch(
  "/bookings/:bookingId/respond",
  requireRoles(USER_ROLES.DECORATOR),
  validateParams(bookingParamsSchema),
  validateRequest(respondDecoratorBookingSchema),
  respondDecoratorBooking
);
router.get(
  "/dashboard/bookings/me",
  requireRoles(USER_ROLES.DECORATOR),
  validateQuery(listDecoratorBookingsQuerySchema),
  getMyDecoratorBookings
);
router.patch(
  "/dashboard/bookings/:bookingId/respond",
  requireRoles(USER_ROLES.DECORATOR),
  validateParams(bookingParamsSchema),
  validateRequest(respondDecoratorBookingSchema),
  respondDecoratorBooking
);

router.patch(
  "/bookings/:bookingId/cancel",
  validateParams(bookingParamsSchema),
  validateRequest(cancelDecoratorBookingSchema),
  cancelDecoratorBooking
);

export default router;
