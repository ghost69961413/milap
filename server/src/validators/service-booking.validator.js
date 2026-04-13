import { z } from "zod";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const bookingServiceTypes = ["consultant", "lawyer", "decorator"];
const bookingStatuses = ["pending", "accepted", "rejected", "completed"];

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

function parseStringArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return [];
    }

    if (trimmedValue.startsWith("[")) {
      try {
        const parsedValue = JSON.parse(trimmedValue);

        if (Array.isArray(parsedValue)) {
          return parsedValue;
        }
      } catch (_error) {
        return value;
      }
    }

    return trimmedValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}

const serviceTypeSchema = z.enum(bookingServiceTypes);

export const createServiceBookingSchema = z
  .object({
    serviceType: serviceTypeSchema,
    providerUserId: z
      .string()
      .trim()
      .regex(objectIdRegex, "providerUserId must be a valid MongoDB ObjectId"),
    serviceListingId: z
      .string()
      .trim()
      .regex(objectIdRegex, "serviceListingId must be a valid MongoDB ObjectId")
      .optional(),
    message: z.string().trim().min(3).max(1000).optional(),
    preferredDate: z.preprocess(parseDate, z.date()).optional(),
    eventDate: z.preprocess(parseDate, z.date()).optional(),
    eventType: z.string().trim().min(2).max(80).optional(),
    location: z.string().trim().min(2).max(120).optional(),
    budget: z.preprocess(parseOptionalNumber, z.number().min(0)).optional()
  })
  .superRefine((value, ctx) => {
    if (value.serviceType !== "decorator") {
      return;
    }

    if (!value.serviceListingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceListingId"],
        message: "serviceListingId is required for decorator booking"
      });
    }

    if (!value.eventDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventDate"],
        message: "eventDate is required for decorator booking"
      });
    }

    if (!value.eventType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventType"],
        message: "eventType is required for decorator booking"
      });
    }

    if (!value.location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "location is required for decorator booking"
      });
    }
  });

export const listBookableServicesQuerySchema = z
  .object({
    serviceType: serviceTypeSchema.optional(),
    expertise: z
      .preprocess(parseStringArray, z.array(z.string().trim().min(2).max(60)).max(10))
      .optional(),
    specialization: z
      .preprocess(parseStringArray, z.array(z.string().trim().min(2).max(80)).max(10))
      .optional(),
    eventType: z
      .preprocess(parseStringArray, z.array(z.string().trim().min(2).max(60)).max(10))
      .optional(),
    location: z.string().trim().min(2).max(120).optional(),
    minPrice: z.preprocess(parseOptionalNumber, z.number().min(0)).optional(),
    maxPrice: z.preprocess(parseOptionalNumber, z.number().min(0)).optional(),
    minExperienceYears: z.preprocess(parseOptionalNumber, z.number().int().min(0).max(60)).optional(),
    maxExperienceYears: z.preprocess(parseOptionalNumber, z.number().int().min(0).max(60)).optional(),
    limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
  })
  .superRefine((value, ctx) => {
    if (
      value.minPrice !== undefined &&
      value.maxPrice !== undefined &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minPrice"],
        message: "minPrice cannot be greater than maxPrice"
      });
    }

    if (
      value.minExperienceYears !== undefined &&
      value.maxExperienceYears !== undefined &&
      value.minExperienceYears > value.maxExperienceYears
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minExperienceYears"],
        message: "minExperienceYears cannot be greater than maxExperienceYears"
      });
    }
  });

export const listServiceBookingsQuerySchema = z.object({
  direction: z.enum(["incoming", "outgoing", "all"]).default("all"),
  status: z.enum(bookingStatuses).optional(),
  serviceType: serviceTypeSchema.optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const serviceBookingParamsSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .regex(objectIdRegex, "bookingId must be a valid MongoDB ObjectId")
});

export const updateServiceBookingStatusSchema = z
  .object({
    status: z.enum(["accepted", "rejected", "completed"]),
    responseNote: z.string().trim().min(3).max(500).optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.responseNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["responseNote"],
        message: "responseNote is required when status is rejected"
      });
    }
  });

