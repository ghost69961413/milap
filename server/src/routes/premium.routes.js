import { Router } from "express";
import {
  boostProfile,
  createOrder,
  getPremiumSummary,
  getProfileViewers,
  verifyPayment
} from "../controllers/premium.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePremium } from "../middleware/premium.middleware.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createPremiumOrderSchema,
  premiumViewersQuerySchema,
  verifyPremiumPaymentSchema
} from "../validators/premium.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/status", getPremiumSummary);
router.post("/orders", validateRequest(createPremiumOrderSchema), createOrder);
router.post("/verify", validateRequest(verifyPremiumPaymentSchema), verifyPayment);
router.get(
  "/viewers",
  requirePremium,
  validateQuery(premiumViewersQuerySchema),
  getProfileViewers
);
router.post("/boost", requirePremium, boostProfile);

export default router;
