import mongoose from "mongoose";
import { ADMIN_LEVELS, USER_ROLES } from "../constants/roles.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { loginAdminUser } from "./auth.service.js";

const DEFAULT_USER_LIMIT = 100;
const DEFAULT_PENDING_LIMIT = 50;
const MAX_USER_LIMIT = 200;
const MAX_PENDING_LIMIT = 100;

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} is invalid`);
  }
}

function parseLimit(value, fallbackValue, maxLimit) {
  const parsedValue = Number(value ?? fallbackValue);
  return Math.min(Math.max(parsedValue, 1), maxLimit);
}

function getConsultantRequestStatus(user) {
  return (
    user?.consultantRequestStatus ||
    (user?.role === USER_ROLES.CONSULTANT ? "approved" : "none")
  );
}

function toAdminUserSummary(user) {
  const consultantRequestStatus = getConsultantRequestStatus(user);

  return {
    userId: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    adminLevel: user.role === USER_ROLES.ADMIN ? user.adminLevel || ADMIN_LEVELS.SECONDARY : null,
    gender: user.gender,
    profileFor: user.profileFor,
    isVerified: Boolean(user.isVerified),
    policeVerification: {
      status: user.policeVerification?.status || "pending",
      documentUploaded: Boolean(user.policeVerification?.documentUrl),
      submittedAt: user.policeVerification?.submittedAt || null,
      reviewedAt: user.policeVerification?.reviewedAt || null,
      rejectionReason: user.policeVerification?.rejectionReason || null
    },
    consultantRequest: {
      status: consultantRequestStatus,
      appliedAt: user.consultantRequestAppliedAt || null,
      reviewedAt: user.consultantRequestReviewedAt || null,
      rejectionReason: user.consultantRequestRejectionReason || null
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function getAdminActorOrThrow(adminUserId) {
  const adminUser = await User.findById(adminUserId).select("_id role adminLevel");

  if (!adminUser) {
    throw new ApiError(404, "Admin account not found");
  }

  if (adminUser.role !== USER_ROLES.ADMIN) {
    throw new ApiError(403, "Only admin can perform this action");
  }

  return adminUser;
}

export async function adminLogin(payload) {
  return loginAdminUser(payload);
}

export async function listUsersForAdmin(options = {}) {
  const query = {};

  if (options.role) {
    query.role = options.role;
  }

  if (options.verificationStatus) {
    query.$or = [
      { verificationStatus: options.verificationStatus },
      {
        verificationStatus: { $exists: false },
        "policeVerification.status": options.verificationStatus
      }
    ];
  }

  if (options.consultantRequestStatus) {
    query.consultantRequestStatus = options.consultantRequestStatus;

    if (!options.role && options.consultantRequestStatus === "pending") {
      query.role = USER_ROLES.NORMAL_USER;
    }
  }

  const limit = parseLimit(options.limit, DEFAULT_USER_LIMIT, MAX_USER_LIMIT);

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "_id fullName email phone role adminLevel gender profileFor isVerified policeVerification consultantRequestStatus consultantRequestAppliedAt consultantRequestReviewedAt consultantRequestRejectionReason createdAt updatedAt"
    );

  return {
    totalUsers: users.length,
    users: users.map((user) => toAdminUserSummary(user))
  };
}

export async function listPendingConsultantApprovals(options = {}) {
  const limit = parseLimit(options.limit, DEFAULT_PENDING_LIMIT, MAX_PENDING_LIMIT);

  const consultants = await User.find({
    role: USER_ROLES.NORMAL_USER,
    consultantRequestStatus: "pending"
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select(
      "_id fullName email phone role adminLevel gender profileFor isVerified policeVerification consultantRequestStatus consultantRequestAppliedAt consultantRequestReviewedAt consultantRequestRejectionReason createdAt updatedAt"
    );

  return {
    totalPending: consultants.length,
    consultants: consultants.map((user) => toAdminUserSummary(user))
  };
}

export async function reviewConsultantApproval(userId, reviewerUserId, payload) {
  ensureObjectId(userId, "userId");
  ensureObjectId(reviewerUserId, "reviewerUserId");

  const user = await User.findById(userId).select(
    "_id fullName email phone role gender profileFor isVerified policeVerification consultantRequestStatus consultantRequestAppliedAt consultantRequestReviewedAt consultantRequestReviewedBy consultantRequestRejectionReason createdAt updatedAt"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new ApiError(400, "Admin role cannot be reviewed as consultant request");
  }

  if (user.role === USER_ROLES.CONSULTANT && user.consultantRequestStatus === "approved") {
    throw new ApiError(409, "User is already an approved consultant");
  }

  if (user.consultantRequestStatus !== "pending") {
    throw new ApiError(400, "User has no pending consultant request");
  }

  user.consultantRequestStatus = payload.status;
  user.consultantRequestReviewedAt = new Date();
  user.consultantRequestReviewedBy = reviewerUserId;
  user.consultantRequestRejectionReason =
    payload.status === "rejected" ? payload.rejectionReason : null;

  if (payload.status === "approved") {
    user.role = USER_ROLES.CONSULTANT;
    user.consultantApproval = {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: reviewerUserId,
      rejectionReason: null
    };
  } else {
    user.role = USER_ROLES.NORMAL_USER;
    user.consultantApproval = {
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: reviewerUserId,
      rejectionReason: payload.rejectionReason
    };
  }

  await user.save();

  return {
    ...toAdminUserSummary(user),
    message:
      payload.status === "approved"
        ? "Consultant role approved successfully"
        : "Consultant request rejected successfully"
  };
}

export async function promoteUserToConsultantByAdmin(userId, reviewerUserId, _payload = {}) {
  ensureObjectId(userId, "userId");
  ensureObjectId(reviewerUserId, "reviewerUserId");
  await getAdminActorOrThrow(reviewerUserId);

  const user = await User.findById(userId).select(
    "_id fullName email phone role gender profileFor isVerified policeVerification consultantApproval consultantRequestStatus consultantRequestAppliedAt consultantRequestReviewedAt consultantRequestReviewedBy consultantRequestRejectionReason createdAt updatedAt"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new ApiError(400, "Admin user cannot be promoted");
  }

  if ([USER_ROLES.LAWYER, USER_ROLES.DECORATOR].includes(user.role)) {
    throw new ApiError(
      400,
      "Promote to consultant is not applicable for lawyer/decorator users"
    );
  }

  if (user.role === USER_ROLES.CONSULTANT) {
    throw new ApiError(409, "User is already a consultant");
  }

  user.role = USER_ROLES.CONSULTANT;
  user.consultantRequestStatus = "approved";
  user.consultantRequestAppliedAt = user.consultantRequestAppliedAt || new Date();
  user.consultantRequestReviewedAt = new Date();
  user.consultantRequestReviewedBy = reviewerUserId;
  user.consultantRequestRejectionReason = null;
  user.consultantApproval = {
    status: "approved",
    reviewedAt: new Date(),
    reviewedBy: reviewerUserId,
    rejectionReason: null
  };

  await user.save();

  return {
    ...toAdminUserSummary(user),
    message: "User promoted to consultant successfully"
  };
}

export async function deleteUserByAdmin(userId, adminUserId) {
  ensureObjectId(userId, "userId");
  ensureObjectId(adminUserId, "adminUserId");
  const actorAdmin = await getAdminActorOrThrow(adminUserId);

  if (userId.toString() === adminUserId.toString()) {
    throw new ApiError(400, "Admin cannot delete own account");
  }

  const user = await User.findById(userId).select(
    "_id fullName email role adminLevel consultantRequestStatus"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.role === USER_ROLES.ADMIN) {
    const targetAdminLevel = user.adminLevel || ADMIN_LEVELS.SECONDARY;

    if (targetAdminLevel !== ADMIN_LEVELS.SECONDARY) {
      throw new ApiError(400, "Primary admin cannot be deleted from this action");
    }

    if ((actorAdmin.adminLevel || ADMIN_LEVELS.SECONDARY) !== ADMIN_LEVELS.PRIMARY) {
      throw new ApiError(
        403,
        "Only primary admin can delete a secondary admin"
      );
    }
  }

  await User.deleteOne({ _id: userId });

  return {
    userId: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    message: "User deleted successfully"
  };
}

export async function promoteConsultantToSecondaryAdminByPrimaryAdmin(
  userId,
  adminUserId,
  _payload = {}
) {
  ensureObjectId(userId, "userId");
  ensureObjectId(adminUserId, "adminUserId");

  const actorAdmin = await getAdminActorOrThrow(adminUserId);

  if ((actorAdmin.adminLevel || ADMIN_LEVELS.SECONDARY) !== ADMIN_LEVELS.PRIMARY) {
    throw new ApiError(403, "Only primary admin can create a secondary admin");
  }

  const user = await User.findById(userId).select(
    "_id fullName email phone role adminLevel gender profileFor isVerified policeVerification consultantRequestStatus consultantRequestAppliedAt consultantRequestReviewedAt consultantRequestReviewedBy consultantRequestRejectionReason createdAt updatedAt consultantApproval"
  );

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new ApiError(409, "This user already has admin role");
  }

  if (user.role !== USER_ROLES.CONSULTANT) {
    throw new ApiError(400, "Only consultant users can be promoted to secondary admin");
  }

  user.role = USER_ROLES.ADMIN;
  user.adminLevel = ADMIN_LEVELS.SECONDARY;
  user.consultantRequestStatus = "approved";
  user.consultantRequestReviewedAt = user.consultantRequestReviewedAt || new Date();
  user.consultantRequestReviewedBy =
    user.consultantRequestReviewedBy || actorAdmin._id;
  user.consultantRequestRejectionReason = null;
  user.consultantApproval = {
    status: "approved",
    reviewedAt: user.consultantApproval?.reviewedAt || new Date(),
    reviewedBy: user.consultantApproval?.reviewedBy || actorAdmin._id,
    rejectionReason: null
  };

  await user.save();

  return {
    ...toAdminUserSummary(user),
    message: "Consultant promoted to secondary admin successfully"
  };
}
