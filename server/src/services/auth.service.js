import env from "../config/env.js";
import { ADMIN_LEVELS, USER_ROLES } from "../constants/roles.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { signAuthToken } from "../utils/jwt.js";

const DEV_DEMO_ACCOUNTS = [
  {
    user: {
      fullName: "Riya Sharma",
      email: "riya.demo@milap.app",
      phone: "9000001001",
      password: "Pass12345",
      gender: "female",
      profileFor: "self",
      role: USER_ROLES.NORMAL_USER,
      verificationStatus: "approved",
      isVerified: true,
      policeVerification: {
        status: "approved",
        reviewedAt: new Date()
      }
    },
    profile: {
      name: "Riya Sharma",
      age: 25,
      gender: "female",
      religion: "Hindu",
      caste: "General",
      education: "MBA",
      profession: "Product Analyst",
      income: 1100000,
      location: "Bengaluru",
      bio: "Warm, practical, and looking for a respectful long-term partnership.",
      interests: ["music", "travel", "reading"],
      partnerPreferences: {
        minAge: 25,
        maxAge: 34,
        gender: "male",
        location: "Bengaluru",
        interests: ["music", "travel"]
      }
    }
  },
  {
    user: {
      fullName: "Ananya Iyer",
      email: "ananya.demo@milap.app",
      phone: "9000001002",
      password: "Pass12345",
      gender: "female",
      profileFor: "self",
      role: USER_ROLES.NORMAL_USER,
      verificationStatus: "approved",
      isVerified: true,
      policeVerification: {
        status: "approved",
        reviewedAt: new Date()
      }
    },
    profile: {
      name: "Ananya Iyer",
      age: 27,
      gender: "female",
      religion: "Hindu",
      caste: "Iyer",
      education: "M.Tech",
      profession: "Software Engineer",
      income: 1800000,
      location: "Chennai",
      bio: "Family-oriented and career-focused, with a calm and thoughtful nature.",
      interests: ["music", "books", "cooking"],
      partnerPreferences: {
        minAge: 27,
        maxAge: 35,
        gender: "male",
        interests: ["music", "travel"]
      }
    }
  },
  {
    user: {
      fullName: "Meera Joshi",
      email: "meera.demo@milap.app",
      phone: "9000001003",
      password: "Pass12345",
      gender: "female",
      profileFor: "self",
      role: USER_ROLES.NORMAL_USER,
      verificationStatus: "approved",
      isVerified: true,
      policeVerification: {
        status: "approved",
        reviewedAt: new Date()
      }
    },
    profile: {
      name: "Meera Joshi",
      age: 26,
      gender: "female",
      religion: "Hindu",
      caste: "Brahmin",
      education: "B.Com",
      profession: "Finance Executive",
      income: 950000,
      location: "Pune",
      bio: "I value honesty, emotional maturity, and a supportive partner.",
      interests: ["yoga", "travel", "movies"],
      partnerPreferences: {
        minAge: 26,
        maxAge: 35,
        gender: "male",
        interests: ["travel", "fitness"]
      }
    }
  },
  {
    user: {
      fullName: "Arjun Verma",
      email: "arjun.demo@milap.app",
      phone: "9000001004",
      password: "Pass12345",
      gender: "male",
      profileFor: "self",
      role: USER_ROLES.NORMAL_USER,
      verificationStatus: "approved",
      isVerified: true,
      policeVerification: {
        status: "approved",
        reviewedAt: new Date()
      }
    },
    profile: {
      name: "Arjun Verma",
      age: 30,
      gender: "male",
      religion: "Hindu",
      caste: "General",
      education: "B.Tech",
      profession: "Data Engineer",
      income: 1900000,
      location: "Bengaluru",
      bio: "Looking for a kind and grounded life partner who values family.",
      interests: ["cricket", "music", "travel"],
      partnerPreferences: {
        minAge: 24,
        maxAge: 31,
        gender: "female",
        location: "Bengaluru"
      }
    }
  }
];

const ADMIN_PHONE_REGEX = /^[6-9]\d{9}$/;

function getRuntimeAdminConfig() {
  const fallback = {
    fullName: "Milap Admin",
    email: "admin@milap.app",
    phone: "9000001999",
    password: "Pass12345",
    gender: "other",
    profileFor: "self"
  };

  const email = (process.env.ADMIN_EMAIL || fallback.email).trim().toLowerCase();
  const phone = (process.env.ADMIN_PHONE || fallback.phone).trim();

  return {
    fullName: (process.env.ADMIN_FULL_NAME || fallback.fullName).trim(),
    email,
    phone: ADMIN_PHONE_REGEX.test(phone) ? phone : fallback.phone,
    password: process.env.ADMIN_PASSWORD || fallback.password,
    gender: process.env.ADMIN_GENDER || fallback.gender,
    profileFor: process.env.ADMIN_PROFILE_FOR || fallback.profileFor
  };
}

