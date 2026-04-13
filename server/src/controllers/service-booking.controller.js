import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createServiceBookingForUser,
  listBookableServices,
  listServiceBookingsForUser,
  updateServiceBookingStatusForProvider
} from "../services/service-booking.service.js";

export const getBookableServices = asyncHandler(async (req, res) => {
  const serviceList = await listBookableServices(req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Bookable services fetched successfully", serviceList));
});

export const createServiceBooking = asyncHandler(async (req, res) => {
  const booking = await createServiceBookingForUser(req.user.id, req.validatedData);

  return res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(StatusCodes.CREATED, "Booking request sent successfully", booking));
});

export const getMyServiceBookings = asyncHandler(async (req, res) => {
  const bookingList = await listServiceBookingsForUser(req.user.id, req.validatedQuery);

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Service bookings fetched successfully", bookingList));
});

export const updateServiceBookingStatus = asyncHandler(async (req, res) => {
  const booking = await updateServiceBookingStatusForProvider(
    req.user.id,
    req.user.role,
    req.validatedParams.bookingId,
    req.validatedData
  );

  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Booking status updated successfully", booking));
});

