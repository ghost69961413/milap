import asyncHandler from "../utils/asyncHandler.js";
import { assertPremiumAccess } from "../services/premium.service.js";

export const requirePremium = asyncHandler(async (req, _res, next) => {
  await assertPremiumAccess(req.user.id);
  next();
});
