import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getCurrentUser } from "../services/auth.service.js";
import {
  adminLogin,
  deleteUserByAdmin,
  listPendingConsultantApprovals,
  listUsersForAdmin,
  promoteConsultantToSecondaryAdminByPrimaryAdmin,
  promoteUserToConsultantByAdmin,
  reviewConsultantApproval
} from "../services/admin.service.js";

export const loginAsAdmin = asyncHandler(async (req, res) => {
  const authData = await adminLogin(req.validatedData);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Admin login successful", authData));
});

export const getAdminMe = asyncHandler(async (req, res) => {
  const adminUser = await getCurrentUser(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Admin profile fetched", adminUser));
});

export const getAllUsersForAdmin = asyncHandler(async (req, res) => {
  const usersData = await listUsersForAdmin(req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Users fetched successfully", usersData));
});

export const getPendingConsultantsForAdmin = asyncHandler(async (req, res) => {
  const pendingConsultants = await listPendingConsultantApprovals(req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Pending consultant applications fetched successfully",
        pendingConsultants
      )
    );
});

export const reviewConsultantForAdmin = asyncHandler(async (req, res) => {
  const reviewResult = await reviewConsultantApproval(
    req.validatedParams.userId,
    req.user.id,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultant request reviewed successfully",
        reviewResult
      )
    );
});

export const promoteUserToConsultantForAdmin = asyncHandler(async (req, res) => {
  const updatedUser = await promoteUserToConsultantByAdmin(
    req.validatedParams.userId,
    req.user.id,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "User promoted to consultant successfully",
        updatedUser
      )
    );
});

export const deleteUserForAdmin = asyncHandler(async (req, res) => {
  const deletionResult = await deleteUserByAdmin(req.validatedParams.userId, req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "User deleted successfully", deletionResult));
});

export const promoteConsultantToSecondaryAdminForAdmin = asyncHandler(async (req, res) => {
  const updatedUser = await promoteConsultantToSecondaryAdminByPrimaryAdmin(
    req.validatedParams.userId,
    req.user.id,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultant promoted to secondary admin successfully",
        updatedUser
      )
    );
});
