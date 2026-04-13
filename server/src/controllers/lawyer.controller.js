import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createLawyerProfileForUser,
  getLawyerProfileForUser,
  listLawyers,
  listLegalConsultationRequestsForUser,
  requestLegalConsultationForUser,
  respondLegalConsultationRequestForLawyer,
  updateLawyerProfileForUser
} from "../services/lawyer.service.js";

export const createLawyerProfile = asyncHandler(async (req, res) => {
  const profile = await createLawyerProfileForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(StatusCodes.CREATED, "Lawyer profile created successfully", profile)
    );
});

export const updateLawyerProfile = asyncHandler(async (req, res) => {
  const profile = await updateLawyerProfileForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(StatusCodes.OK, "Lawyer profile updated successfully", profile)
    );
});

export const getMyLawyerProfile = asyncHandler(async (req, res) => {
  const profile = await getLawyerProfileForUser(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(StatusCodes.OK, "Lawyer profile fetched successfully", profile)
    );
});

export const getLawyers = asyncHandler(async (req, res) => {
  const lawyerList = await listLawyers(req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Lawyers fetched successfully", lawyerList));
});

export const requestLegalConsultation = asyncHandler(async (req, res) => {
  const consultationRequest = await requestLegalConsultationForUser(
    req.user.id,
    req.validatedData
  );

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Legal consultation request sent successfully",
        consultationRequest
      )
    );
});

export const getMyLegalConsultationRequests = asyncHandler(async (req, res) => {
  const requestList = await listLegalConsultationRequestsForUser(
    req.user.id,
    req.user.role,
    req.validatedQuery
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Legal consultation requests fetched successfully",
        requestList
      )
    );
});

export const getMyLawyerBookingRequests = asyncHandler(async (req, res) => {
  const requestList = await listLegalConsultationRequestsForUser(
    req.user.id,
    req.user.role,
    req.validatedQuery
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Lawyer booking requests fetched successfully",
        requestList
      )
    );
});

export const respondLegalConsultationRequest = asyncHandler(async (req, res) => {
  const updatedRequest = await respondLegalConsultationRequestForLawyer(
    req.user.id,
    req.validatedParams.requestId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Legal consultation request updated successfully",
        updatedRequest
      )
    );
});

export const respondLawyerBookingRequest = asyncHandler(async (req, res) => {
  const updatedRequest = await respondLegalConsultationRequestForLawyer(
    req.user.id,
    req.validatedParams.requestId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Lawyer booking request updated successfully",
        updatedRequest
      )
    );
});
