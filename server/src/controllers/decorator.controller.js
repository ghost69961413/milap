import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  cancelDecoratorBookingForRequester,
  createDecoratorServiceForUser,
  listDecoratorBookingsForUser,
  listDecoratorServices,
  listDecoratorServicesForUser,
  requestDecoratorBookingForUser,
  respondDecoratorBookingForDecorator,
  updateDecoratorServiceForUser
} from "../services/decorator.service.js";

export const createDecoratorService = asyncHandler(async (req, res) => {
  const service = await createDecoratorServiceForUser(
    req.user.id,
    req.validatedData,
    req.files || []
  );

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Decorator service created successfully",
        service
      )
    );
});

export const updateDecoratorService = asyncHandler(async (req, res) => {
  const service = await updateDecoratorServiceForUser(
    req.user.id,
    req.validatedParams.serviceId,
    req.validatedData,
    req.files || []
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Decorator service updated successfully",
        service
      )
    );
});

export const getDecoratorServices = asyncHandler(async (req, res) => {
  const serviceList = await listDecoratorServices(req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Decorator services fetched successfully",
        serviceList
      )
    );
});

export const getMyDecoratorServices = asyncHandler(async (req, res) => {
  const serviceList = await listDecoratorServicesForUser(req.user.id, req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "My decorator services fetched successfully",
        serviceList
      )
    );
});

export const requestDecoratorBooking = asyncHandler(async (req, res) => {
  const booking = await requestDecoratorBookingForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(
      new ApiResponse(
        StatusCodes.CREATED,
        "Decorator booking requested successfully",
        booking
      )
    );
});

export const getMyDecoratorBookings = asyncHandler(async (req, res) => {
  const bookingList = await listDecoratorBookingsForUser(
    req.user.id,
    req.user.role,
    req.validatedQuery
  );

  return res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(
        StatusCodes.OK,
        "Decorator bookings fetched successfully",
        bookingList
      )
    );
});

export const respondDecoratorBooking = asyncHandler(async (req, res) => {
  const booking = await respondDecoratorBookingForDecorator(
    req.user.id,
    req.validatedParams.bookingId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Booking updated successfully", booking));
});

export const cancelDecoratorBooking = asyncHandler(async (req, res) => {
  const booking = await cancelDecoratorBookingForRequester(
    req.user.id,
    req.validatedParams.bookingId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Booking cancelled successfully", booking));
});
