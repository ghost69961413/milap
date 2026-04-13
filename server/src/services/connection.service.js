import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import ConnectionRequest from "../models/ConnectionRequest.js";
import ConsultantProfile from "../models/ConsultantProfile.js";
import DecoratorService from "../models/DecoratorService.js";
import LawyerProfile from "../models/LawyerProfile.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

const DEFAULT_CONNECTION_LIMIT = 50;
const MAX_CONNECTION_LIMIT = 100;

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
  return Math.min(Math.max(limitNumber, 1), MAX_CONNECTION_LIMIT);
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

function toConnectionResponse(request, currentUserId) {
  const requesterUser =
    request.requester && typeof request.requester === "object" && request.requester._id
      ? request.requester
      : null;
  const providerUser =
    request.provider && typeof request.provider === "object" && request.provider._id
      ? request.provider
      : null;
  const requesterUserId = requesterUser
    ? requesterUser._id.toString()
    : request.requester.toString();
  const providerUserId = providerUser
    ? providerUser._id.toString()
    : request.provider.toString();

  return {
    connectionRequestId: request._id.toString(),
    requesterUserId,
    providerUserId,
    requester: toUserSummary(requesterUser),
    provider: toUserSummary(providerUser),
    providerRole: request.providerRole,
    linkedServiceType: request.linkedServiceType,
    linkedServiceId: request.linkedServiceId.toString(),
    status: request.status,
    message: request.message || null,
    responseNote: request.responseNote || null,
    respondedAt: request.respondedAt || null,
    isIncomingForProvider: isSameId(providerUserId, currentUserId),
    isOutgoingForRequester: isSameId(requesterUserId, currentUserId),
    history: (request.history || []).map((historyEvent) => ({
      action: historyEvent.action,
      by: historyEvent.by.toString(),
      at: historyEvent.at,
      note: historyEvent.note || null
    })),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  };
}

async function getUserOrThrow(userId, notFoundMessage = "User account not found") {
  const user = await User.findById(userId).select(
    "_id fullName email role gender consultantRequestStatus"
  );

  if (!user) {
    throw new ApiError(404, notFoundMessage);
  }

  return user;
}

