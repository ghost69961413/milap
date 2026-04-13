import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import env from "../config/env.js";

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten()
    });
  }

  if (err?.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || "field";

    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: `${duplicateField} is already in use`
    });
  }

  if (err?.name === "MulterError") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: err.message
    });
  }

  if (err?.name === "CastError") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `${err.path || "field"} is invalid`
    });
  }

  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const isServerError = statusCode >= StatusCodes.INTERNAL_SERVER_ERROR;
  const message =
    isServerError && env.nodeEnv === "production"
      ? "Something went wrong"
      : err.message || "Something went wrong";

  return res.status(statusCode).json({
    success: false,
    message
  });
}
