import { StatusCodes } from "http-status-codes";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  getCurrentUser,
  loginUser,
  signupUser
} from "../services/auth.service.js";

export const signup = asyncHandler(async (req, res) => {
  const authData = await signupUser(req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, "Signup successful", authData));
});

export const login = asyncHandler(async (req, res) => {
  const authData = await loginUser(req.validatedData);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Login successful", authData));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Authenticated user fetched", user));
});
