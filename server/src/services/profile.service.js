import Profile from "../models/Profile.js";
import ApiError from "../utils/ApiError.js";
import {
  deleteProfileImagesFromCloudinary,
  uploadProfileImagesToCloudinary
} from "./media.service.js";
import { trackProfileView } from "./premium.service.js";

const PROFILE_FIELDS = [
  "name",
  "age",
  "gender",
  "religion",
  "caste",
  "education",
  "profession",
  "income",
  "location",
  "bio",
  "interests"
];

const MAX_PROFILE_IMAGES = 8;

export async function createProfileForUser(userId, payload, files) {
  const existingProfile = await Profile.findOne({ user: userId });

  if (existingProfile) {
    throw new ApiError(409, "Profile already exists for this account");
  }

  const uploadedImages = await uploadProfileImagesToCloudinary(files, userId);

  const profile = await Profile.create({
    user: userId,
    ...payload,
    images: uploadedImages
  });

  return profile.toJSON();
}

export async function updateProfileForUser(userId, payload, files) {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  const removeImagePublicIds = payload.removeImagePublicIds || [];

  if (removeImagePublicIds.length) {
    const imageIdsToRemove = new Set(removeImagePublicIds);

    const removablePublicIds = profile.images
      .filter((image) => imageIdsToRemove.has(image.publicId))
      .map((image) => image.publicId);

    await deleteProfileImagesFromCloudinary(removablePublicIds);

    profile.images = profile.images.filter(
      (image) => !imageIdsToRemove.has(image.publicId)
    );
  }

  const uploadedImages = await uploadProfileImagesToCloudinary(files, userId);

  if (profile.images.length + uploadedImages.length > MAX_PROFILE_IMAGES) {
    throw new ApiError(400, `You can upload up to ${MAX_PROFILE_IMAGES} images`);
  }

  if (uploadedImages.length) {
    profile.images.push(...uploadedImages);
  }

  PROFILE_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      profile[field] = payload[field];
    }
  });

  if (payload.partnerPreferences) {
    const currentPreferences =
      typeof profile.partnerPreferences?.toObject === "function"
        ? profile.partnerPreferences.toObject()
        : profile.partnerPreferences || {};

    profile.partnerPreferences = {
      ...currentPreferences,
      ...payload.partnerPreferences
    };
  }

  await profile.save();

  return profile.toJSON();
}

export async function getProfileForUser(userId) {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  return profile.toJSON();
}

export async function getPublicProfileByUserId(currentUserId, targetUserId) {
  const profile = await Profile.findOne({ user: targetUserId });

  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  await trackProfileView(profile.user.toString(), currentUserId, profile._id.toString());

  return profile.toJSON();
}
