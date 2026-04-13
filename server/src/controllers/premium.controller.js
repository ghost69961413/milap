import { StatusCodes } from "http-status-codes";
import {
  boostProfileForPremium,
  createPremiumOrder,
  getPremiumProfileViewers,
  getPremiumStatus,
  verifyPremiumPayment
} from "../services/premium.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getPremiumSummary = asyncHandler(async (req, res) => {
  const summary = await getPremiumStatus(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Premium status fetched", summary));
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await createPremiumOrder(req.user.id, req.validatedData.planId);

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, "Premium payment order created", order));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const result = await verifyPremiumPayment(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Premium subscription activated", result));
});

export const getProfileViewers = asyncHandler(async (req, res) => {
  const result = await getPremiumProfileViewers(req.user.id, req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Profile viewers fetched", result));
});

export const boostProfile = asyncHandler(async (req, res) => {
  const result = await boostProfileForPremium(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Profile boost activated", result));
});
