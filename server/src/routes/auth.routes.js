import { Router } from "express";
import { getMe, login, signup } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  loginSchema,
  signupSchema
} from "../validators/auth.validator.js";

const router = Router();

router.post("/signup", validateRequest(signupSchema), signup);
router.post("/register", validateRequest(signupSchema), signup);
router.post("/login", validateRequest(loginSchema), login);
router.get("/me", requireAuth, getMe);

export default router;
