import { StatusCodes } from "http-status-codes";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getMyPoliceVerificationStatus,
  listPendingPoliceVerifications,
  reviewPoliceVerification,
  uploadUserPoliceVerificationDocument
} from "../services/verification.service.js";

export const uploadPoliceVerificationDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Verification document file is required");
  }

  const verificationInfo = await uploadUserPoliceVerificationDocument(
    req.user.id,
    req.file,
    req.validatedData.documentType
  );

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Verification document uploaded",
        verificationInfo
      )
    );
});

export const getMyVerificationStatus = asyncHandler(async (req, res) => {
  const verificationInfo = await getMyPoliceVerificationStatus(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Police verification status fetched successfully",
        verificationInfo
      )
    );
});

export const getPendingVerifications = asyncHandler(async (req, res) => {
  const pendingVerificationList = await listPendingPoliceVerifications(
    {
      ...req.validatedQuery,
      excludeUserId: req.user.id
    }
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Pending police verifications fetched successfully",
        pendingVerificationList
      )
    );
});

export const reviewVerification = asyncHandler(async (req, res) => {
  const reviewResult = await reviewPoliceVerification(
    req.validatedParams.userId,
    req.user.id,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Police verification reviewed successfully",
        reviewResult
      )
    );
});