async function resolveProviderLinkedService(providerRole, providerUserId, decoratorServiceId) {
  if (providerRole === USER_ROLES.CONSULTANT) {
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

  if (providerRole === USER_ROLES.LAWYER) {
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

  if (providerRole === USER_ROLES.DECORATOR) {
    if (!decoratorServiceId) {
      throw new ApiError(400, "decoratorServiceId is required for decorator connection");
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

export async function sendConnectionRequest(userId, payload) {
  ensureObjectId(userId, "userId");
  ensureObjectId(payload.providerUserId, "providerUserId");

  if (isSameId(userId, payload.providerUserId)) {
    throw new ApiError(400, "You cannot send a request to yourself");
  }

  await getUserOrThrow(userId, "Requester account not found");
  const providerUser = await getUserOrThrow(payload.providerUserId, "Provider account not found");

  if (providerUser.role !== payload.providerRole) {
    throw new ApiError(
      400,
      `Selected provider is not registered as ${payload.providerRole}`
    );
  }

  if (
    payload.providerRole === USER_ROLES.CONSULTANT &&
    !isConsultantApproved(providerUser)
  ) {
    throw new ApiError(
      403,
      "Selected consultant is pending admin approval and cannot receive requests yet"
    );
  }

  const linkedService = await resolveProviderLinkedService(
    payload.providerRole,
    payload.providerUserId,
    payload.decoratorServiceId
  );

  const existingPendingRequest = await ConnectionRequest.findOne({
    requester: userId,
    provider: payload.providerUserId,
    providerRole: payload.providerRole,
    linkedServiceType: linkedService.linkedServiceType,
    linkedServiceId: linkedService.linkedServiceId,
    status: "pending"
  }).select("_id");

  if (existingPendingRequest) {
    throw new ApiError(409, "You already have a pending request for this provider");
  }

  const createdRequest = await ConnectionRequest.create({
    requester: userId,
    provider: payload.providerUserId,
    providerRole: payload.providerRole,
    linkedServiceType: linkedService.linkedServiceType,
    linkedServiceId: linkedService.linkedServiceId,
    status: "pending",
    message: payload.message,
    history: [
      {
        action: "requested",
        by: userId,
        note: "Connection request sent"
      }
    ]
  });

  const request = await ConnectionRequest.findById(createdRequest._id)
    .populate("requester", "_id fullName email role gender consultantRequestStatus")
    .populate("provider", "_id fullName email role gender consultantRequestStatus");

  return toConnectionResponse(request, userId);
}

export async function listConnectionRequestsForUser(userId, options = {}) {
  ensureObjectId(userId, "userId");

  const direction = options.direction || "all";
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

  const limit = parseLimit(options.limit, DEFAULT_CONNECTION_LIMIT);

  const requests = await ConnectionRequest.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("requester", "_id fullName email role gender consultantRequestStatus")
    .populate("provider", "_id fullName email role gender consultantRequestStatus");

  return {
    totalRequests: requests.length,
    requests: requests.map((request) => toConnectionResponse(request, userId))
  };
}

export async function acceptConnectionRequest(providerUserId, requestId, payload) {
  ensureObjectId(providerUserId, "providerUserId");
  ensureObjectId(requestId, "requestId");

  const request = await ConnectionRequest.findById(requestId)
    .populate("requester", "_id fullName email role gender consultantRequestStatus")
    .populate("provider", "_id fullName email role gender consultantRequestStatus");

  if (!request) {
    throw new ApiError(404, "Connection request not found");
  }

  if (!isSameId(request.provider, providerUserId)) {
    throw new ApiError(403, "You are not authorized to accept this request");
  }

  if (request.status !== "pending") {
    throw new ApiError(
      400,
      `Request is already ${request.status}. Only pending requests can be accepted.`
    );
  }

  request.status = "accepted";
  request.responseNote = payload.responseNote || null;
  request.respondedAt = new Date();
  request.history.push({
    action: "accepted",
    by: providerUserId,
    note: payload.responseNote || "Request accepted"
  });

  await request.save();

  return toConnectionResponse(request, providerUserId);
}

export async function rejectConnectionRequest(providerUserId, requestId, payload) {
  ensureObjectId(providerUserId, "providerUserId");
  ensureObjectId(requestId, "requestId");

  const request = await ConnectionRequest.findById(requestId)
    .populate("requester", "_id fullName email role gender consultantRequestStatus")
    .populate("provider", "_id fullName email role gender consultantRequestStatus");

  if (!request) {
    throw new ApiError(404, "Connection request not found");
  }

  if (!isSameId(request.provider, providerUserId)) {
    throw new ApiError(403, "You are not authorized to reject this request");
  }

  if (request.status !== "pending") {
    throw new ApiError(
      400,
      `Request is already ${request.status}. Only pending requests can be rejected.`
    );
  }

  request.status = "rejected";
  request.responseNote = payload.responseNote || null;
  request.respondedAt = new Date();
  request.history.push({
    action: "rejected",
    by: providerUserId,
    note: payload.responseNote || "Request rejected"
  });

  await request.save();

  return toConnectionResponse(request, providerUserId);
}

export async function cancelConnectionRequest(requesterUserId, requestId, payload) {
  ensureObjectId(requesterUserId, "requesterUserId");
  ensureObjectId(requestId, "requestId");

  const request = await ConnectionRequest.findById(requestId)
    .populate("requester", "_id fullName email role gender consultantRequestStatus")
    .populate("provider", "_id fullName email role gender consultantRequestStatus");

  if (!request) {
    throw new ApiError(404, "Connection request not found");
  }

  if (!isSameId(request.requester, requesterUserId)) {
    throw new ApiError(403, "You are not authorized to cancel this request");
  }

  if (request.status !== "pending") {
    throw new ApiError(
      400,
      `Request is already ${request.status}. Only pending requests can be cancelled.`
    );
  }

  request.status = "cancelled";
  request.responseNote = payload.cancelReason || "Request cancelled";
  request.respondedAt = new Date();
  request.history.push({
    action: "cancelled",
    by: requesterUserId,
    note: payload.cancelReason || "Request cancelled by requester"
  });

  await request.save();

  return toConnectionResponse(request, requesterUserId);
}
