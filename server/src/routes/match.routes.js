import { Router } from "express";
import { getMatches } from "../controllers/match.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePoliceVerification } from "../middleware/policeVerification.middleware.js";
import { PERMISSIONS, requirePermission } from "../middleware/rbac.middleware.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { getMatchesQuerySchema } from "../validators/match.validator.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.CORE_MATCHMAKING_ACCESS),
  requirePoliceVerification,
  validateQuery(getMatchesQuerySchema),
  getMatches
);

export default router;
