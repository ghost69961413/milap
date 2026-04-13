import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { findMatchesForUser } from "../services/match.service.js";

export const getMatches = asyncHandler(async (req, res) => {
  const matchResult = await findMatchesForUser(req.user.id, {
    limit: req.validatedQuery.limit,
    minScore: req.validatedQuery.minScore
  });

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Matches fetched successfully", matchResult));
});
