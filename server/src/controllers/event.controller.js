import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createEventForUser,
  linkServiceProviderToEvent,
  listEventsForUser
} from "../services/event.service.js";

export const createEvent = asyncHandler(async (req, res) => {
  const event = await createEventForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, "Event created successfully", event));
});

export const getMyEvents = asyncHandler(async (req, res) => {
  const eventList = await listEventsForUser(req.user.id, req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Events fetched successfully", eventList));
});

export const linkProviderToEvent = asyncHandler(async (req, res) => {
  const updatedEvent = await linkServiceProviderToEvent(
    req.user.id,
    req.validatedParams.eventId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Service provider linked to event successfully",
        updatedEvent
      )
    );
});
