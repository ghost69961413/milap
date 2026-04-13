import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import DecoratorBooking from "../models/DecoratorBooking.js";
import DecoratorService from "../models/DecoratorService.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import {
  deleteDecoratorPortfolioImagesFromCloudinary,
  uploadDecoratorPortfolioImagesToCloudinary
} from "./media.service.js";

const DEFAULT_SERVICE_LIMIT = 30;
const DEFAULT_BOOKING_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const MAX_PORTFOLIO_IMAGES = 12;

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} is invalid`);
  }
}

function isSameId(valueA, valueB) {
  const normalizedValueA =
    typeof valueA === "object" && valueA?._id ? valueA._id.toString() : valueA?.toString();
  const normalizedValueB =
    typeof valueB === "object" && valueB?._id ? valueB._id.toString() : valueB?.toString();

  if (!normalizedValueA || !normalizedValueB) {
    return false;
  }

  return normalizedValueA === normalizedValueB;
}

function parseLimit(value, fallbackValue) {
  const limitNumber = Number(value ?? fallbackValue);
  return Math.min(Math.max(limitNumber, 1), MAX_LIST_LIMIT);
}

function normalizeStringArray(values) {
  const sanitizedValues = Array.isArray(values)
    ? values.map((value) => value.trim()).filter(Boolean)
    : [];

  return Array.from(new Set(sanitizedValues));
}

function normalizePricingPackages(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seenPackageNames = new Set();

  return values
    .map((pkg) => ({
      name: String(pkg?.name || "").trim(),
      amount: Number(pkg?.amount),
      description: String(pkg?.description || "").trim(),
      includes: normalizeStringArray(pkg?.includes || []),
      isPopular: Boolean(pkg?.isPopular)
    }))
    .filter(
      (pkg) =>
        pkg.name.length >= 2 &&
        Number.isFinite(pkg.amount) &&
        pkg.amount >= 0
    )
    .filter((pkg) => {
      const packageKey = pkg.name.toLowerCase();

      if (seenPackageNames.has(packageKey)) {
        return false;
      }

      seenPackageNames.add(packageKey);
      return true;
    });
}

function getValueId(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && value._id) {
    return value._id.toString();
  }

  return value.toString();
}

function toUserSummary(user) {
  if (!user || typeof user !== "object" || !user._id) {
    return null;
  }

  return {
    userId: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    gender: user.gender
  };
}

function toDecoratorServiceResponse(service) {
  const decoratorUserId = getValueId(service.decorator);

  return {
    decoratorServiceId: service._id.toString(),
    decoratorUserId,
    decorator: toUserSummary(service.decorator),
    title: service.title,
    description: service.description,
    eventTypes: service.eventTypes || [],
    location: service.location,
    pricing: service.pricing || {},
    pricingPackages: normalizePricingPackages(service.pricingPackages || []),
    portfolioImages: service.portfolioImages || [],
    isActive: Boolean(service.isActive),
    createdAt: service.createdAt,
    updatedAt: service.updatedAt
  };
}

function toDecoratorBookingResponse(booking, currentUserId) {
  const decoratorUserId = getValueId(booking.decorator);
  const requesterUserId = getValueId(booking.requester);
  const serviceId = getValueId(booking.service);

  return {
    decoratorBookingId: booking._id.toString(),
    serviceId,
    decoratorUserId,
    requesterUserId,
    service:
      booking.service && typeof booking.service === "object" && booking.service._id
        ? {
            serviceId: booking.service._id.toString(),
            title: booking.service.title,
            eventTypes: booking.service.eventTypes || [],
            location: booking.service.location,
            pricing: booking.service.pricing || {}
          }
        : null,
    decorator: toUserSummary(booking.decorator),
    requester: toUserSummary(booking.requester),
    eventDate: booking.eventDate,
    eventType: booking.eventType,
    location: booking.location,
    budget: booking.budget ?? null,
    notes: booking.notes || null,
    status: booking.status,
    responseNote: booking.responseNote || null,
    respondedAt: booking.respondedAt || null,
    isIncomingForDecorator: isSameId(decoratorUserId, currentUserId),
    isOutgoingForRequester: isSameId(requesterUserId, currentUserId),
    history: (booking.history || []).map((historyEvent) => ({
      action: historyEvent.action,
      by: historyEvent.by.toString(),
      at: historyEvent.at,
      note: historyEvent.note || null
    })),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

async function getUserOrThrow(userId, notFoundMessage = "User account not found") {
  const user = await User.findById(userId).select("_id fullName email role gender");

  if (!user) {
    throw new ApiError(404, notFoundMessage);
  }

  return user;
}

async function assertDecoratorUser(userId) {
  const user = await getUserOrThrow(userId, "Decorator account not found");

  if (user.role !== USER_ROLES.DECORATOR) {
    throw new ApiError(403, "Only decorator role can access this resource");
  }

  return user;
}

function mergeNestedObject(currentValue, incomingValue) {
  const currentObject =
    currentValue && typeof currentValue.toObject === "function"
      ? currentValue.toObject()
      : currentValue || {};

  return {
    ...currentObject,
    ...incomingValue
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createDecoratorServiceForUser(decoratorUserId, payload, files) {
  ensureObjectId(decoratorUserId, "decoratorUserId");
  await assertDecoratorUser(decoratorUserId);

  const uploadedImages = await uploadDecoratorPortfolioImagesToCloudinary(
    files,
    decoratorUserId
  );

  const createdService = await DecoratorService.create({
    decorator: decoratorUserId,
    ...payload,
    eventTypes: normalizeStringArray(payload.eventTypes),
    pricingPackages: normalizePricingPackages(payload.pricingPackages),
    portfolioImages: uploadedImages
  });

  const service = await DecoratorService.findById(createdService._id).populate(
    "decorator",
    "_id fullName email role gender"
  );

  return toDecoratorServiceResponse(service);
}

export async function updateDecoratorServiceForUser(
  decoratorUserId,
  serviceId,
  payload,
  files
) {
  ensureObjectId(decoratorUserId, "decoratorUserId");
  ensureObjectId(serviceId, "serviceId");
  await assertDecoratorUser(decoratorUserId);

  const service = await DecoratorService.findById(serviceId).populate(
    "decorator",
    "_id fullName email role gender"
  );

  if (!service) {
    throw new ApiError(404, "Decorator service listing not found");
  }

  if (!isSameId(service.decorator, decoratorUserId)) {
    throw new ApiError(403, "You are not authorized to update this listing");
  }

  const removeImagePublicIds = payload.removeImagePublicIds || [];

  if (removeImagePublicIds.length) {
    const imageIdsToRemove = new Set(removeImagePublicIds);

    const removablePublicIds = service.portfolioImages
      .filter((image) => imageIdsToRemove.has(image.publicId))
      .map((image) => image.publicId);

    await deleteDecoratorPortfolioImagesFromCloudinary(removablePublicIds);

    service.portfolioImages = service.portfolioImages.filter(
      (image) => !imageIdsToRemove.has(image.publicId)
    );
  }

  const uploadedImages = await uploadDecoratorPortfolioImagesToCloudinary(
    files,
    decoratorUserId
  );

  if (service.portfolioImages.length + uploadedImages.length > MAX_PORTFOLIO_IMAGES) {
    throw new ApiError(
      400,
      `You can upload up to ${MAX_PORTFOLIO_IMAGES} portfolio images`
    );
  }

  if (uploadedImages.length) {
    service.portfolioImages.push(...uploadedImages);
  }

  if (payload.title !== undefined) {
    service.title = payload.title;
  }

  if (payload.description !== undefined) {
    service.description = payload.description;
  }

  if (payload.eventTypes !== undefined) {
    service.eventTypes = normalizeStringArray(payload.eventTypes);
  }

  if (payload.location !== undefined) {
    service.location = payload.location;
  }

  if (payload.pricing) {
    service.pricing = mergeNestedObject(service.pricing, payload.pricing);
  }

  if (payload.pricingPackages !== undefined) {
    service.pricingPackages = normalizePricingPackages(payload.pricingPackages);
  }

  if (payload.isActive !== undefined) {
    service.isActive = payload.isActive;
  }

  await service.save();

  return toDecoratorServiceResponse(service);
}

export async function listDecoratorServices(options = {}) {
  const limit = parseLimit(options.limit, DEFAULT_SERVICE_LIMIT);
  const query = {
    isActive: true
  };

  if (Array.isArray(options.eventType) && options.eventType.length) {
    query.eventTypes = {
      $in: options.eventType.map(
        (eventTypeItem) => new RegExp(`^${escapeRegex(eventTypeItem)}$`, "i")
      )
    };
  }

  if (options.location) {
    query.location = new RegExp(escapeRegex(options.location), "i");
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    query["pricing.amount"] = {};

    if (options.minPrice !== undefined) {
      query["pricing.amount"].$gte = options.minPrice;
    }

    if (options.maxPrice !== undefined) {
      query["pricing.amount"].$lte = options.maxPrice;
    }
  }

  const services = await DecoratorService.find(query)
    .populate("decorator", "_id fullName email role gender")
    .sort({ updatedAt: -1 })
    .limit(limit);

  const activeDecoratorServices = services
    .filter((service) => service.decorator?.role === USER_ROLES.DECORATOR)
    .map((service) => toDecoratorServiceResponse(service));

  return {
    totalServices: activeDecoratorServices.length,
    services: activeDecoratorServices
  };
}

export async function listDecoratorServicesForUser(decoratorUserId, options = {}) {
  ensureObjectId(decoratorUserId, "decoratorUserId");
  await assertDecoratorUser(decoratorUserId);

  const limit = parseLimit(options.limit, DEFAULT_SERVICE_LIMIT);
  const query = {
    decorator: decoratorUserId
  };

  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }

  const services = await DecoratorService.find(query)
    .populate("decorator", "_id fullName email role gender")
    .sort({ updatedAt: -1 })
    .limit(limit);

  return {
    totalServices: services.length,
    services: services.map((service) => toDecoratorServiceResponse(service))
  };
}

export async function requestDecoratorBookingForUser(requesterUserId, payload) {
  ensureObjectId(requesterUserId, "requesterUserId");
  ensureObjectId(payload.serviceId, "serviceId");

  await getUserOrThrow(requesterUserId, "Requester account not found");

  const service = await DecoratorService.findById(payload.serviceId).select(
    "_id decorator isActive"
  );

  if (!service) {
    throw new ApiError(404, "Decorator service listing not found");
  }

  if (!service.isActive) {
    throw new ApiError(400, "This service is currently inactive");
  }

  if (isSameId(service.decorator, requesterUserId)) {
    throw new ApiError(400, "You cannot book your own service");
  }

  await assertDecoratorUser(service.decorator.toString());

  const existingPendingBooking = await DecoratorBooking.findOne({
    service: service._id,
    requester: requesterUserId,
    eventDate: payload.eventDate,
    status: "pending"
  }).select("_id");

  if (existingPendingBooking) {
    throw new ApiError(
      409,
      "You already have a pending booking for this service and date"
    );
  }

  const createdBooking = await DecoratorBooking.create({
    service: service._id,
    decorator: service.decorator,
    requester: requesterUserId,
    eventDate: payload.eventDate,
    eventType: payload.eventType,
    location: payload.location,
    budget: payload.budget,
    notes: payload.notes,
    status: "pending",
    history: [
      {
        action: "requested",
        by: requesterUserId,
        note: "Service booking request created"
      }
    ]
  });

  const booking = await DecoratorBooking.findById(createdBooking._id)
    .populate("service", "_id title eventTypes location pricing")
    .populate("decorator", "_id fullName email role gender")
    .populate("requester", "_id fullName email role gender");

  return toDecoratorBookingResponse(booking, requesterUserId);
}

export async function listDecoratorBookingsForUser(userId, role, options = {}) {
  ensureObjectId(userId, "userId");
  const limit = parseLimit(options.limit, DEFAULT_BOOKING_LIMIT);
  const query = {};

  if (role === USER_ROLES.DECORATOR) {
    query.decorator = userId;
  } else {
    query.requester = userId;
  }

  if (options.status) {
    query.status = options.status;
  }

  const bookings = await DecoratorBooking.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("service", "_id title eventTypes location pricing")
    .populate("decorator", "_id fullName email role gender")
    .populate("requester", "_id fullName email role gender");

  return {
    totalBookings: bookings.length,
    bookings: bookings.map((booking) => toDecoratorBookingResponse(booking, userId))
  };
}

export async function respondDecoratorBookingForDecorator(
  decoratorUserId,
  bookingId,
  payload
) {
  ensureObjectId(decoratorUserId, "decoratorUserId");
  ensureObjectId(bookingId, "bookingId");
  await assertDecoratorUser(decoratorUserId);

  const booking = await DecoratorBooking.findById(bookingId)
    .populate("service", "_id title eventTypes location pricing")
    .populate("decorator", "_id fullName email role gender")
    .populate("requester", "_id fullName email role gender");

  if (!booking) {
    throw new ApiError(404, "Booking request not found");
  }

  if (!isSameId(booking.decorator, decoratorUserId)) {
    throw new ApiError(403, "You are not authorized to update this booking");
  }

  if (payload.status === "completed") {
    if (booking.status !== "accepted") {
      throw new ApiError(400, "Only accepted bookings can be marked as completed");
    }
  } else if (booking.status !== "pending") {
    throw new ApiError(
      400,
      `Booking is already ${booking.status}. Only pending bookings can be accepted or rejected.`
    );
  }

  booking.status = payload.status;
  booking.responseNote = payload.responseNote || null;
  booking.respondedAt = new Date();
  booking.history.push({
    action: payload.status,
    by: decoratorUserId,
    note: payload.responseNote || `Booking ${payload.status}`
  });

  await booking.save();

  return toDecoratorBookingResponse(booking, decoratorUserId);
}

export async function cancelDecoratorBookingForRequester(
  requesterUserId,
  bookingId,
  payload
) {
  ensureObjectId(requesterUserId, "requesterUserId");
  ensureObjectId(bookingId, "bookingId");

  const booking = await DecoratorBooking.findById(bookingId)
    .populate("service", "_id title eventTypes location pricing")
    .populate("decorator", "_id fullName email role gender")
    .populate("requester", "_id fullName email role gender");

  if (!booking) {
    throw new ApiError(404, "Booking request not found");
  }

  if (!isSameId(booking.requester, requesterUserId)) {
    throw new ApiError(403, "You are not authorized to cancel this booking");
  }

  if (!["pending", "accepted"].includes(booking.status)) {
    throw new ApiError(400, `Booking is already ${booking.status} and cannot be cancelled`);
  }

  booking.status = "cancelled";
  booking.responseNote = payload.cancelReason || "Cancelled by requester";
  booking.respondedAt = new Date();
  booking.history.push({
    action: "cancelled",
    by: requesterUserId,
    note: payload.cancelReason || "Booking cancelled by requester"
  });

  await booking.save();

  return toDecoratorBookingResponse(booking, requesterUserId);
}
