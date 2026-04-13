import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import cloudinary from "../config/cloudinary.js";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

const LOCAL_VERIFICATION_PUBLIC_ID_PREFIX = "local_verification_file:";
const LOCAL_VERIFICATION_DIRECTORY = path.resolve(
  process.cwd(),
  "uploads",
  "verification"
);
const MIME_EXTENSION_BY_TYPE = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

function isCloudinaryConfigured() {
  return Boolean(
    env.cloudinaryCloudName &&
      env.cloudinaryApiKey &&
      env.cloudinaryApiSecret
  );
}

function createDataUri(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

function getDocumentFileExtension(file) {
  const extensionFromMime = MIME_EXTENSION_BY_TYPE.get(file?.mimetype);
  if (extensionFromMime) {
    return extensionFromMime;
  }

  const extensionFromName = path.extname(file?.originalname || "").toLowerCase();
  if (extensionFromName) {
    return extensionFromName;
  }

  return ".bin";
}

function buildLocalVerificationUrl(fileName) {
  return `http://127.0.0.1:${env.port}/uploads/verification/${encodeURIComponent(fileName)}`;
}

async function saveVerificationDocumentLocally(file, userId) {
  await fs.mkdir(LOCAL_VERIFICATION_DIRECTORY, { recursive: true });

  const fileName = `${userId}_${Date.now()}_${crypto.randomUUID()}${getDocumentFileExtension(
    file
  )}`;
  const absolutePath = path.join(LOCAL_VERIFICATION_DIRECTORY, fileName);

  await fs.writeFile(absolutePath, file.buffer);

  return {
    url: buildLocalVerificationUrl(fileName),
    publicId: `${LOCAL_VERIFICATION_PUBLIC_ID_PREFIX}${fileName}`,
    mimeType: file.mimetype
  };
}

async function deleteVerificationDocumentFromLocalStorage(publicId) {
  const fileName = String(publicId || "").slice(LOCAL_VERIFICATION_PUBLIC_ID_PREFIX.length);

  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return;
  }

  const absolutePath = path.join(LOCAL_VERIFICATION_DIRECTORY, fileName);
  await fs.rm(absolutePath, { force: true });
}

export async function uploadProfileImagesToCloudinary(files, userId) {
  if (!files?.length) {
    return [];
  }

  if (!isCloudinaryConfigured()) {
    if (env.nodeEnv === "production") {
      throw new ApiError(500, "Cloudinary credentials are not configured");
    }

    return files.map((file, index) => ({
      url: createDataUri(file),
      publicId: `local_image_${userId}_${Date.now()}_${index}`
    }));
  }

  const uploadTasks = files.map(async (file, index) => {
    const cloudinaryResponse = await cloudinary.uploader.upload(createDataUri(file), {
      folder: "matrimonial/profiles",
      resource_type: "image",
      public_id: `${userId}_${Date.now()}_${index}`
    });

    return {
      url: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id
    };
  });

  return Promise.all(uploadTasks);
}

export async function uploadDecoratorPortfolioImagesToCloudinary(files, userId) {
  if (!files?.length) {
    return [];
  }

  if (!isCloudinaryConfigured()) {
    if (env.nodeEnv === "production") {
      throw new ApiError(500, "Cloudinary credentials are not configured");
    }

    return files.map((file, index) => ({
      url: createDataUri(file),
      publicId: `local_decorator_image_${userId}_${Date.now()}_${index}`
    }));
  }

  const uploadTasks = files.map(async (file, index) => {
    const cloudinaryResponse = await cloudinary.uploader.upload(createDataUri(file), {
      folder: "matrimonial/decorators",
      resource_type: "image",
      public_id: `decorator_${userId}_${Date.now()}_${index}`
    });

    return {
      url: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id
    };
  });

  return Promise.all(uploadTasks);
}

export async function uploadPoliceVerificationDocumentToCloudinary(file, userId) {
  if (!file) {
    throw new ApiError(400, "Verification document is required");
  }

  if (!isCloudinaryConfigured()) {
    if (env.nodeEnv === "production") {
      throw new ApiError(500, "Cloudinary credentials are not configured");
    }

    return saveVerificationDocumentLocally(file, userId);
  }

  const cloudinaryResponse = await cloudinary.uploader.upload(createDataUri(file), {
    folder: "matrimonial/police-verification",
    resource_type: "auto",
    public_id: `police_verification_${userId}_${Date.now()}`
  });

  return {
    url: cloudinaryResponse.secure_url,
    publicId: cloudinaryResponse.public_id,
    mimeType: file.mimetype
  };
}

export async function deleteProfileImagesFromCloudinary(publicIds) {
  if (!publicIds?.length) {
    return;
  }

  if (!isCloudinaryConfigured()) {
    return;
  }

  const deleteTasks = publicIds.map((publicId) =>
    cloudinary.uploader.destroy(publicId, {
      resource_type: "image"
    })
  );

  await Promise.allSettled(deleteTasks);
}

export async function deleteDecoratorPortfolioImagesFromCloudinary(publicIds) {
  if (!publicIds?.length) {
    return;
  }

  if (!isCloudinaryConfigured()) {
    return;
  }

  const deleteTasks = publicIds.map((publicId) =>
    cloudinary.uploader.destroy(publicId, {
      resource_type: "image"
    })
  );

  await Promise.allSettled(deleteTasks);
}

export async function deletePoliceVerificationDocumentFromCloudinary(publicId) {
  if (!publicId) {
    return;
  }

  if (String(publicId).startsWith(LOCAL_VERIFICATION_PUBLIC_ID_PREFIX)) {
    await deleteVerificationDocumentFromLocalStorage(publicId);
    return;
  }

  if (!isCloudinaryConfigured()) {
    return;
  }

  await Promise.allSettled([
    cloudinary.uploader.destroy(publicId, {
      resource_type: "image"
    }),
    cloudinary.uploader.destroy(publicId, {
      resource_type: "raw"
    })
  ]);
}
