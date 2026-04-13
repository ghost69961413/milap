import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import ConsultantProfile from "../models/ConsultantProfile.js";
import DecoratorService from "../models/DecoratorService.js";
import LawyerProfile from "../models/LawyerProfile.js";
import ServiceBooking from "../models/ServiceBooking.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { listConsultants } from "./consultant.service.js";
import { listDecoratorServices } from "./decorator.service.js";
import { listLawyers } from "./lawyer.service.js";
import { assertPoliceVerifiedForCoreAccess } from "./verification.service.js";

const DEFAULT_SERVICE_LIMIT = 30;
const DEFAULT_BOOKING_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} is invalid`);
  }
}

function parseLimit(value, fallbackValue) {
  const limitNumber = Number(value ?? fallbackValue);
  return Math.min(Math.max(limitNumber, 1), MAX_LIST_LIMIT);
}

function isSameId(valueA, valueB) {
  const normalizedValueA = getValueId(valueA);
  const normalizedValueB = getValueId(valueB);

  if (!normalizedValueA || !normalizedValueB) {
    return false;
  }

  return normalizedValueA === normalizedValueB;
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

function getServiceListingSummary(booking) {
  const serviceListing = booking.serviceListing;

  if (!serviceListing || typeof serviceListing !== "object") {
    return null;
  }

  if (booking.serviceType === "consultant") {
    return {
      serviceListingId: serviceListing._id.toString(),
      type: "consultant",
      expertise: serviceListing.expertise || [],
      pricing: serviceListing.pricing || {},
      availability: serviceListing.availability || {}
    };
  }

  if (booking.serviceType === "lawyer") {
    return {
      serviceListingId: serviceListing._id.toString(),
      type: "lawyer",
      specialization: serviceListing.specialization || [],
      experienceYears: serviceListing.experienceYears ?? null,
      pricing: serviceListing.pricing || {},
      availability: serviceListing.availability || {}
    };
  }

  if (booking.serviceType === "decorator") {
    return {
      serviceListingId: serviceListing._id.toString(),
      type: "decorator",
      title: serviceListing.title,
      eventTypes: serviceListing.eventTypes || [],
      location: serviceListing.location,
      pricing: serviceListing.pricing || {},
      pricingPackages: serviceListing.pricingPackages || [],
      portfolioImages: serviceListing.portfolioImages || []
    };
  }

  return null;
}

function toBookingResponse(booking, currentUserId) {
  const requesterUserId = getValueId(booking.requester);
  const providerUserId = getValueId(booking.provider);

  return {
    serviceBookingId: booking._id.toString(),
    requesterUserId,
    providerUserId,
    providerRole: booking.providerRole,
    serviceType: booking.serviceType,
    serviceListingId: getValueId(booking.serviceListing),
    requester: toUserSummary(booking.requester),
    provider: toUserSummary(booking.provider),
    serviceListing: getServiceListingSummary(booking),
    message: booking.message || null,
    preferredDate: booking.preferredDate || null,
    eventDate: booking.eventDate || null,
    eventType: booking.eventType || null,
    location: booking.location || null,
    budget: booking.budget ?? null,
    status: booking.status,
    responseNote: booking.responseNote || null,
    respondedAt: booking.respondedAt || null,
    completedAt: booking.completedAt || null,
    isIncomingForProvider: isSameId(providerUserId, currentUserId),
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

function mapConsultantService(item) {
  return {
    serviceType: "consultant",
    providerRole: USER_ROLES.CONSULTANT,
    providerUserId: item.consultantUserId,
    serviceListingId: item.consultantProfileId,
    title: `Consultant - ${item.consultant?.fullName || "Consultant"}`,
    displayName: item.consultant?.fullName || "Consultant",
    expertise: item.expertise || [],
    pricing: item.pricing || {},
    availability: item.availability || {},
    raw: item
  };
}

function mapLawyerService(item) {
  return {
    serviceType: "lawyer",
    providerRole: USER_ROLES.LAWYER,
    providerUserId: item.lawyerUserId,
    serviceListingId: item.lawyerProfileId,
    title: `Lawyer - ${item.lawyer?.fullName || "Lawyer"}`,
    displayName: item.lawyer?.fullName || "Lawyer",
    specialization: item.specialization || [],
    experienceYears: item.experienceYears ?? null,
    location: item.location || null,
    pricing: item.pricing || {},
    availability: item.availability || {},
    raw: item
  };
}

function mapDecoratorService(item) {
  return {
    serviceType: "decorator",
    providerRole: USER_ROLES.DECORATOR,
    providerUserId: item.decoratorUserId,
    serviceListingId: item.decoratorServiceId,
    title: item.title || "Decorator Service",
    displayName: item.decorator?.fullName || "Decorator",
    eventTypes: item.eventTypes || [],
    location: item.location,
    pricing: item.pricing || {},
    pricingPackages: item.pricingPackages || [],
    portfolioImages: item.portfolioImages || [],
    raw: item
  };
}

async function getUserOrThrow(userId, notFoundMessage = "User account not found") {
  const user = await User.findById(userId).select("_id fullName email role gender");

  if (!user) {
    throw new ApiError(404, notFoundMessage);
  }

  return user;
}

async function resolveServiceReference(payload) {
  const providerRole = payload.serviceType;

  if (providerRole === USER_ROLES.CONSULTANT) {
    const consultantProfile = await ConsultantProfile.findOne({
      user: payload.providerUserId,
      isActive: true
    }).select("_id expertise pricing availability");

    if (!consultantProfile) {
      throw new ApiError(404, "Consultant profile is not available");
    }

    return {
      providerRole,
      serviceListingModel: "ConsultantProfile",
      serviceListing: consultantProfile._id
    };
  }

  if (providerRole === USER_ROLES.LAWYER) {
    const lawyerProfile = await LawyerProfile.findOne({
      user: payload.providerUserId,
      isActive: true
    }).select("_id specialization pricing availability location");

    if (!lawyerProfile) {
      throw new ApiError(404, "Lawyer profile is not available");
    }

    return {
      providerRole,
      serviceListingModel: "LawyerProfile",
      serviceListing: lawyerProfile._id
    };
  }

  if (providerRole === USER_ROLES.DECORATOR) {
    if (!payload.serviceListingId) {
      throw new ApiError(400, "serviceListingId is required for decorator booking");
    }

    ensureObjectId(payload.serviceListingId, "serviceListingId");

    const decoratorService = await DecoratorService.findOne({
      _id: payload.serviceListingId,
      decorator: payload.providerUserId,
      isActive: true
    }).select("_id eventTypes");

    if (!decoratorService) {
      throw new ApiError(404, "Decorator service listing is not available");
    }

    const isSupportedEventType = (decoratorService.eventTypes || [])
      .map((eventType) => String(eventType).trim().toLowerCase())
      .includes(String(payload.eventType || "").trim().toLowerCase());

    if (!isSupportedEventType) {
      throw new ApiError(
        400,
        "Selected decorator service does not support this event type"
      );
    }

    return {
      providerRole,
      serviceListingModel: "DecoratorService",
      serviceListing: decoratorService._id
    };
  }

  throw new ApiError(400, "Unsupported serviceType");
}

export async function listBookableServices(options = {}) {
  const limit = parseLimit(options.limit, DEFAULT_SERVICE_LIMIT);
  const serviceType = options.serviceType;

  if (serviceType === "consultant") {
    const consultantList = await listConsultants({
      expertise: options.expertise,
      limit
    });

    const services = (consultantList.consultants || []).map(mapConsultantService);

    return {
      totalServices: services.length,
      services
    };
  }

  if (serviceType === "lawyer") {
    const lawyerList = await listLawyers({
      specialization: options.specialization,
      minExperienceYears: options.minExperienceYears,
      maxExperienceYears: options.maxExperienceYears,
      limit
    });

    const services = (lawyerList.lawyers || []).map(mapLawyerService);

    return {
      totalServices: services.length,
      services
    };
  }

  if (serviceType === "decorator") {
    const decoratorServiceList = await listDecoratorServices({
      eventType: options.eventType,
      location: options.location,
      minPrice: options.minPrice,
      maxPrice: options.maxPrice,
      limit
    });

    const services = (decoratorServiceList.services || []).map(mapDecoratorService);

    return {
      totalServices: services.length,
      services
    };
  }

  const [consultantList, lawyerList, decoratorServiceList] = await Promise.all([
    listConsultants({
      expertise: options.expertise,
      limit
    }),
    listLawyers({
      specialization: options.specialization,
      minExperienceYears: options.minExperienceYears,
      maxExperienceYears: options.maxExperienceYears,
      limit
    }),
    listDecoratorServices({
      eventType: options.eventType,
      location: options.location,
      minPrice: options.minPrice,
      maxPrice: options.maxPrice,
      limit
    })
  ]);

  const services = [
    ...(consultantList.consultants || []).map(mapConsultantService),
    ...(lawyerList.lawyers || []).map(mapLawyerService),
    ...(decoratorServiceList.services || []).map(mapDecoratorService)
  ];

  return {
    totalServices: services.length,
    services
  };
}

export async function createServiceBookingForUser(requesterUserId, payload) {
  ensureObjectId(requesterUserId, "requesterUserId");
  ensureObjectId(payload.providerUserId, "providerUserId");

  if (isSameId(requesterUserId, payload.providerUserId)) {
    throw new ApiError(400, "You cannot book your own service");
  }

  const requester = await getUserOrThrow(requesterUserId, "Requester account not found");

  if (requester.role !== USER_ROLES.NORMAL_USER) {
    throw new ApiError(403, "Only normal users can create service bookings");
  }

  await assertPoliceVerifiedForCoreAccess(requesterUserId);

  const provider = await getUserOrThrow(payload.providerUserId, "Provider account not found");
  const resolvedService = await resolveServiceReference(payload);

  if (provider.role !== resolvedService.providerRole) {
    throw new ApiError(
      400,
      `Selected provider is not registered as ${resolvedService.providerRole}`
    );
  }

  const pendingDuplicateQuery = {
    requester: requesterUserId,
    provider: payload.providerUserId,
    serviceType: payload.serviceType,
    serviceListing: resolvedService.serviceListing,
    status: "pending"
  };

  if (payload.serviceType === USER_ROLES.DECORATOR) {
    pendingDuplicateQuery.eventDate = payload.eventDate;
  } else {
    pendingDuplicateQuery.eventDate = null;
  }

  const existingPendingBooking = await ServiceBooking.findOne(pendingDuplicateQuery).select(
    "_id"
  );

  if (existingPendingBooking) {
    throw new ApiError(409, "You already have a pending booking request for this service");
  }

  const createdBooking = await ServiceBooking.create({
    requester: requesterUserId,
    provider: payload.providerUserId,
    providerRole: resolvedService.providerRole,
    serviceType: payload.serviceType,
    serviceListingModel: resolvedService.serviceListingModel,
    serviceListing: resolvedService.serviceListing,
    message: payload.message,
    preferredDate: payload.preferredDate,
    eventDate: payload.eventDate,
    eventType: payload.eventType,
    location: payload.location,
    budget: payload.budget,
    status: "pending",
    history: [
      {
        action: "requested",
        by: requesterUserId,
        note: "Service booking requested"
      }
    ]
  });

  const booking = await ServiceBooking.findById(createdBooking._id)
    .populate("requester", "_id fullName email role gender")
    .populate("provider", "_id fullName email role gender")
    .populate("serviceListing");

  return toBookingResponse(booking, requesterUserId);
}

export async function listServiceBookingsForUser(userId, options = {}) {
  ensureObjectId(userId, "userId");

  const direction = options.direction || "all";
  const limit = parseLimit(options.limit, DEFAULT_BOOKING_LIMIT);
  const query = {};

  if (direction === "incoming") {
    query.provider = userId;
  } else if (direction === "outgoing") {
    query.requester = userId;
  } else {
    query.$or = [{ requester: userId }, { provider: userId }];
  }

  if (options.status) {
    query.status = options.status;
  }

  if (options.serviceType) {
    query.serviceType = options.serviceType;
  }

  const bookings = await ServiceBooking.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("requester", "_id fullName email role gender")
    .populate("provider", "_id fullName email role gender")
    .populate("serviceListing");

  return {
    totalBookings: bookings.length,
    bookings: bookings.map((booking) => toBookingResponse(booking, userId))
  };
}

export async function updateServiceBookingStatusForProvider(
  providerUserId,
  providerUserRole,
  bookingId,
  payload
) {
  ensureObjectId(providerUserId, "providerUserId");
  ensureObjectId(bookingId, "bookingId");

  if (
    ![USER_ROLES.CONSULTANT, USER_ROLES.LAWYER, USER_ROLES.DECORATOR].includes(
      providerUserRole
    )
  ) {
    throw new ApiError(403, "Only service providers can update booking status");
  }

  const booking = await ServiceBooking.findById(bookingId)
    .populate("requester", "_id fullName email role gender")
    .populate("provider", "_id fullName email role gender")
    .populate("serviceListing");

  if (!booking) {
    throw new ApiError(404, "Service booking not found");
  }

  if (!isSameId(booking.provider, providerUserId)) {
    throw new ApiError(403, "You are not authorized to update this booking");
  }

  if (booking.providerRole !== providerUserRole) {
    throw new ApiError(403, "Provider role mismatch for this booking");
  }

  if (payload.status === "completed") {
    if (booking.status !== "accepted") {
      throw new ApiError(400, "Only accepted bookings can be marked as completed");
    }
  } else if (booking.status !== "pending") {
    throw new ApiError(
      400,
      `Booking is already ${booking.status}. Only pending bookings can be accepted/rejected.`
    );
  }

  booking.status = payload.status;
  booking.responseNote = payload.responseNote || null;
  booking.respondedAt = new Date();

  if (payload.status === "completed") {
    booking.completedAt = new Date();
  }

  booking.history.push({
    action: payload.status,
    by: providerUserId,
    note: payload.responseNote || `Booking ${payload.status}`
  });

  await booking.save();

  return toBookingResponse(booking, providerUserId);
}
