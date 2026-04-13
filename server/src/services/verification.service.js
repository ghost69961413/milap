import mongoose from "mongoose";
import { USER_ROLES } from "../constants/roles.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import {
  deletePoliceVerificationDocumentFromCloudinary,
  uploadPoliceVerificationDocumentToCloudinary
} from "./media.service.js";

const DEFAULT_PENDING_LIMIT = 50;
const MAX_PENDING_LIMIT = 100;
const FINAL_VERIFICATION_STATUSES = new Set(["approved", "rejected"]);
const CONSULTANT_BYPASS_BLOCKED_STATUSES = new Set(["pending", "rejected"]);
const BYTES_PER_MEGABYTE = 1024 * 1024;
const MAX_TOTAL_VERIFICATION_UPLOAD_BYTES = 100 * BYTES_PER_MEGABYTE;

const VERIFICATION_DOCUMENT_TYPES = Object.freeze({
  POLICE_VERIFICATION: "police_verification",
  GOVERNMENT_ID: "government_id",
  ADDITIONAL_OPTIONAL_DOCUMENT: "additional_optional_document",
  LAW_DEGREE: "law_degree",
  DECORATOR_OWNER_GOVERNMENT_ID: "decorator_owner_government_id",
  DECORATOR_POLICE_NOC: "decorator_police_noc"
});

const DOCUMENT_FIELD_BY_TYPE = Object.freeze({
  [VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION]: "policeVerification",
  [VERIFICATION_DOCUMENT_TYPES.GOVERNMENT_ID]: "governmentId",
  [VERIFICATION_DOCUMENT_TYPES.ADDITIONAL_OPTIONAL_DOCUMENT]: "additionalOptionalDocument",
  [VERIFICATION_DOCUMENT_TYPES.LAW_DEGREE]: "lawDegree",
  [VERIFICATION_DOCUMENT_TYPES.DECORATOR_OWNER_GOVERNMENT_ID]:
    "decoratorOwnerGovernmentId",
  [VERIFICATION_DOCUMENT_TYPES.DECORATOR_POLICE_NOC]: "decoratorPoliceNoc"
});
const KNOWN_VERIFICATION_DOCUMENT_FIELDS = Object.freeze(
  Object.values(DOCUMENT_FIELD_BY_TYPE)
);

const DOCUMENT_LABEL_BY_TYPE = Object.freeze({
  [VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION]: "Police Verification",
  [VERIFICATION_DOCUMENT_TYPES.GOVERNMENT_ID]: "Government ID Proof",
  [VERIFICATION_DOCUMENT_TYPES.ADDITIONAL_OPTIONAL_DOCUMENT]:
    "Additional Optional Document",
  [VERIFICATION_DOCUMENT_TYPES.LAW_DEGREE]: "Law Degree Certificate",
  [VERIFICATION_DOCUMENT_TYPES.DECORATOR_OWNER_GOVERNMENT_ID]:
    "Decorator Owner Government ID",
  [VERIFICATION_DOCUMENT_TYPES.DECORATOR_POLICE_NOC]:
    "Police NOC (No Pending Cases)"
});

