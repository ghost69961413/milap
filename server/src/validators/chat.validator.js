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

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content is required")
    .max(1000, "Message must be at most 1000 characters")
});

export const getMessagesQuerySchema = z.object({
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional(),
  before: z.string().datetime().optional()
});

export const chatUserParamsSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(objectIdRegex, "userId must be a valid MongoDB ObjectId")
});

export const socketSendMessageSchema = z.object({
  toUserId: z
    .string()
    .trim()
    .regex(objectIdRegex, "toUserId must be a valid MongoDB ObjectId"),
  content: z
    .string()
    .trim()
    .min(1, "Message content is required")
    .max(1000, "Message must be at most 1000 characters")
});
