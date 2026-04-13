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

export const sendInterestSchema = z.object({
  receiverUserId: z
    .string()
    .trim()
    .regex(objectIdRegex, "receiverUserId must be a valid MongoDB ObjectId")
});

export const listInteractionsQuerySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const interactionParamsSchema = z.object({
  interactionId: z
    .string()
    .trim()
    .regex(objectIdRegex, "interactionId must be a valid MongoDB ObjectId")
});