async function findAvailableAdminPhone(preferredPhone, currentEmail) {
  const phoneConflict = await User.findOne({
    phone: preferredPhone,
    email: { $ne: currentEmail }
  }).select("_id");

  if (!phoneConflict) {
    return preferredPhone;
  }

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidatePhone = `9000001${String(suffix).padStart(3, "0")}`;
    const candidateConflict = await User.findOne({
      phone: candidatePhone,
      email: { $ne: currentEmail }
    }).select("_id");

    if (!candidateConflict) {
      return candidatePhone;
    }
  }

  throw new ApiError(500, "Unable to allocate admin phone number");
}

export async function ensureRuntimeAdminUser() {
  const config = getRuntimeAdminConfig();
  const existingUser = await User.findOne({ email: config.email }).select("+password");

  if (existingUser) {
    if (existingUser.role === USER_ROLES.ADMIN) {
      if (existingUser.adminLevel !== ADMIN_LEVELS.PRIMARY) {
        existingUser.adminLevel = ADMIN_LEVELS.PRIMARY;
        await existingUser.save();
      }
      return existingUser;
    }

    if (env.nodeEnv === "production") {
      throw new ApiError(
        500,
        "Configured ADMIN_EMAIL belongs to a non-admin account. Resolve this before startup."
      );
    }

    existingUser.fullName = config.fullName;
    existingUser.phone = await findAvailableAdminPhone(config.phone, config.email);
    existingUser.password = config.password;
    existingUser.gender = config.gender;
    existingUser.profileFor = config.profileFor;
    existingUser.role = USER_ROLES.ADMIN;
    existingUser.adminLevel = ADMIN_LEVELS.PRIMARY;
    existingUser.isVerified = true;
    existingUser.verificationStatus = "approved";
    existingUser.verifiedBy = null;
    existingUser.policeVerification = {
      status: "approved",
      documentUrl: existingUser.policeVerification?.documentUrl || null,
      documentPublicId: existingUser.policeVerification?.documentPublicId || null,
      documentMimeType: existingUser.policeVerification?.documentMimeType || null,
      submittedAt: existingUser.policeVerification?.submittedAt || null,
      reviewedAt: existingUser.policeVerification?.reviewedAt || new Date(),
      reviewedBy: existingUser.policeVerification?.reviewedBy || null,
      rejectionReason: null
    };
    existingUser.consultantRequestStatus = "none";
    existingUser.consultantRequestAppliedAt = null;
    existingUser.consultantRequestReviewedAt = new Date();
    existingUser.consultantRequestReviewedBy = null;
    existingUser.consultantRequestRejectionReason = null;
    existingUser.consultantApproval = {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: null,
      rejectionReason: null
    };

    await existingUser.save();
    return existingUser;
  }

  const phone = await findAvailableAdminPhone(config.phone, config.email);

  return User.create({
    fullName: config.fullName,
    email: config.email,
    phone,
    password: config.password,
    gender: config.gender,
    profileFor: config.profileFor,
    role: USER_ROLES.ADMIN,
    adminLevel: ADMIN_LEVELS.PRIMARY,
    isVerified: true,
    verificationStatus: "approved",
    verifiedBy: null,
    policeVerification: {
      status: "approved",
      reviewedAt: new Date()
    },
    consultantApproval: {
      status: "approved",
      reviewedAt: new Date()
    },
    consultantRequestStatus: "none",
    consultantRequestAppliedAt: null,
    consultantRequestReviewedAt: new Date(),
    consultantRequestReviewedBy: null,
    consultantRequestRejectionReason: null
  });
}

async function ensureDevSeedUsers() {
  if (env.nodeEnv === "production") {
    return;
  }

  const existingUserCount = await User.estimatedDocumentCount();

  if (existingUserCount > 2) {
    return;
  }

  for (const account of DEV_DEMO_ACCOUNTS) {
    let demoUser = await User.findOne({ email: account.user.email });

    if (!demoUser) {
      try {
        demoUser = await User.create(account.user);
      } catch (_error) {
        demoUser = await User.findOne({ email: account.user.email });
      }
    }

    if (!demoUser) {
      continue;
    }

    const shouldSyncVerificationStatus =
      demoUser.verificationStatus !== "approved" ||
      demoUser.policeVerification?.status !== "approved" ||
      demoUser.isVerified !== true;

    if (shouldSyncVerificationStatus) {
      demoUser.verificationStatus = "approved";
      demoUser.verifiedBy = demoUser.verifiedBy || null;
      demoUser.isVerified = true;
      demoUser.policeVerification = {
        status: "approved",
        documentUrl: demoUser.policeVerification?.documentUrl || null,
        documentPublicId: demoUser.policeVerification?.documentPublicId || null,
        documentMimeType: demoUser.policeVerification?.documentMimeType || null,
        submittedAt: demoUser.policeVerification?.submittedAt || null,
        reviewedAt: demoUser.policeVerification?.reviewedAt || new Date(),
        reviewedBy: demoUser.policeVerification?.reviewedBy || null,
        rejectionReason: null
      };
      await demoUser.save();
    }

    const existingProfile = await Profile.findOne({ user: demoUser._id }).select("_id");

    if (!existingProfile) {
      await Profile.create({
        user: demoUser._id,
        ...account.profile
      });
    }
  }
}

