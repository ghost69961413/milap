import { z } from "zod";
import { ALL_USER_ROLES } from "../constants/roles.js";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

function parseOptionalNumber(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return undefined;
    }

    const parsedValue = Number(trimmedValue);

    if (!Number.isNaN(parsedValue)) {
      return parsedValue;
    }
  }

  return value;
}

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().trim().min(1, "Password is required")
});

export const listAdminUsersQuerySchema = z.object({
  role: z.enum(ALL_USER_ROLES).optional(),
  verificationStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  consultantRequestStatus: z.enum(["none", "pending", "approved", "rejected"]).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(200)).optional()
});

export const adminUserParamsSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(objectIdRegex, "userId must be a valid MongoDB ObjectId")
});

export const reviewConsultantApprovalSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().min(3).max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "rejectionReason is required when status is rejected"
      });
    }
  });

export const listPendingConsultantsQuerySchema = z.object({
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const promoteUserToConsultantSchema = z.object({
  note: z.string().trim().min(3).max(300).optional()
});

export const promoteSecondaryAdminSchema = z.object({
  note: z.string().trim().min(3).max(300).optional()
});
