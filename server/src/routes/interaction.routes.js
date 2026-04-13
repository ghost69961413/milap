import { Router } from "express";
import {
  acceptInterest,
  getInteractions,
  rejectInterest,
  sendInterest
} from "../controllers/interaction.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  interactionParamsSchema,
  listInteractionsQuerySchema,
  sendInterestSchema
} from "../validators/interaction.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(listInteractionsQuerySchema), getInteractions);
router.post("/", validateRequest(sendInterestSchema), sendInterest);
router.patch("/:interactionId/accept", validateParams(interactionParamsSchema), acceptInterest);
router.patch("/:interactionId/reject", validateParams(interactionParamsSchema), rejectInterest);

export default router;
