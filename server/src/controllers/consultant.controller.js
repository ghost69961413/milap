import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  applyForConsultantRoleForUser,
  createConsultantProfileForUser,
  getConsultantProfileForUser,
  listConsultants,
  listConsultationRequestsForUser,
  requestConsultationForUser,
  respondConsultationRequestForConsultant,
  updateConsultantProfileForUser
} from "../services/consultant.service.js";
import {
  createServiceBookingForUser,
  listServiceBookingsForUser,
  updateServiceBookingStatusForProvider
} from "../services/service-booking.service.js";

export const applyForConsultantRole = asyncHandler(async (req, res) => {
  const application = await applyForConsultantRoleForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Consultant role application submitted",
        application
      )
    );
});

export const createConsultantProfile = asyncHandler(async (req, res) => {
  const profile = await createConsultantProfileForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Consultant profile created successfully",
        profile
      )
    );
});

export const updateConsultantProfile = asyncHandler(async (req, res) => {
  const profile = await updateConsultantProfileForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultant profile updated successfully",
        profile
      )
    );
});

export const getMyConsultantProfile = asyncHandler(async (req, res) => {
  const profile = await getConsultantProfileForUser(req.user.id);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultant profile fetched successfully",
        profile
      )
    );
});

export const getConsultants = asyncHandler(async (req, res) => {
  const consultantList = await listConsultants(req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultants fetched successfully",
        consultantList
      )
    );
});

export const requestConsultation = asyncHandler(async (req, res) => {
  const consultationRequest = await requestConsultationForUser(
    req.user.id,
    req.validatedData
  );

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Consultation request sent successfully",
        consultationRequest
      )
    );
});

export const getMyConsultationRequests = asyncHandler(async (req, res) => {
  const requestList = await listConsultationRequestsForUser(
    req.user.id,
    req.user.role,
    req.validatedQuery
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultation requests fetched successfully",
        requestList
      )
    );
});

export const respondConsultationRequest = asyncHandler(async (req, res) => {
  const updatedRequest = await respondConsultationRequestForConsultant(
    req.user.id,
    req.validatedParams.requestId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultation request updated successfully",
        updatedRequest
      )
    );
});

export const createConsultantConnection = asyncHandler(async (req, res) => {
  const booking = await createServiceBookingForUser(req.user.id, {
    serviceType: "consultant",
    providerUserId: req.validatedData.consultantUserId,
    message: req.validatedData.message,
    preferredDate: req.validatedData.preferredDate
  });

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Consultant connection request sent successfully",
        booking
      )
    );
});

export const getMyConsultantConnections = asyncHandler(async (req, res) => {
  const connectionList = await listServiceBookingsForUser(req.user.id, {
    ...req.validatedQuery,
    serviceType: "consultant"
  });

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultant connections fetched successfully",
        connectionList
      )
    );
});

export const respondConsultantConnection = asyncHandler(async (req, res) => {
  const booking = await updateServiceBookingStatusForProvider(
    req.user.id,
    req.user.role,
    req.validatedParams.connectionId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Consultant connection request updated successfully",
        booking
      )
    );
});
