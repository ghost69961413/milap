import jwt from "jsonwebtoken";
import env from "../config/env.js";
import ApiError from "./ApiError.js";

function assertJwtSecret() {
  if (!env.jwtSecret) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }
}

export function signAuthToken(payload) {
  assertJwtSecret();

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

export function verifyAuthToken(token) {
  assertJwtSecret();
  return jwt.verify(token, env.jwtSecret);
}
