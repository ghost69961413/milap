import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  listConnectionRequestsForUser,
  rejectConnectionRequest,
  sendConnectionRequest
} from "../services/connection.service.js";

export const sendConnection = asyncHandler(async (req, res) => {
  const request = await sendConnectionRequest(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Connection request sent successfully",
        request
      )
    );
});

export const getConnectionRequests = asyncHandler(async (req, res) => {
  const requestList = await listConnectionRequestsForUser(req.user.id, req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Connection requests fetched successfully",
        requestList
      )
    );
});

export const acceptConnection = asyncHandler(async (req, res) => {
  const request = await acceptConnectionRequest(
    req.user.id,
    req.validatedParams.requestId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Connection request accepted", request));
});

export const rejectConnection = asyncHandler(async (req, res) => {
  const request = await rejectConnectionRequest(
    req.user.id,
    req.validatedParams.requestId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Connection request rejected", request));
});

export const cancelConnection = asyncHandler(async (req, res) => {
  const request = await cancelConnectionRequest(
    req.user.id,
    req.validatedParams.requestId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Connection request cancelled", request));
});
