import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:5001";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `${SOCKET_URL.replace(/\/+$/, "")}/api/v1`;

class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function parseResponse(response, { token } = {}) {
  const contentType = response.headers.get("content-type") || "";
  let payload = null;

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    const rawText = await response.text().catch(() => "");
    payload = rawText ? { message: rawText } : null;
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      typeof token === "string" &&
      token.trim()
    ) {
      window.dispatchEvent(
        new CustomEvent("milap:auth-invalid", {
          detail: {
            token,
            statusCode: response.status
          }
        })
      );
    }

    const serverMessage =
      typeof payload?.message === "string" ? payload.message.trim() : "";
    const fallbackMessage =
      serverMessage ||
      response.statusText ||
      `Request failed (${response.status})`;

    throw new ApiError(fallbackMessage, response.status, payload);
  }

  return payload?.data;
}

async function request(path, { method = "GET", token, body, signal } = {}) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    cache: "no-store",
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    signal
  });

  return parseResponse(response, { token });
}

export { ApiError };

export function createChatSocket(token) {
  return io(SOCKET_URL, {
    transports: ["websocket"],
    auth: {
      token
    }
  });
}

export function signup(payload) {
  return request("/auth/signup", {
    method: "POST",
    body: payload
  });
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload
  });
}

export function adminLogin(payload) {
  return request("/admin/auth/login", {
    method: "POST",
    body: payload
  });
}

export function getMe(token) {
  return request("/auth/me", { token });
}

export function getAdminMe(token) {
  return request("/admin/me", { token });
}

export function getAdminUsers(
  token,
  { role, verificationStatus, consultantRequestStatus, limit = 100 } = {}
) {
  const params = new URLSearchParams();

  if (role) {
    params.set("role", role);
  }

  if (verificationStatus) {
    params.set("verificationStatus", verificationStatus);
  }

  if (consultantRequestStatus) {
    params.set("consultantRequestStatus", consultantRequestStatus);
  }

  params.set("limit", String(limit));

  return request(`/admin/users?${params.toString()}`, { token });
}

export function getPendingConsultantApprovals(token, { limit = 50 } = {}) {
  return request(`/admin/consultants/pending?limit=${limit}`, { token });
}

export function applyForConsultantRole(token, payload = {}) {
  return request("/consultants/apply", {
    method: "POST",
    token,
    body: payload
  });
}

export function reviewConsultantApproval(token, userId, payload) {
  return request(`/admin/consultants/${userId}/review`, {
    method: "PATCH",
    token,
    body: payload
  });
}

export function promoteUserToConsultant(token, userId, payload = {}) {
  return request(`/admin/users/${userId}/promote-consultant`, {
    method: "PATCH",
    token,
    body: payload
  });
}

export function promoteConsultantToSecondaryAdmin(token, userId, payload = {}) {
  return request(`/admin/users/${userId}/promote-secondary-admin`, {
    method: "PATCH",
    token,
    body: payload
  });
}

export function deleteUserByAdmin(token, userId) {
  return request(`/admin/users/${userId}`, {
    method: "DELETE",
    token
  });
}

export function getMyProfile(token) {
  return request("/profiles/me", { token });
}

export function getMyVerificationStatus(token) {
  return request("/verifications/me", { token });
}

export function uploadVerificationDocument(
  token,
  file,
  documentType = "police_verification"
) {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("documentType", documentType);

  return request("/verifications/upload", {
    method: "POST",
    token,
    body: formData
  });
}

export function getPendingVerifications(token, { limit = 50 } = {}) {
  return request(`/verifications/pending?limit=${limit}`, { token });
}

export function reviewVerification(token, userId, payload) {
  return request(`/verifications/${userId}/review`, {
    method: "PATCH",
    token,
    body: payload
  });
}

export function createProfile(token, payload) {
  return request("/profiles", {
    method: "POST",
    token,
    body: payload
  });
}

export function updateProfile(token, payload) {
  return request("/profiles", {
    method: "PATCH",
    token,
    body: payload
  });
}

export function uploadPrimaryProfileImage(token, imageFile, removePublicId) {
  const formData = new FormData();
  formData.append("images", imageFile);

  if (removePublicId) {
    formData.append("removeImagePublicIds", removePublicId);
  }

  return request("/profiles", {
    method: "PATCH",
    token,
    body: formData
  });
}

export function getMatches(token, { limit = 20, minScore = 0 } = {}) {
  return request(`/matches?limit=${limit}&minScore=${minScore}`, {
    token
  });
}

export function sendInterest(token, receiverUserId) {
  return request("/interactions", {
    method: "POST",
    token,
    body: { receiverUserId }
  });
}

export function getInteractions(token, { status, limit = 100 } = {}) {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }

  params.set("limit", String(limit));

  return request(`/interactions?${params.toString()}`, { token });
}

export function acceptInterest(token, interactionId) {
  return request(`/interactions/${interactionId}/accept`, {
    method: "PATCH",
    token
  });
}

export function rejectInterest(token, interactionId) {
  return request(`/interactions/${interactionId}/reject`, {
    method: "PATCH",
    token
  });
}

