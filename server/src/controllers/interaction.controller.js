import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  acceptInterestRequest,
  listUserInteractions,
  rejectInterestRequest,
  sendInterestRequest
} from "../services/interaction.service.js";

export const sendInterest = asyncHandler(async (req, res) => {
  const interaction = await sendInterestRequest(
    req.user.id,
    req.validatedData.receiverUserId
  );

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, "Interest sent successfully", interaction));
});

export const acceptInterest = asyncHandler(async (req, res) => {
  const interaction = await acceptInterestRequest(
    req.user.id,
    req.validatedParams.interactionId
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Interest accepted successfully", interaction));
});

export const rejectInterest = asyncHandler(async (req, res) => {
  const interaction = await rejectInterestRequest(
    req.user.id,
    req.validatedParams.interactionId
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Interest rejected successfully", interaction));
});

export const getInteractions = asyncHandler(async (req, res) => {
  const interactionList = await listUserInteractions(req.user.id, req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Interactions fetched successfully", interactionList));
});
