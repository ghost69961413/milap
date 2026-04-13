import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import ConsultantProfile from "../models/ConsultantProfile.js";
import ConsultationRequest from "../models/ConsultationRequest.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

const DEFAULT_CONSULTANT_LIMIT = 30;
const DEFAULT_REQUEST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

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

function normalizeExpertise(values) {
  const sanitizedValues = Array.isArray(values)
    ? values.map((value) => value.trim()).filter(Boolean)
    : [];

  return Array.from(new Set(sanitizedValues));
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

function isConsultantApproved(user) {
  if (!user || user.role !== USER_ROLES.CONSULTANT) {
    return false;
  }

  const consultantRequestStatus = user.consultantRequestStatus || "approved";
  return consultantRequestStatus !== "pending" && consultantRequestStatus !== "rejected";
}

function toConsultantProfileResponse(profile) {
  const consultantUserId = getValueId(profile.user);

  return {
    consultantProfileId: profile._id.toString(),
    consultantUserId,
    consultant: toUserSummary(profile.user),
    expertise: profile.expertise || [],
    availability: profile.availability || {},
    pricing: profile.pricing || {},
    about: profile.about || "",
    isActive: Boolean(profile.isActive),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

function toConsultationRequestResponse(request, currentUserId) {
  const consultantUserId = getValueId(request.consultant);
  const requesterUserId = getValueId(request.requester);

  return {
    consultationRequestId: request._id.toString(),
    consultantUserId,
    requesterUserId,
    consultant: toUserSummary(request.consultant),
    requester: toUserSummary(request.requester),
    status: request.status,
    message: request.message || null,
    preferredDate: request.preferredDate || null,
    responseNote: request.responseNote || null,
    respondedAt: request.respondedAt || null,
    isIncomingForConsultant: isSameId(consultantUserId, currentUserId),
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
    "_id fullName email role gender consultantRequestStatus consultantRequestAppliedAt consultantRequestReviewedAt consultantRequestRejectionReason"
  );

  if (!user) {
    throw new ApiError(404, notFoundMessage);
  }

  return user;
}

async function assertConsultantUser(userId) {
  const user = await getUserOrThrow(userId, "Consultant account not found");

  if (user.role !== USER_ROLES.CONSULTANT) {
    throw new ApiError(403, "Only consultant role can access this resource");
  }

  if (!isConsultantApproved(user)) {
    throw new ApiError(
      403,
      "Consultant role request is not approved yet. Please wait for admin approval."
    );
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

export async function applyForConsultantRoleForUser(userId, _payload = {}) {
  ensureObjectId(userId, "userId");

  const user = await User.findById(userId).select(
    "_id fullName email role consultantRequestStatus consultantRequestAppliedAt consultantRequestReviewedAt consultantRequestRejectionReason"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.role === USER_ROLES.CONSULTANT) {
    throw new ApiError(409, "You are already approved as consultant");
  }

  if (user.role !== USER_ROLES.NORMAL_USER) {
    throw new ApiError(403, "Only normal users can apply for consultant role");
  }

  if (user.consultantRequestStatus === "pending") {
    throw new ApiError(409, "Consultant request is already pending review");
  }

  user.consultantRequestStatus = "pending";
  user.consultantRequestAppliedAt = new Date();
  user.consultantRequestReviewedAt = null;
  user.consultantRequestRejectionReason = null;

  await user.save();

  return {
    userId: user._id.toString(),
    role: user.role,
    consultantRequestStatus: user.consultantRequestStatus,
    consultantRequestAppliedAt: user.consultantRequestAppliedAt,
    message: "Consultant application submitted successfully"
  };
}

export async function createConsultantProfileForUser(userId, payload) {
  ensureObjectId(userId, "userId");
  await assertConsultantUser(userId);

  const existingProfile = await ConsultantProfile.findOne({ user: userId }).select("_id");

  if (existingProfile) {
    throw new ApiError(409, "Consultant profile already exists");
  }

  const createdProfile = await ConsultantProfile.create({
    user: userId,
    ...payload,
    expertise: normalizeExpertise(payload.expertise)
  });

  const profile = await ConsultantProfile.findById(createdProfile._id).populate(
    "user",
    "_id fullName email role gender consultantRequestStatus"
  );

  return toConsultantProfileResponse(profile);
}

export async function updateConsultantProfileForUser(userId, payload) {
  ensureObjectId(userId, "userId");
  await assertConsultantUser(userId);

  const profile = await ConsultantProfile.findOne({ user: userId }).populate(
    "user",
    "_id fullName email role gender consultantRequestStatus"
  );

  if (!profile) {
    throw new ApiError(404, "Consultant profile not found");
  }

  if (payload.expertise !== undefined) {
    profile.expertise = normalizeExpertise(payload.expertise);
  }

  if (payload.availability) {
    profile.availability = mergeNestedObject(profile.availability, payload.availability);
  }

  if (payload.pricing) {
    profile.pricing = mergeNestedObject(profile.pricing, payload.pricing);
  }

  if (payload.about !== undefined) {
    profile.about = payload.about;
  }

  if (payload.isActive !== undefined) {
    profile.isActive = payload.isActive;
  }

  await profile.save();

  return toConsultantProfileResponse(profile);
}

export async function getConsultantProfileForUser(userId) {
  ensureObjectId(userId, "userId");
  await assertConsultantUser(userId);

  const profile = await ConsultantProfile.findOne({ user: userId }).populate(
    "user",
    "_id fullName email role gender consultantRequestStatus"
  );

  if (!profile) {
    throw new ApiError(404, "Consultant profile not found");
  }

  return toConsultantProfileResponse(profile);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listConsultants(options = {}) {
  const limit = parseLimit(options.limit, DEFAULT_CONSULTANT_LIMIT);
  const query = {
    isActive: true
  };

  if (Array.isArray(options.expertise) && options.expertise.length) {
    query.expertise = {
      $in: options.expertise.map(
        (expertiseItem) => new RegExp(`^${escapeRegex(expertiseItem)}$`, "i")
      )
    };
  }

  const consultantProfiles = await ConsultantProfile.find(query)
    .populate("user", "_id fullName email role gender consultantRequestStatus")
    .sort({ updatedAt: -1 })
    .limit(limit);

  const consultants = consultantProfiles
    .filter((profile) => isConsultantApproved(profile.user))
    .map((profile) => toConsultantProfileResponse(profile));

  return {
    totalConsultants: consultants.length,
    consultants
  };
}

export async function requestConsultationForUser(requesterUserId, payload) {
  ensureObjectId(requesterUserId, "requesterUserId");
  ensureObjectId(payload.consultantUserId, "consultantUserId");

  if (isSameId(requesterUserId, payload.consultantUserId)) {
    throw new ApiError(400, "You cannot request consultation from yourself");
  }

  await getUserOrThrow(requesterUserId, "Requester account not found");
  await assertConsultantUser(payload.consultantUserId);

  const consultantProfile = await ConsultantProfile.findOne({
    user: payload.consultantUserId,
    isActive: true
  }).select("_id");

  if (!consultantProfile) {
    throw new ApiError(404, "Consultant profile is not available");
  }

  const existingPendingRequest = await ConsultationRequest.findOne({
    consultant: payload.consultantUserId,
    requester: requesterUserId,
    status: "pending"
  }).select("_id");

  if (existingPendingRequest) {
    throw new ApiError(409, "You already have a pending consultation request");
  }

  const createdRequest = await ConsultationRequest.create({
    consultant: payload.consultantUserId,
    requester: requesterUserId,
    status: "pending",
    message: payload.message,
    preferredDate: payload.preferredDate,
    history: [
      {
        action: "requested",
        by: requesterUserId,
        note: "Consultation request created"
      }
    ]
  });

  const request = await ConsultationRequest.findById(createdRequest._id)
    .populate("consultant", "_id fullName email role gender consultantRequestStatus")
    .populate("requester", "_id fullName email role gender consultantRequestStatus");

  return toConsultationRequestResponse(request, requesterUserId);
}

export async function listConsultationRequestsForUser(userId, role, options = {}) {
  ensureObjectId(userId, "userId");

  const query = {};
  const limit = parseLimit(options.limit, DEFAULT_REQUEST_LIMIT);

  if (role === USER_ROLES.CONSULTANT) {
    query.consultant = userId;
  } else {
    query.requester = userId;
  }

  if (options.status) {
    query.status = options.status;
  }

  const requests = await ConsultationRequest.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("consultant", "_id fullName email role gender consultantRequestStatus")
    .populate("requester", "_id fullName email role gender consultantRequestStatus");

  return {
    totalRequests: requests.length,
    requests: requests.map((request) => toConsultationRequestResponse(request, userId))
  };
}

export async function respondConsultationRequestForConsultant(
  consultantUserId,
  requestId,
  payload
) {
  ensureObjectId(consultantUserId, "consultantUserId");
  ensureObjectId(requestId, "requestId");
  await assertConsultantUser(consultantUserId);

  const request = await ConsultationRequest.findById(requestId)
    .populate("consultant", "_id fullName email role gender consultantRequestStatus")
    .populate("requester", "_id fullName email role gender consultantRequestStatus");

  if (!request) {
    throw new ApiError(404, "Consultation request not found");
  }

  if (!isSameId(request.consultant, consultantUserId)) {
    throw new ApiError(403, "You are not authorized to respond to this request");
  }

  if (request.status !== "pending") {
    throw new ApiError(
      400,
      `Request is already ${request.status}. Only pending requests can be updated.`
    );
  }

  request.status = payload.status;
  request.responseNote = payload.responseNote || null;
  request.respondedAt = new Date();
  request.history.push({
    action: payload.status,
    by: consultantUserId,
    note: payload.responseNote || `Consultation request ${payload.status}`
  });

  await request.save();

  return toConsultationRequestResponse(request, consultantUserId);
}
