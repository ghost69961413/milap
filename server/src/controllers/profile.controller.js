import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createProfileForUser,
  getPublicProfileByUserId,
  getProfileForUser,
  updateProfileForUser
} from "../services/profile.service.js";

export const createProfile = asyncHandler(async (req, res) => {
  const profile = await createProfileForUser(
    req.user.id,
    req.validatedData,
    req.files || []
  );

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, "Profile created successfully", profile));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await updateProfileForUser(
    req.user.id,
    req.validatedData,
    req.files || []
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Profile updated successfully", profile));
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await getProfileForUser(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Profile fetched successfully", profile));
});

export const getProfileByUser = asyncHandler(async (req, res) => {
  const profile = await getPublicProfileByUserId(
    req.user.id,
    req.validatedParams.userId
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Profile fetched successfully", profile));
});