function getEffectiveVerificationStatus(user) {
  const topLevelStatus = user?.verificationStatus;
  const nestedStatus = user?.policeVerification?.status;

  if (!topLevelStatus) {
    return nestedStatus || "pending";
  }

  if (
    topLevelStatus === "pending" &&
    (nestedStatus === "approved" || nestedStatus === "rejected")
  ) {
    return nestedStatus;
  }

  return topLevelStatus;
}

function getEffectiveVerifiedBy(user) {
  const status = getEffectiveVerificationStatus(user);

  if (user?.verificationStatus === "approved" || user?.verificationStatus === "rejected") {
    return user?.verifiedBy?.toString?.() || null;
  }

  if (status === "approved" || status === "rejected") {
    return user?.policeVerification?.reviewedBy?.toString?.() || null;
  }

  return null;
}

function buildPublicUser(user) {
  const consultantRequestStatus =
    user.consultantRequestStatus ||
    (user.role === USER_ROLES.CONSULTANT ? "approved" : "none");

  const effectiveVerificationStatus = getEffectiveVerificationStatus(user);

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    profileFor: user.profileFor,
    role: user.role,
    adminLevel: user.role === USER_ROLES.ADMIN ? user.adminLevel || ADMIN_LEVELS.SECONDARY : null,
    verificationStatus: effectiveVerificationStatus,
    verifiedBy: getEffectiveVerifiedBy(user),
    consultantRequest: {
      status: consultantRequestStatus,
      appliedAt: user.consultantRequestAppliedAt || null,
      reviewedAt: user.consultantRequestReviewedAt || null,
      rejectionReason: user.consultantRequestRejectionReason || null
    },
    consultantApproval: {
      status: user.consultantApproval?.status || "approved",
      reviewedAt: user.consultantApproval?.reviewedAt || null,
      rejectionReason: user.consultantApproval?.rejectionReason || null
    },
    policeVerification: {
      status: user.policeVerification?.status || "pending",
      documentUploaded: Boolean(user.policeVerification?.documentUrl),
      submittedAt: user.policeVerification?.submittedAt || null,
      reviewedAt: user.policeVerification?.reviewedAt || null,
      rejectionReason: user.policeVerification?.rejectionReason || null
    },
    isVerified: effectiveVerificationStatus === "approved" || user.isVerified
  };
}

function buildAuthResponse(user) {
  const token = signAuthToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    adminLevel:
      user.role === USER_ROLES.ADMIN
        ? user.adminLevel || ADMIN_LEVELS.SECONDARY
        : undefined
  });

  return {
    token,
    user: buildPublicUser(user)
  };
}

export async function signupUser(payload) {
  const existingUser = await User.findOne({ email: payload.email });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  if (payload.role === USER_ROLES.CONSULTANT) {
    throw new ApiError(
      403,
      "Consultant role cannot be assigned during signup. Apply after creating a normal user account."
    );
  }

  const user = await User.create({
    ...payload,
    adminLevel: null,
    consultantApproval: {
      status: "approved"
    },
    consultantRequestStatus: "none",
    consultantRequestAppliedAt: null,
    consultantRequestReviewedAt: null,
    consultantRequestReviewedBy: null,
    consultantRequestRejectionReason: null,
    verificationStatus: "pending",
    verifiedBy: null
  });
  await ensureDevSeedUsers();

  return buildAuthResponse(user);
}

export async function loginUser(payload) {
  await ensureDevSeedUsers();

  const user = await User.findOne({ email: payload.email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(payload.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new ApiError(403, "Use admin login endpoint for admin account access");
  }

  if (payload.role && user.role !== payload.role) {
    throw new ApiError(403, `This account is not registered as ${payload.role}`);
  }

  return buildAuthResponse(user);
}

export async function loginAdminUser(payload) {
  await ensureRuntimeAdminUser();

  const user = await User.findOne({ email: payload.email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(payload.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.role !== USER_ROLES.ADMIN) {
    throw new ApiError(403, "This account does not have admin access");
  }

  return buildAuthResponse(user);
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(401, "User account was not found");
  }

  return buildPublicUser(user);
}
