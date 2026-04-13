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

function parseDate(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedDate = new Date(value);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return value;
}

export const createEventSchema = z.object({
  eventType: z.enum(["engagement", "wedding"]),
  title: z.string().trim().min(2).max(120).optional(),
  eventDate: z.preprocess(parseDate, z.date()).optional(),
  location: z.string().trim().min(2).max(120).optional(),
  budget: z.preprocess(parseOptionalNumber, z.number().min(0)).optional(),
  notes: z.string().trim().max(1000).optional()
});

export const eventParamsSchema = z.object({
  eventId: z
    .string()
    .trim()
    .regex(objectIdRegex, "eventId must be a valid MongoDB ObjectId")
});

export const linkServiceProviderSchema = z
  .object({
    role: z.enum(["consultant", "lawyer", "decorator"]),
    providerUserId: z
      .string()
      .trim()
      .regex(objectIdRegex, "providerUserId must be a valid MongoDB ObjectId"),
    decoratorServiceId: z
      .string()
      .trim()
      .regex(objectIdRegex, "decoratorServiceId must be a valid MongoDB ObjectId")
      .optional(),
    notes: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.role === "decorator" && !value.decoratorServiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decoratorServiceId"],
        message: "decoratorServiceId is required when role is decorator"
      });
    }

    if (value.role !== "decorator" && value.decoratorServiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decoratorServiceId"],
        message: "decoratorServiceId is allowed only when role is decorator"
      });
    }
  });

export const listEventsQuerySchema = z.object({
  eventType: z.enum(["engagement", "wedding"]).optional(),
  status: z.enum(["planning", "confirmed", "completed", "cancelled"]).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});
