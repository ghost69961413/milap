import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getConversationMessages,
  sendChatMessage
} from "../services/chat.service.js";

export const getMessages = asyncHandler(async (req, res) => {
  const data = await getConversationMessages(
    req.user.id,
    req.validatedParams.userId,
    req.validatedQuery
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Conversation messages fetched", data));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await sendChatMessage(
    req.user.id,
    req.validatedParams.userId,
    req.validatedData.content
  );

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, "Message sent", message));
});
