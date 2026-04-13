import { z } from "zod";

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

export const createConnectionRequestSchema = z
  .object({
    providerRole: z.enum(["consultant", "lawyer", "decorator"]),
    providerUserId: z
      .string()
      .trim()
      .regex(objectIdRegex, "providerUserId must be a valid MongoDB ObjectId"),
    decoratorServiceId: z
      .string()
      .trim()
      .regex(objectIdRegex, "decoratorServiceId must be a valid MongoDB ObjectId")
      .optional(),
    message: z.string().trim().min(5).max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.providerRole === "decorator" && !value.decoratorServiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decoratorServiceId"],
        message: "decoratorServiceId is required when providerRole is decorator"
      });
    }

    if (value.providerRole !== "decorator" && value.decoratorServiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decoratorServiceId"],
        message: "decoratorServiceId is allowed only when providerRole is decorator"
      });
    }
  });

export const listConnectionRequestsQuerySchema = z.object({
  direction: z.enum(["incoming", "outgoing", "all"]).optional(),
  status: z.enum(["pending", "accepted", "rejected", "cancelled"]).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const connectionRequestParamsSchema = z.object({
  requestId: z
    .string()
    .trim()
    .regex(objectIdRegex, "requestId must be a valid MongoDB ObjectId")
});

export const respondConnectionRequestSchema = z.object({
  responseNote: z.string().trim().min(3).max(500).optional()
});

export const cancelConnectionRequestSchema = z.object({
  cancelReason: z.string().trim().min(3).max(500).optional()
});