export function getProfileByUser(token, userId) {
  return request(`/profiles/user/${userId}`, { token });
}

export function getMessages(token, otherUserId, { limit = 50 } = {}) {
  return request(`/chats/with/${otherUserId}/messages?limit=${limit}`, { token });
}

export function sendMessageHttp(token, otherUserId, content) {
  return request(`/chats/with/${otherUserId}/messages`, {
    method: "POST",
    token,
    body: { content }
  });
}

export function getMyLawyerProfile(token) {
  return request("/lawyers/profile/me", { token });
}

export function createLawyerProfile(token, payload) {
  return request("/lawyers/profile/me", {
    method: "POST",
    token,
    body: payload
  });
}

export function updateLawyerProfile(token, payload) {
  return request("/lawyers/profile/me", {
    method: "PATCH",
    token,
    body: payload
  });
}

function mapServiceBookingToLawyerRequest(booking = {}) {
  return {
    legalConsultationRequestId: booking.serviceBookingId,
    lawyerUserId: booking.providerUserId,
    requesterUserId: booking.requesterUserId,
    lawyer: booking.provider || null,
    requester: booking.requester || null,
    status: booking.status,
    caseSummary: booking.message || null,
    preferredDate: booking.preferredDate || null,
    responseNote: booking.responseNote || null,
    respondedAt: booking.respondedAt || null,
    isIncomingForLawyer: Boolean(booking.isIncomingForProvider),
    isOutgoingForRequester: Boolean(booking.isOutgoingForRequester),
    history: booking.history || [],
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

function mapServiceBookingToDecoratorBooking(booking = {}) {
  return {
    decoratorBookingId: booking.serviceBookingId,
    serviceId: booking.serviceListingId,
    decoratorUserId: booking.providerUserId,
    requesterUserId: booking.requesterUserId,
    service: booking.serviceListing
      ? {
          serviceId: booking.serviceListing.serviceListingId || booking.serviceListingId,
          title: booking.serviceListing.title || null,
          eventTypes: booking.serviceListing.eventTypes || [],
          location: booking.serviceListing.location || null,
          pricing: booking.serviceListing.pricing || {}
        }
      : null,
    decorator: booking.provider || null,
    requester: booking.requester || null,
    eventDate: booking.eventDate || null,
    eventType: booking.eventType || null,
    location: booking.location || booking.serviceListing?.location || null,
    budget: booking.budget ?? null,
    notes: booking.message || null,
    status: booking.status,
    responseNote: booking.responseNote || null,
    respondedAt: booking.respondedAt || null,
    isIncomingForDecorator: Boolean(booking.isIncomingForProvider),
    isOutgoingForRequester: Boolean(booking.isOutgoingForRequester),
    history: booking.history || [],
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

function normalizeDecoratorStatusFilter(status) {
  if (!status || status === "all") {
    return "";
  }

  return status === "cancelled" ? "rejected" : status;
}

function buildIncomingServiceBookingParams(serviceType, status, limit) {
  const params = new URLSearchParams();
  params.set("direction", "incoming");
  params.set("serviceType", serviceType);
  params.set("limit", String(limit));

  const normalizedStatus = normalizeDecoratorStatusFilter(status);

  if (normalizedStatus) {
    params.set("status", normalizedStatus);
  }

  return params;
}

function mapDecoratorBookingsWithCancelledAlias(bookings, requestedStatus) {
  if (requestedStatus === "cancelled") {
    return [];
  }

  return bookings;
}

function mapLawyerBookingsToRequests(response = {}) {
  return {
    totalRequests: response.totalBookings || 0,
    requests: (response.bookings || []).map((booking) =>
      mapServiceBookingToLawyerRequest(booking)
    )
  };
}

function mapDecoratorBookingsResponse(response = {}, requestedStatus) {
  const mappedBookings = (response.bookings || []).map((booking) =>
    mapServiceBookingToDecoratorBooking(booking)
  );
  const filteredBookings = mapDecoratorBookingsWithCancelledAlias(
    mappedBookings,
    requestedStatus
  );

  return {
    totalBookings: filteredBookings.length,
    bookings: filteredBookings
  };
}

function getIncomingLawyerBookings(token, { status, limit = 100 } = {}) {
  const params = buildIncomingServiceBookingParams("lawyer", status, limit);

  return request(`/bookings/me?${params.toString()}`, { token }).then((response) =>
    mapLawyerBookingsToRequests(response)
  );
}

function getIncomingDecoratorBookings(token, { status, limit = 100 } = {}) {
  const params = buildIncomingServiceBookingParams("decorator", status, limit);

  return request(`/bookings/me?${params.toString()}`, { token }).then((response) =>
    mapDecoratorBookingsResponse(response, status)
  );
}

function updateIncomingServiceBooking(token, bookingId, payload) {
  return request(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    token,
    body: payload
  });
}

export function getMyLawyerBookingRequests(token, { status, limit = 100 } = {}) {
  return getIncomingLawyerBookings(token, { status, limit });
}

export function respondLawyerBookingRequest(token, requestId, payload) {
  return updateIncomingServiceBooking(token, requestId, payload).then((booking) =>
    mapServiceBookingToLawyerRequest(booking)
  );
}

export function getMyDecoratorBookingRequests(token, { status, limit = 100 } = {}) {
  return getIncomingDecoratorBookings(token, { status, limit });
}

export function respondDecoratorBookingRequest(token, bookingId, payload) {
  return updateIncomingServiceBooking(token, bookingId, payload).then((booking) =>
    mapServiceBookingToDecoratorBooking(booking)
  );
}

export function getBookableServices(token, query = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      params.set(key, JSON.stringify(value));
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return request(`/bookings/services${queryString ? `?${queryString}` : ""}`, { token });
}

export function getConsultantServices(token, { expertise, limit = 30 } = {}) {
  return getBookableServices(token, {
    serviceType: "consultant",
    expertise,
    limit
  });
}

export function getLawyerServices(
  token,
  { specialization, minExperienceYears, maxExperienceYears, limit = 30 } = {}
) {
  return getBookableServices(token, {
    serviceType: "lawyer",
    specialization,
    minExperienceYears,
    maxExperienceYears,
    limit
  });
}

export function getDecoratorServices(
  token,
  { eventType, location, minPrice, maxPrice, limit = 30 } = {}
) {
  return getBookableServices(token, {
    serviceType: "decorator",
    eventType,
    location,
    minPrice,
    maxPrice,
    limit
  });
}

export function createServiceBooking(token, payload) {
  return request("/bookings", {
    method: "POST",
    token,
    body: payload
  });
}

export function getMyServiceBookings(
  token,
  { direction = "all", status, serviceType, limit = 100 } = {}
) {
  const params = new URLSearchParams();

  params.set("direction", direction);
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  if (serviceType) {
    params.set("serviceType", serviceType);
  }

  return request(`/bookings/me?${params.toString()}`, { token });
}

export function updateServiceBookingStatus(token, bookingId, payload) {
  return request(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    token,
    body: payload
  });
}
function toJsonString(value) {
  return JSON.stringify(value ?? null);
}

function buildDecoratorServiceFormData(payload = {}, portfolioImages = []) {
  const formData = new FormData();

  if (payload.title !== undefined) {
    formData.append("title", payload.title);
  }

  if (payload.description !== undefined) {
    formData.append("description", payload.description);
  }

  if (payload.eventTypes !== undefined) {
    formData.append("eventTypes", toJsonString(payload.eventTypes));
  }

  if (payload.location !== undefined) {
    formData.append("location", payload.location);
  }

  if (payload.pricing !== undefined) {
    formData.append("pricing", toJsonString(payload.pricing));
  }

  if (payload.pricingPackages !== undefined) {
    formData.append("pricingPackages", toJsonString(payload.pricingPackages));
  }

  if (payload.removeImagePublicIds !== undefined) {
    formData.append("removeImagePublicIds", toJsonString(payload.removeImagePublicIds));
  }

  if (payload.isActive !== undefined) {
    formData.append("isActive", String(Boolean(payload.isActive)));
  }

  portfolioImages.forEach((file) => {
    formData.append("portfolioImages", file);
  });

  return formData;
}

export function getMyDecoratorServices(token, { isActive, limit = 100 } = {}) {
  const params = new URLSearchParams();

  if (isActive !== undefined) {
    params.set("isActive", String(Boolean(isActive)));
  }

  params.set("limit", String(limit));

  return request(`/decorators/dashboard/services/me?${params.toString()}`, { token });
}

export function createDecoratorService(token, payload, portfolioImages = []) {
  return request("/decorators/dashboard/services", {
    method: "POST",
    token,
    body: buildDecoratorServiceFormData(payload, portfolioImages)
  });
}

export function updateDecoratorService(token, serviceId, payload, portfolioImages = []) {
  return request(`/decorators/dashboard/services/${serviceId}`, {
    method: "PATCH",
    token,
    body: buildDecoratorServiceFormData(payload, portfolioImages)
  });
}

export function getMyConsultantProfile(token) {
  return request("/consultants/profile/me", { token });
}

export function createConsultantProfile(token, payload) {
  return request("/consultants/profile/me", {
    method: "POST",
    token,
    body: payload
  });
}

export function updateConsultantProfile(token, payload) {
  return request("/consultants/profile/me", {
    method: "PATCH",
    token,
    body: payload
  });
}

export function requestConsultantConnection(token, payload) {
  return request("/consultants/connections", {
    method: "POST",
    token,
    body: payload
  });
}

export function getMyConsultantConnections(
  token,
  { direction = "all", status, limit = 100 } = {}
) {
  const params = new URLSearchParams();
  params.set("direction", direction);
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  return request(`/consultants/connections/me?${params.toString()}`, { token });
}

export function respondConsultantConnection(token, connectionId, payload) {
  return request(`/consultants/connections/${connectionId}/respond`, {
    method: "PATCH",
    token,
    body: payload
  });
}