const ROLE_DOCUMENT_RULES = Object.freeze({
  [USER_ROLES.NORMAL_USER]: Object.freeze({
    required: Object.freeze([
      VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION,
      VERIFICATION_DOCUMENT_TYPES.GOVERNMENT_ID
    ]),
    optional: Object.freeze([
      VERIFICATION_DOCUMENT_TYPES.ADDITIONAL_OPTIONAL_DOCUMENT
    ])
  }),
  [USER_ROLES.LAWYER]: Object.freeze({
    required: Object.freeze([
      VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION,
      VERIFICATION_DOCUMENT_TYPES.LAW_DEGREE,
      VERIFICATION_DOCUMENT_TYPES.GOVERNMENT_ID
    ]),
    optional: Object.freeze([])
  }),
  [USER_ROLES.DECORATOR]: Object.freeze({
    required: Object.freeze([
      VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION,
      VERIFICATION_DOCUMENT_TYPES.DECORATOR_OWNER_GOVERNMENT_ID,
      VERIFICATION_DOCUMENT_TYPES.DECORATOR_POLICE_NOC
    ]),
    optional: Object.freeze([])
  }),
  [USER_ROLES.CONSULTANT]: Object.freeze({
    required: Object.freeze([]),
    optional: Object.freeze([])
  }),
  [USER_ROLES.ADMIN]: Object.freeze({
    required: Object.freeze([]),
    optional: Object.freeze([])
  })
});

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} is invalid`);
  }
}

function normalizeDocumentType(value) {
  if (typeof value !== "string") {
    return VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, "_");
  const aliasMap = new Map([
    ["police", VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION],
    ["police_doc", VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION],
    ["govt_id", VERIFICATION_DOCUMENT_TYPES.GOVERNMENT_ID],
    ["id_proof", VERIFICATION_DOCUMENT_TYPES.GOVERNMENT_ID],
    ["optional_document", VERIFICATION_DOCUMENT_TYPES.ADDITIONAL_OPTIONAL_DOCUMENT],
    ["third_document", VERIFICATION_DOCUMENT_TYPES.ADDITIONAL_OPTIONAL_DOCUMENT],
    ["lawdegree", VERIFICATION_DOCUMENT_TYPES.LAW_DEGREE],
    [
      "owner_govt_id",
      VERIFICATION_DOCUMENT_TYPES.DECORATOR_OWNER_GOVERNMENT_ID
    ],
    ["noc", VERIFICATION_DOCUMENT_TYPES.DECORATOR_POLICE_NOC],
    ["police_noc", VERIFICATION_DOCUMENT_TYPES.DECORATOR_POLICE_NOC]
  ]);

  return aliasMap.get(normalizedValue) || normalizedValue;
}

function getRoleDocumentRules(role) {
  return (
    ROLE_DOCUMENT_RULES[role] || {
      required: [VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION],
      optional: []
    }
  );
}

function formatSizeInMegabytes(bytes) {
  const normalizedBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  return `${(normalizedBytes / BYTES_PER_MEGABYTE).toFixed(2)}MB`;
}

function resolveDocumentSizeBytes(documentEntry) {
  if (!documentEntry || typeof documentEntry !== "object") {
    return 0;
  }

  const explicitSize = Number(documentEntry.sizeBytes);
  if (Number.isFinite(explicitSize) && explicitSize > 0) {
    return explicitSize;
  }

  const documentUrl =
    typeof documentEntry.url === "string" ? documentEntry.url.trim() : "";
  const base64Marker = ";base64,";

  if (!documentUrl.startsWith("data:") || !documentUrl.includes(base64Marker)) {
    return 0;
  }

  const base64Payload = documentUrl.slice(
    documentUrl.indexOf(base64Marker) + base64Marker.length
  );

  if (!base64Payload) {
    return 0;
  }

  let padding = 0;
  if (base64Payload.endsWith("==")) {
    padding = 2;
  } else if (base64Payload.endsWith("=")) {
    padding = 1;
  }

  return Math.max(0, Math.floor((base64Payload.length * 3) / 4) - padding);
}

function getTotalVerificationDocumentsSizeBytes(documentsRecord) {
  return KNOWN_VERIFICATION_DOCUMENT_FIELDS.reduce((total, fieldName) => {
    const documentEntry = documentsRecord?.[fieldName];
    return total + resolveDocumentSizeBytes(documentEntry);
  }, 0);
}

function getVerificationDocumentsRecord(user) {
  const documentsRecord =
    user?.verificationDocuments &&
    typeof user.verificationDocuments.toObject === "function"
      ? user.verificationDocuments.toObject()
      : { ...(user?.verificationDocuments || {}) };

  if (!documentsRecord.policeVerification?.url && user?.policeVerification?.documentUrl) {
    documentsRecord.policeVerification = {
      url: user.policeVerification.documentUrl,
      publicId: user.policeVerification.documentPublicId || null,
      mimeType: user.policeVerification.documentMimeType || null,
      sizeBytes: 0,
      submittedAt: user.policeVerification.submittedAt || null
    };
  }

  return documentsRecord;
}

function getDocumentSnapshotForType(user, documentType) {
  const fieldName = DOCUMENT_FIELD_BY_TYPE[documentType];

  if (!fieldName) {
    return null;
  }

  const documentsRecord = getVerificationDocumentsRecord(user);
  const documentEntry = documentsRecord[fieldName] || null;
  const uploaded = Boolean(documentEntry?.url);

  return {
    type: documentType,
    label: DOCUMENT_LABEL_BY_TYPE[documentType] || documentType,
    uploaded,
    document: uploaded
      ? {
          url: documentEntry.url,
          mimeType: documentEntry.mimeType || null
        }
      : null,
    submittedAt: documentEntry?.submittedAt || null,
    publicId: documentEntry?.publicId || null
  };
}

function buildVerificationDocumentSummary(user, options = {}) {
  const includeDocument = Boolean(options.includeDocument);
  const roleRules = getRoleDocumentRules(user.role);
  const requiredTypes = roleRules.required || [];
  const optionalTypes = roleRules.optional || [];

  const mapDocumentTypeToResponse = (documentType, required) => {
    const snapshot = getDocumentSnapshotForType(user, documentType) || {
      type: documentType,
      label: DOCUMENT_LABEL_BY_TYPE[documentType] || documentType,
      uploaded: false,
      document: null,
      submittedAt: null,
      publicId: null
    };

    return {
      type: snapshot.type,
      label: snapshot.label,
      required,
      uploaded: snapshot.uploaded,
      document: includeDocument ? snapshot.document : null,
      submittedAt: snapshot.submittedAt
    };
  };

  const requiredDocuments = requiredTypes.map((documentType) =>
    mapDocumentTypeToResponse(documentType, true)
  );
  const optionalDocuments = optionalTypes.map((documentType) =>
    mapDocumentTypeToResponse(documentType, false)
  );

  const missingRequiredDocuments = requiredDocuments.filter(
    (documentItem) => !documentItem.uploaded
  );

  return {
    requiredDocuments,
    optionalDocuments,
    documents: [...requiredDocuments, ...optionalDocuments],
    missingRequiredTypes: missingRequiredDocuments.map((documentItem) => documentItem.type),
    missingRequiredLabels: missingRequiredDocuments.map((documentItem) => documentItem.label),
    readyForReview: missingRequiredDocuments.length === 0
  };
}

function resolveVerificationStatus(user) {
  const topLevelStatus = user?.verificationStatus;
  const nestedStatus = user?.policeVerification?.status;

  if (!topLevelStatus) {
    return nestedStatus || "pending";
  }

  // Backward compatibility for old records where top-level status stayed pending
  // while nested policeVerification.status moved to approved/rejected.
  if (topLevelStatus === "pending" && FINAL_VERIFICATION_STATUSES.has(nestedStatus)) {
    return nestedStatus;
  }

  return topLevelStatus;
}

function resolveVerifiedBy(user) {
  const status = resolveVerificationStatus(user);

  if (FINAL_VERIFICATION_STATUSES.has(user?.verificationStatus)) {
    return user?.verifiedBy || null;
  }

  if (status === "approved" || status === "rejected") {
    return user?.policeVerification?.reviewedBy || user?.verifiedBy || null;
  }

  return null;
}

function isAdminApprovedConsultant(user) {
  if (!user || user.role !== USER_ROLES.CONSULTANT) {
    return false;
  }

  const consultantRequestStatus = user.consultantRequestStatus || "approved";
  return !CONSULTANT_BYPASS_BLOCKED_STATUSES.has(consultantRequestStatus);
}

function toVerificationStatusResponse(user, options = {}) {
  const includeDocument = Boolean(options.includeDocument);
  const policeVerification = user.policeVerification || {};
  const documentSummary = buildVerificationDocumentSummary(user, { includeDocument });
  const policeDocument = documentSummary.documents.find(
    (documentItem) =>
      documentItem.type === VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION
  );
  const status = isAdminApprovedConsultant(user)
    ? "approved"
    : resolveVerificationStatus(user);
  const verifiedByValue = resolveVerifiedBy(user);

  return {
    userId: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status,
    verificationStatus: status,
    documentUploaded: Boolean(policeDocument?.uploaded),
    document: includeDocument ? policeDocument?.document || null : null,
    submittedAt:
      policeDocument?.submittedAt || policeVerification.submittedAt || null,
    reviewedAt: policeVerification.reviewedAt || null,
    reviewedBy: verifiedByValue ? verifiedByValue.toString() : null,
    verifiedBy: verifiedByValue ? verifiedByValue.toString() : null,
    rejectionReason: policeVerification.rejectionReason || null,
    requiredDocuments: documentSummary.requiredDocuments,
    optionalDocuments: documentSummary.optionalDocuments,
    documents: documentSummary.documents,
    missingRequiredDocumentTypes: documentSummary.missingRequiredTypes,
    missingRequiredDocuments: documentSummary.missingRequiredLabels,
    readyForReview: documentSummary.readyForReview
  };
}

function buildPoliceVerificationStatusMessage(
  status,
  rejectionReason,
  missingRequiredDocuments = []
) {
  if (status === "approved") {
    return "Verification approved";
  }

  if (status === "rejected") {
    if (rejectionReason) {
      return `Verification rejected: ${rejectionReason}`;
    }

    return "Verification rejected";
  }

  if (Array.isArray(missingRequiredDocuments) && missingRequiredDocuments.length > 0) {
    return `Upload required documents: ${missingRequiredDocuments.join(", ")}`;
  }

  return "Verification pending consultant review";
}

export async function uploadUserPoliceVerificationDocument(
  userId,
  file,
  documentType = VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION
) {
  ensureObjectId(userId, "userId");

  if (!file) {
    throw new ApiError(400, "Verification document is required");
  }

  const user = await User.findById(userId).select(
    "_id fullName email role consultantRequestStatus policeVerification verificationDocuments verificationStatus verifiedBy isVerified"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.CONSULTANT) {
    throw new ApiError(403, "Verification document upload is not required for this role");
  }

  const normalizedDocumentType = normalizeDocumentType(documentType);
  const roleRules = getRoleDocumentRules(user.role);
  const allowedDocumentTypes = [...(roleRules.required || []), ...(roleRules.optional || [])];

  if (!allowedDocumentTypes.includes(normalizedDocumentType)) {
    throw new ApiError(
      400,
      `Document type ${normalizedDocumentType} is not allowed for role ${user.role}`
    );
  }

  const existingDocumentSnapshot = getDocumentSnapshotForType(
    user,
    normalizedDocumentType
  );
  const documentsRecord = getVerificationDocumentsRecord(user);
  const documentFieldName = DOCUMENT_FIELD_BY_TYPE[normalizedDocumentType];
  const existingDocumentEntry = documentsRecord[documentFieldName] || null;
  const existingDocumentSizeBytes = resolveDocumentSizeBytes(existingDocumentEntry);
  const existingTotalSizeBytes = getTotalVerificationDocumentsSizeBytes(documentsRecord);
  const incomingFileSizeBytes = Number(file.size);
  const normalizedIncomingFileSizeBytes =
    Number.isFinite(incomingFileSizeBytes) && incomingFileSizeBytes > 0
      ? incomingFileSizeBytes
      : 0;
  const nextTotalSizeBytes =
    existingTotalSizeBytes - existingDocumentSizeBytes + normalizedIncomingFileSizeBytes;

  if (nextTotalSizeBytes > MAX_TOTAL_VERIFICATION_UPLOAD_BYTES) {
    throw new ApiError(
      400,
      `Total verification document size cannot exceed 100MB. Current total: ${formatSizeInMegabytes(
        existingTotalSizeBytes
      )}. Upload selected: ${formatSizeInMegabytes(
        normalizedIncomingFileSizeBytes
      )}.`
    );
  }

  const previousDocumentPublicId = existingDocumentSnapshot?.publicId || null;
  const uploadResult = await uploadPoliceVerificationDocumentToCloudinary(file, userId);
  const submittedAt = new Date();

  documentsRecord[documentFieldName] = {
    url: uploadResult.url,
    publicId: uploadResult.publicId,
    mimeType: uploadResult.mimeType,
    sizeBytes: normalizedIncomingFileSizeBytes,
    submittedAt
  };
  user.verificationDocuments = documentsRecord;

  user.policeVerification = user.policeVerification || { status: "pending" };
  user.policeVerification.status = "pending";
  user.policeVerification.reviewedAt = null;
  user.policeVerification.reviewedBy = null;
  user.policeVerification.rejectionReason = null;
  user.policeVerification.submittedAt = submittedAt;

  if (normalizedDocumentType === VERIFICATION_DOCUMENT_TYPES.POLICE_VERIFICATION) {
    user.policeVerification.documentUrl = uploadResult.url;
    user.policeVerification.documentPublicId = uploadResult.publicId;
    user.policeVerification.documentMimeType = uploadResult.mimeType;
  }

  user.verificationStatus = "pending";
  user.verifiedBy = null;
  user.isVerified = false;
  await user.save();

  if (
    previousDocumentPublicId &&
    previousDocumentPublicId !== uploadResult.publicId
  ) {
    await deletePoliceVerificationDocumentFromCloudinary(previousDocumentPublicId);
  }

  return {
    ...toVerificationStatusResponse(user, { includeDocument: true }),
    message: `${
      DOCUMENT_LABEL_BY_TYPE[normalizedDocumentType] || "Document"
    } uploaded successfully and verification status set to pending`
  };
}

export async function getMyPoliceVerificationStatus(userId) {
  ensureObjectId(userId, "userId");

  const user = await User.findById(userId).select(
    "_id fullName email role consultantRequestStatus policeVerification verificationDocuments verificationStatus verifiedBy"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  const verificationResponse = toVerificationStatusResponse(user, { includeDocument: true });

  return {
    ...verificationResponse,
    message: buildPoliceVerificationStatusMessage(
      verificationResponse.verificationStatus,
      verificationResponse.rejectionReason,
      verificationResponse.missingRequiredDocuments
    )
  };
}

export async function listPendingPoliceVerifications(options = {}) {
  const limit = Math.min(
    Math.max(Number(options.limit || DEFAULT_PENDING_LIMIT), 1),
    MAX_PENDING_LIMIT
  );

  const pendingQuery = {
    role: {
      $nin: [USER_ROLES.ADMIN, USER_ROLES.CONSULTANT]
    },
    $or: [
      { verificationStatus: "pending" },
      {
        verificationStatus: { $exists: false },
        "policeVerification.status": "pending"
      }
    ]
  };

  if (options.excludeUserId) {
    ensureObjectId(options.excludeUserId, "excludeUserId");
    pendingQuery._id = { $ne: options.excludeUserId };
  }

  const fetchLimit = Math.min(limit * 4, 400);

  const pendingUsers = await User.find(pendingQuery)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(fetchLimit)
    .select(
      "_id fullName email role consultantRequestStatus policeVerification verificationDocuments verificationStatus verifiedBy"
    );

  const normalizedPendingUsers = pendingUsers
    .map((user) => toVerificationStatusResponse(user, { includeDocument: true }))
    .filter(
      (user) => user.verificationStatus === "pending" && user.readyForReview
    )
    .slice(0, limit);

  return {
    totalPending: normalizedPendingUsers.length,
    users: normalizedPendingUsers
  };
}

export async function reviewPoliceVerification(userId, reviewerUserId, payload) {
  ensureObjectId(userId, "userId");
  ensureObjectId(reviewerUserId, "reviewerUserId");

  const reviewer = await User.findById(reviewerUserId).select("_id role");

  if (!reviewer) {
    throw new ApiError(404, "Reviewer account not found");
  }

  if (reviewer.role !== USER_ROLES.CONSULTANT) {
    throw new ApiError(403, "Only consultant role can verify users");
  }

  const user = await User.findById(userId).select(
    "_id fullName email role consultantRequestStatus policeVerification verificationDocuments verificationStatus verifiedBy isVerified"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.CONSULTANT) {
    throw new ApiError(400, "This role cannot be reviewed by consultants");
  }

  if (user._id.toString() === reviewerUserId.toString()) {
    throw new ApiError(400, "Consultants cannot review their own verification");
  }

  const documentSummary = buildVerificationDocumentSummary(user, {
    includeDocument: true
  });

  if (documentSummary.missingRequiredLabels.length > 0) {
    throw new ApiError(
      400,
      `User has not uploaded all required documents: ${documentSummary.missingRequiredLabels.join(
        ", "
      )}`
    );
  }

  user.policeVerification = user.policeVerification || { status: "pending" };
  user.policeVerification.status = payload.status;
  user.policeVerification.reviewedAt = new Date();
  user.policeVerification.reviewedBy = reviewerUserId;
  user.policeVerification.rejectionReason =
    payload.status === "rejected" ? payload.rejectionReason : null;

  user.verificationStatus = payload.status;
  user.verifiedBy = reviewerUserId;
  user.isVerified = payload.status === "approved";
  await user.save();

  const verificationResponse = toVerificationStatusResponse(user, { includeDocument: true });

  return {
    ...verificationResponse,
    message:
      payload.status === "approved"
        ? "User verification approved successfully"
        : "User verification rejected successfully"
  };
}

export async function assertPoliceVerifiedForCoreAccess(userId) {
  ensureObjectId(userId, "userId");

  const user = await User.findById(userId).select(
    "_id role consultantRequestStatus verificationStatus policeVerification verificationDocuments"
  );

  if (!user) {
    throw new ApiError(401, "User account was not found");
  }

  if (isAdminApprovedConsultant(user)) {
    return {
      status: "approved"
    };
  }

  const verificationResponse = toVerificationStatusResponse(user, { includeDocument: false });
  const status = verificationResponse.verificationStatus;

  if (status !== "approved") {
    throw new ApiError(
      403,
      buildPoliceVerificationStatusMessage(
        status,
        verificationResponse.rejectionReason,
        verificationResponse.missingRequiredDocuments
      )
    );
  }

  return {
    status
  };
}

export async function isUserPoliceVerified(userId) {
  ensureObjectId(userId, "userId");

  const user = await User.findById(userId).select(
    "role consultantRequestStatus verificationStatus policeVerification verificationDocuments"
  );

  if (!user) {
    return false;
  }

  if (isAdminApprovedConsultant(user)) {
    return true;
  }

  const verificationResponse = toVerificationStatusResponse(user, { includeDocument: false });
  return verificationResponse.verificationStatus === "approved";
}
