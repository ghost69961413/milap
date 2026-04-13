import multer from "multer";
import ApiError from "../utils/ApiError.js";

const VERIFICATION_MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024;

const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new ApiError(400, "Only image files are allowed"));
      return;
    }

    callback(null, true);
  }
});

const verificationUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: VERIFICATION_MAX_TOTAL_SIZE_BYTES,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg"
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new ApiError(400, "Only PDF or image files are allowed"));
      return;
    }

    callback(null, true);
  }
});

const decoratorPortfolioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 12
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new ApiError(400, "Only image files are allowed"));
      return;
    }

    callback(null, true);
  }
});

export const uploadProfileImages = profileUpload.array("images", 8);
export const uploadVerificationDocument = verificationUpload.single("document");
export const uploadDecoratorPortfolioImages = decoratorPortfolioUpload.array(
  "portfolioImages",
  12
);
