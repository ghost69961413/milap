import { z } from "zod";
import {
  ALL_USER_ROLES,
  USER_ROLES
} from "../constants/roles.js";

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

function normalizeRoleInput(value) {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (!normalizedValue) {
    return normalizedValue;
  }

  const roleAliasMap = new Map([
    ["user", USER_ROLES.NORMAL_USER],
    ["normal", USER_ROLES.NORMAL_USER],
    ["normal_user", USER_ROLES.NORMAL_USER],
    ["consultant", USER_ROLES.CONSULTANT],
    ["event_consultant", USER_ROLES.CONSULTANT],
    ["lawyer", USER_ROLES.LAWYER],
    ["advocate", USER_ROLES.LAWYER],
    ["legal", USER_ROLES.LAWYER],
    ["decorator", USER_ROLES.DECORATOR],
    ["event_service", USER_ROLES.DECORATOR],
    ["admin", USER_ROLES.ADMIN]
  ]);

  return roleAliasMap.get(normalizedValue) || normalizedValue;
}

const publicRoleSchema = z.preprocess(
  normalizeRoleInput,
  z
    .string()
    .trim()
    .refine(
      (value) =>
        [USER_ROLES.NORMAL_USER, USER_ROLES.LAWYER, USER_ROLES.DECORATOR].includes(
          value
        ),
      "Invalid role"
    )
);

const loginRoleSchema = z.preprocess(
  normalizeRoleInput,
  z
    .string()
    .trim()
    .refine((value) => ALL_USER_ROLES.includes(value), "Invalid role")
);

const passwordSchema = z
  .string()
  .trim()
  .min(8, "Password must be at least 8 characters long")
  .max(64, "Password must not exceed 64 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).+$/,
    "Password must contain at least one letter and one number"
  );

export const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
  password: passwordSchema,
  gender: z.enum(["male", "female", "other"]),
  profileFor: z.enum(["self", "son", "daughter", "brother", "sister", "friend", "relative"]),
  role: publicRoleSchema.optional().default(USER_ROLES.NORMAL_USER)
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().trim().min(1, "Password is required"),
  role: loginRoleSchema.optional()
});
