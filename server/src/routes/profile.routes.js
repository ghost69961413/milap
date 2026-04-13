import { Router } from "express";
import {
  createProfile,
  getProfileByUser,
  getMyProfile,
  updateProfile
} from "../controllers/profile.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { uploadProfileImages } from "../middleware/upload.middleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createProfileSchema,
  profileUserParamsSchema,
  updateProfileSchema
} from "../validators/profile.validator.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyProfile);
router.get("/user/:userId", validateParams(profileUserParamsSchema), getProfileByUser);
router.post("/", uploadProfileImages, validateRequest(createProfileSchema), createProfile);
router.patch("/", uploadProfileImages, validateRequest(updateProfileSchema), updateProfile);

export default router;
