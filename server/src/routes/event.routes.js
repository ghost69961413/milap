import { Router } from "express";
import {
  createEvent,
  getMyEvents,
  linkProviderToEvent
} from "../controllers/event.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createEventSchema,
  eventParamsSchema,
  linkServiceProviderSchema,
  listEventsQuerySchema
} from "../validators/event.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(listEventsQuerySchema), getMyEvents);
router.post("/", validateRequest(createEventSchema), createEvent);
router.post(
  "/:eventId/providers",
  validateParams(eventParamsSchema),
  validateRequest(linkServiceProviderSchema),
  linkProviderToEvent
);

export default router;
