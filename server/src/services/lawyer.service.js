import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import LegalConsultationRequest from "../models/LegalConsultationRequest.js";
import LawyerProfile from "../models/LawyerProfile.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

const DEFAULT_LAWYER_LIMIT = 30;
const DEFAULT_REQUEST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const DAY_ORDER = Object.freeze({
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
});

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

function normalizeAvailabilitySlots(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seenSlotKeys = new Set();

  const sanitizedSlots = values
    .map((slot) => {
      const day = String(slot?.day || "").trim().toLowerCase();
      const startTime = String(slot?.startTime || "").trim();
      const endTime = String(slot?.endTime || "").trim();
      const isAvailable = slot?.isAvailable !== false;

      return {
        day,
        startTime,
        endTime,
        isAvailable
      };
    })
    .filter(
      (slot) =>
        Boolean(DAY_ORDER[slot.day]) &&
        Boolean(slot.startTime) &&
        Boolean(slot.endTime) &&
        slot.startTime < slot.endTime
    )
    .filter((slot) => {
      const slotKey = `${slot.day}-${slot.startTime}-${slot.endTime}`;

      if (seenSlotKeys.has(slotKey)) {
        return false;
      }

      seenSlotKeys.add(slotKey);
      return true;
    })
    .sort((slotA, slotB) => {
      if (slotA.day !== slotB.day) {
        return DAY_ORDER[slotA.day] - DAY_ORDER[slotB.day];
      }

      if (slotA.startTime !== slotB.startTime) {
        return slotA.startTime.localeCompare(slotB.startTime);
      }

      return slotA.endTime.localeCompare(slotB.endTime);
    });

  return sanitizedSlots;
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

function toLawyerProfileResponse(profile) {
  const lawyerUserId = getValueId(profile.user);

  return {
    lawyerProfileId: profile._id.toString(),
    lawyerUserId,
    lawyer: toUserSummary(profile.user),
    specialization: profile.specialization || [],
    experienceYears: profile.experienceYears,
    barCouncilId: profile.barCouncilId || null,
    firmName: profile.firmName || null,
    location: profile.location || null,
    languages: profile.languages || [],
    consultationMode: profile.consultationMode,
    availability: profile.availability || {},
    availabilitySlots: normalizeAvailabilitySlots(profile.availabilitySlots || []),
    pricing: profile.pricing || {},
    about: profile.about || "",
    isActive: Boolean(profile.isActive),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

function toLegalConsultationRequestResponse(request, currentUserId) {
  const lawyerUserId = getValueId(request.lawyer);
  const requesterUserId = getValueId(request.requester);

  return {
    legalConsultationRequestId: request._id.toString(),
    lawyerUserId,
    requesterUserId,
    lawyer: toUserSummary(request.lawyer),
    requester: toUserSummary(request.requester),
    status: request.status,
    caseSummary: request.caseSummary || null,
    preferredDate: request.preferredDate || null,
    responseNote: request.responseNote || null,
    respondedAt: request.respondedAt || null,
    isIncomingForLawyer: isSameId(lawyerUserId, currentUserId),
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
  const user = await User.findById(userId).select("_id fullName email role gender");

  if (!user) {
    throw new ApiError(404, notFoundMessage);
  }

  return user;
}

async function assertLawyerUser(userId) {
  const user = await getUserOrThrow(userId, "Lawyer account not found");

  if (user.role !== USER_ROLES.LAWYER) {
    throw new ApiError(403, "Only lawyer role can access this resource");
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

export async function createLawyerProfileForUser(userId, payload) {
  ensureObjectId(userId, "userId");
  await assertLawyerUser(userId);

  const existingProfile = await LawyerProfile.findOne({ user: userId }).select("_id");

  if (existingProfile) {
    throw new ApiError(409, "Lawyer profile already exists");
  }

  const createdProfile = await LawyerProfile.create({
    user: userId,
    ...payload,
    specialization: normalizeStringArray(payload.specialization),
    languages: normalizeStringArray(payload.languages || []),
    availabilitySlots: normalizeAvailabilitySlots(payload.availabilitySlots)
  });

  const profile = await LawyerProfile.findById(createdProfile._id).populate(
    "user",
    "_id fullName email role gender"
  );

  return toLawyerProfileResponse(profile);
}

export async function updateLawyerProfileForUser(userId, payload) {
  ensureObjectId(userId, "userId");
  await assertLawyerUser(userId);

  const profile = await LawyerProfile.findOne({ user: userId }).populate(
    "user",
    "_id fullName email role gender"
  );

  if (!profile) {
    throw new ApiError(404, "Lawyer profile not found");
  }

  if (payload.specialization !== undefined) {
    profile.specialization = normalizeStringArray(payload.specialization);
  }

  if (payload.experienceYears !== undefined) {
    profile.experienceYears = payload.experienceYears;
  }

  if (payload.barCouncilId !== undefined) {
    profile.barCouncilId = payload.barCouncilId;
  }

  if (payload.firmName !== undefined) {
    profile.firmName = payload.firmName;
  }

  if (payload.location !== undefined) {
    profile.location = payload.location;
  }

  if (payload.languages !== undefined) {
    profile.languages = normalizeStringArray(payload.languages);
  }

  if (payload.consultationMode !== undefined) {
    profile.consultationMode = payload.consultationMode;
  }

  if (payload.availability) {
    profile.availability = mergeNestedObject(profile.availability, payload.availability);
  }

  if (payload.availabilitySlots !== undefined) {
    profile.availabilitySlots = normalizeAvailabilitySlots(payload.availabilitySlots);
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

  return toLawyerProfileResponse(profile);
}

export async function getLawyerProfileForUser(userId) {
  ensureObjectId(userId, "userId");
  await assertLawyerUser(userId);

  const profile = await LawyerProfile.findOne({ user: userId }).populate(
    "user",
    "_id fullName email role gender"
  );

  if (!profile) {
    throw new ApiError(404, "Lawyer profile not found");
  }

  return toLawyerProfileResponse(profile);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listLawyers(options = {}) {
  const limit = parseLimit(options.limit, DEFAULT_LAWYER_LIMIT);
  const query = {
    isActive: true
  };

  if (Array.isArray(options.specialization) && options.specialization.length) {
    query.specialization = {
      $in: options.specialization.map(
        (specializationItem) => new RegExp(`^${escapeRegex(specializationItem)}$`, "i")
      )
    };
  }

  if (
    options.minExperienceYears !== undefined ||
    options.maxExperienceYears !== undefined
  ) {
    query.experienceYears = {};

    if (options.minExperienceYears !== undefined) {
      query.experienceYears.$gte = options.minExperienceYears;
    }

    if (options.maxExperienceYears !== undefined) {
      query.experienceYears.$lte = options.maxExperienceYears;
    }
  }

  const lawyerProfiles = await LawyerProfile.find(query)
    .populate("user", "_id fullName email role gender")
    .sort({ updatedAt: -1 })
    .limit(limit);

  const lawyers = lawyerProfiles
    .filter((profile) => profile.user?.role === USER_ROLES.LAWYER)
    .map((profile) => toLawyerProfileResponse(profile));

  return {
    totalLawyers: lawyers.length,
    lawyers
  };
}

export async function requestLegalConsultationForUser(requesterUserId, payload) {
  ensureObjectId(requesterUserId, "requesterUserId");
  ensureObjectId(payload.lawyerUserId, "lawyerUserId");

  if (isSameId(requesterUserId, payload.lawyerUserId)) {
    throw new ApiError(400, "You cannot request legal consultation from yourself");
  }

  await getUserOrThrow(requesterUserId, "Requester account not found");
  await assertLawyerUser(payload.lawyerUserId);

  const lawyerProfile = await LawyerProfile.findOne({
    user: payload.lawyerUserId,
    isActive: true
  }).select("_id");

  if (!lawyerProfile) {
    throw new ApiError(404, "Lawyer profile is not available");
  }

  const existingPendingRequest = await LegalConsultationRequest.findOne({
    lawyer: payload.lawyerUserId,
    requester: requesterUserId,
    status: "pending"
  }).select("_id");

  if (existingPendingRequest) {
    throw new ApiError(409, "You already have a pending legal consultation request");
  }

  const createdRequest = await LegalConsultationRequest.create({
    lawyer: payload.lawyerUserId,
    requester: requesterUserId,
    status: "pending",
    caseSummary: payload.caseSummary,
    preferredDate: payload.preferredDate,
    history: [
      {
        action: "requested",
        by: requesterUserId,
        note: "Legal consultation request created"
      }
    ]
  });

  const request = await LegalConsultationRequest.findById(createdRequest._id)
    .populate("lawyer", "_id fullName email role gender")
    .populate("requester", "_id fullName email role gender");

  return toLegalConsultationRequestResponse(request, requesterUserId);
}

export async function listLegalConsultationRequestsForUser(userId, role, options = {}) {
  ensureObjectId(userId, "userId");

  const query = {};
  const limit = parseLimit(options.limit, DEFAULT_REQUEST_LIMIT);

  if (role === USER_ROLES.LAWYER) {
    query.lawyer = userId;
  } else {
    query.requester = userId;
  }

  if (options.status) {
    query.status = options.status;
  }

  const requests = await LegalConsultationRequest.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("lawyer", "_id fullName email role gender")
    .populate("requester", "_id fullName email role gender");

  return {
    totalRequests: requests.length,
    requests: requests.map((request) =>
      toLegalConsultationRequestResponse(request, userId)
    )
  };
}

export async function respondLegalConsultationRequestForLawyer(
  lawyerUserId,
  requestId,
  payload
) {
  ensureObjectId(lawyerUserId, "lawyerUserId");
  ensureObjectId(requestId, "requestId");
  await assertLawyerUser(lawyerUserId);

  const request = await LegalConsultationRequest.findById(requestId)
    .populate("lawyer", "_id fullName email role gender")
    .populate("requester", "_id fullName email role gender");

  if (!request) {
    throw new ApiError(404, "Legal consultation request not found");
  }

  if (!isSameId(request.lawyer, lawyerUserId)) {
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
    by: lawyerUserId,
    note: payload.responseNote || `Legal consultation request ${payload.status}`
  });

  await request.save();

  return toLegalConsultationRequestResponse(request, lawyerUserId);
}
