import { connectDatabase, disconnectDatabase } from "../config/db.js";
import env from "../config/env.js";
import { ADMIN_LEVELS, USER_ROLES } from "../constants/roles.js";
import User from "../models/User.js";

function getSeedConfig() {
  const isProduction = env.nodeEnv === "production";

  const fallback = {
    fullName: "Milap Admin",
    email: "admin@milap.app",
    phone: "9000001999",
    password: "Pass12345",
    gender: "other",
    profileFor: "self"
  };

  const config = {
    fullName: process.env.ADMIN_FULL_NAME || fallback.fullName,
    email: process.env.ADMIN_EMAIL || fallback.email,
    phone: process.env.ADMIN_PHONE || fallback.phone,
    password: process.env.ADMIN_PASSWORD || fallback.password,
    gender: process.env.ADMIN_GENDER || fallback.gender,
    profileFor: process.env.ADMIN_PROFILE_FOR || fallback.profileFor
  };

  if (
    isProduction &&
    (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PHONE || !process.env.ADMIN_PASSWORD)
  ) {
    throw new Error(
      "ADMIN_EMAIL, ADMIN_PHONE, and ADMIN_PASSWORD are required in production"
    );
  }

  return config;
}

async function seedAdmin() {
  const seedConfig = getSeedConfig();
  const email = seedConfig.email.trim().toLowerCase();

  const existingUser = await User.findOne({ email }).select("+password");

  if (existingUser) {
    existingUser.fullName = seedConfig.fullName;
    existingUser.phone = seedConfig.phone;
    existingUser.gender = seedConfig.gender;
    existingUser.profileFor = seedConfig.profileFor;
    existingUser.role = USER_ROLES.ADMIN;
    existingUser.adminLevel = ADMIN_LEVELS.PRIMARY;
    existingUser.password = seedConfig.password;
    existingUser.isVerified = true;
    existingUser.verificationStatus = "approved";
    existingUser.verifiedBy = null;
    existingUser.policeVerification = {
      status: "approved",
      documentUrl: existingUser.policeVerification?.documentUrl,
      documentPublicId: existingUser.policeVerification?.documentPublicId,
      documentMimeType: existingUser.policeVerification?.documentMimeType,
      submittedAt: existingUser.policeVerification?.submittedAt || null,
      reviewedAt: new Date(),
      reviewedBy: existingUser.policeVerification?.reviewedBy || null,
      rejectionReason: null
    };
    existingUser.consultantApproval = {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: existingUser.consultantApproval?.reviewedBy || null,
      rejectionReason: null
    };
    existingUser.consultantRequestStatus = "none";
    existingUser.consultantRequestAppliedAt = null;
    existingUser.consultantRequestReviewedAt = new Date();
    existingUser.consultantRequestReviewedBy =
      existingUser.consultantRequestReviewedBy || null;
    existingUser.consultantRequestRejectionReason = null;

    await existingUser.save();

    console.info(`Admin account updated successfully: ${existingUser.email}`);
    return;
  }

  const createdAdmin = await User.create({
    fullName: seedConfig.fullName,
    email,
    phone: seedConfig.phone,
    password: seedConfig.password,
    gender: seedConfig.gender,
    profileFor: seedConfig.profileFor,
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
    consultantRequestRejectionReason: null,
    consultantRequestReviewedBy: null
    
  });

  console.info(`Admin account created successfully: ${createdAdmin.email}`);
}

async function run() {
  await connectDatabase();

  try {
    await seedAdmin();
  } finally {
    await disconnectDatabase();
  }
}

run().catch((error) => {
  console.error("Failed to seed admin account", error);
  process.exit(1);
});
