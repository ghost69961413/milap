import { Router } from "express";
import { getMessages, sendMessage } from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePoliceVerification } from "../middleware/policeVerification.middleware.js";
import { PERMISSIONS, requirePermission } from "../middleware/rbac.middleware.js";
import { validateParams } from "../middleware/validateParams.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  chatUserParamsSchema,
  getMessagesQuerySchema,
  sendMessageSchema
} from "../validators/chat.validator.js";

const router = Router();

router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.CORE_CHAT_ACCESS));
router.use(requirePoliceVerification);

router.get(
  "/with/:userId/messages",
  validateParams(chatUserParamsSchema),
  validateQuery(getMessagesQuerySchema),
  getMessages
);
router.post(
  "/with/:userId/messages",
  validateParams(chatUserParamsSchema),
  validateRequest(sendMessageSchema),
  sendMessage
);

export default router;
