import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import ConsultantProfile from "../models/ConsultantProfile.js";
import DecoratorService from "../models/DecoratorService.js";
import Event from "../models/Event.js";
import LawyerProfile from "../models/LawyerProfile.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

const DEFAULT_EVENT_LIMIT = 50;
const MAX_EVENT_LIMIT = 100;

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
  return Math.min(Math.max(limitNumber, 1), MAX_EVENT_LIMIT);
}

function isConsultantApproved(user) {
  if (!user || user.role !== USER_ROLES.CONSULTANT) {
    return false;
  }

  const consultantRequestStatus = user.consultantRequestStatus || "approved";
  return consultantRequestStatus !== "pending" && consultantRequestStatus !== "rejected";
}

function toUserSummary(user) {
  if (!user || typeof user !== "object" || !user._id) {
    return null;
  }

  const consultantRequestStatus =
    user.consultantRequestStatus ||
    (user.role === USER_ROLES.CONSULTANT ? "approved" : "none");

  return {
    userId: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    gender: user.gender,
    consultantRequestStatus
  };
}

function toProviderResponse(provider) {
  const providerUser =
    provider.providerUser &&
    typeof provider.providerUser === "object" &&
    provider.providerUser._id
      ? provider.providerUser
      : null;

  return {
    role: provider.role,
    providerUserId: providerUser
      ? providerUser._id.toString()
      : provider.providerUser.toString(),
    provider: toUserSummary(providerUser),
    linkedServiceType: provider.linkedServiceType,
    linkedServiceId: provider.linkedServiceId.toString(),
    notes: provider.notes || null,
    addedAt: provider.addedAt
  };
}

function toEventResponse(event) {
  return {
    eventId: event._id.toString(),
    userId: event.user.toString(),
    profileId: event.profile.toString(),
    eventType: event.eventType,
    title: event.title || null,
    eventDate: event.eventDate || null,
    location: event.location || null,
    budget: event.budget ?? null,
    notes: event.notes || null,
    status: event.status,
    serviceProviders: (event.serviceProviders || []).map((provider) =>
      toProviderResponse(provider)
    ),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

async function getEventForOwner(eventId, ownerUserId) {
  const event = await Event.findById(eventId).populate(
    "serviceProviders.providerUser",
    "_id fullName email role gender consultantRequestStatus"
  );

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  if (!isSameId(event.user, ownerUserId)) {
    throw new ApiError(403, "You are not authorized to access this event");
  }

  return event;
}

async function resolveLinkedServiceForProvider(role, providerUserId, decoratorServiceId) {
  if (role === USER_ROLES.CONSULTANT) {
    const consultantProfile = await ConsultantProfile.findOne({
      user: providerUserId,
      isActive: true
    }).select("_id");

    if (!consultantProfile) {
      throw new ApiError(404, "Active consultant profile not found for this user");
    }

    return {
      linkedServiceType: "consultant_profile",
      linkedServiceId: consultantProfile._id
    };
  }

  if (role === USER_ROLES.LAWYER) {
    const lawyerProfile = await LawyerProfile.findOne({
      user: providerUserId,
      isActive: true
    }).select("_id");

    if (!lawyerProfile) {
      throw new ApiError(404, "Active lawyer profile not found for this user");
    }

    return {
      linkedServiceType: "lawyer_profile",
      linkedServiceId: lawyerProfile._id
    };
  }

  if (role === USER_ROLES.DECORATOR) {
    if (!decoratorServiceId) {
      throw new ApiError(400, "decoratorServiceId is required for decorator role");
    }

    ensureObjectId(decoratorServiceId, "decoratorServiceId");

    const decoratorService = await DecoratorService.findOne({
      _id: decoratorServiceId,
      decorator: providerUserId,
      isActive: true
    }).select("_id");

    if (!decoratorService) {
      throw new ApiError(404, "Active decorator service listing not found");
    }

    return {
      linkedServiceType: "decorator_service",
      linkedServiceId: decoratorService._id
    };
  }

  throw new ApiError(400, "Unsupported provider role");
}

export async function createEventForUser(userId, payload) {
  ensureObjectId(userId, "userId");

  const profile = await Profile.findOne({ user: userId }).select("_id");

  if (!profile) {
    throw new ApiError(400, "Please create your profile before creating an event");
  }

  const event = await Event.create({
    user: userId,
    profile: profile._id,
    eventType: payload.eventType,
    title: payload.title,
    eventDate: payload.eventDate,
    location: payload.location,
    budget: payload.budget,
    notes: payload.notes
  });

  return toEventResponse(event);
}

export async function listEventsForUser(userId, options = {}) {
  ensureObjectId(userId, "userId");

  const query = {
    user: userId
  };

  if (options.eventType) {
    query.eventType = options.eventType;
  }

  if (options.status) {
    query.status = options.status;
  }

  const limit = parseLimit(options.limit, DEFAULT_EVENT_LIMIT);

  const events = await Event.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate(
      "serviceProviders.providerUser",
      "_id fullName email role gender consultantRequestStatus"
    );

  return {
    totalEvents: events.length,
    events: events.map((event) => toEventResponse(event))
  };
}

export async function linkServiceProviderToEvent(userId, eventId, payload) {
  ensureObjectId(userId, "userId");
  ensureObjectId(eventId, "eventId");
  ensureObjectId(payload.providerUserId, "providerUserId");

  const event = await getEventForOwner(eventId, userId);

  const providerUser = await User.findById(payload.providerUserId).select(
    "_id fullName email role gender consultantRequestStatus"
  );

  if (!providerUser) {
    throw new ApiError(404, "Provider user not found");
  }

  if (providerUser.role !== payload.role) {
    throw new ApiError(400, `Selected provider is not registered as ${payload.role}`);
  }

  if (
    payload.role === USER_ROLES.CONSULTANT &&
    !isConsultantApproved(providerUser)
  ) {
    throw new ApiError(
      403,
      "Selected consultant is pending admin approval and cannot be linked yet"
    );
  }

  const linkedServiceInfo = await resolveLinkedServiceForProvider(
    payload.role,
    payload.providerUserId,
    payload.decoratorServiceId
  );

  const isAlreadyLinked = (event.serviceProviders || []).some(
    (provider) =>
      provider.role === payload.role &&
      isSameId(provider.providerUser, payload.providerUserId) &&
      isSameId(provider.linkedServiceId, linkedServiceInfo.linkedServiceId)
  );

  if (isAlreadyLinked) {
    throw new ApiError(409, "This provider is already linked to the event");
  }

  event.serviceProviders.push({
    role: payload.role,
    providerUser: payload.providerUserId,
    linkedServiceType: linkedServiceInfo.linkedServiceType,
    linkedServiceId: linkedServiceInfo.linkedServiceId,
    notes: payload.notes
  });

  await event.save();

  const updatedEvent = await getEventForOwner(eventId, userId);

  return toEventResponse(updatedEvent);
}
