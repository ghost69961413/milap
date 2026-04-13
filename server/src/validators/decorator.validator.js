import { z } from "zod";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const DECORATOR_EVENT_TYPES = [
  "wedding",
  "engagement",
  "reception",
  "sangeet",
  "mehendi",
  "haldi"
];

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

function parseJsonObject(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch (_error) {
    return value;
  }
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

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "true") {
      return true;
    }

    if (normalizedValue === "false") {
      return false;
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

const eventTypesSchema = z.preprocess(
  parseStringArray,
  z.array(z.enum(DECORATOR_EVENT_TYPES)).min(1).max(10)
);

const pricingBaseSchema = z.object({
  amount: z.preprocess(parseOptionalNumber, z.number().min(0)),
  currency: z.string().trim().min(1).max(10).default("INR"),
  pricingType: z.enum(["per_event", "per_day", "custom"]).default("per_event")
});

const pricingUpdateSchema = pricingBaseSchema.partial();

const pricingPackageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  amount: z.preprocess(parseOptionalNumber, z.number().min(0)),
  description: z.string().trim().max(600).optional(),
  includes: z.preprocess(
    parseStringArray,
    z.array(z.string().trim().min(2).max(100)).max(25)
  ).optional(),
  isPopular: z.preprocess(parseBoolean, z.boolean()).optional()
});

const pricingPackagesSchema = z.preprocess(
  parseJsonObject,
  z.array(pricingPackageSchema).max(10)
);

export const createDecoratorServiceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1200),
  eventTypes: eventTypesSchema,
  location: z.string().trim().min(2).max(120),
  pricing: z.preprocess(parseJsonObject, pricingBaseSchema),
  pricingPackages: pricingPackagesSchema.optional(),
  isActive: z.preprocess(parseBoolean, z.boolean()).optional()
});

export const updateDecoratorServiceSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(10).max(1200).optional(),
    eventTypes: eventTypesSchema.optional(),
    location: z.string().trim().min(2).max(120).optional(),
    pricing: z.preprocess(parseJsonObject, pricingUpdateSchema).optional(),
    pricingPackages: pricingPackagesSchema.optional(),
    removeImagePublicIds: z.preprocess(
      parseStringArray,
      z.array(z.string().trim().min(1)).max(30)
    ).optional(),
    isActive: z.preprocess(parseBoolean, z.boolean()).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update"
  });

export const serviceParamsSchema = z.object({
  serviceId: z
    .string()
    .trim()
    .regex(objectIdRegex, "serviceId must be a valid MongoDB ObjectId")
});

export const listDecoratorServicesQuerySchema = z
  .object({
    eventType: z
      .preprocess(parseStringArray, z.array(z.enum(DECORATOR_EVENT_TYPES)).max(10))
      .optional(),
    location: z.string().trim().min(2).max(120).optional(),
    minPrice: z.preprocess(parseOptionalNumber, z.number().min(0)).optional(),
    maxPrice: z.preprocess(parseOptionalNumber, z.number().min(0)).optional(),
    limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: "minPrice cannot be greater than maxPrice",
      path: ["minPrice"]
    }
  );

export const listMyDecoratorServicesQuerySchema = z.object({
  isActive: z.preprocess(parseBoolean, z.boolean()).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const requestDecoratorBookingSchema = z.object({
  serviceId: z
    .string()
    .trim()
    .regex(objectIdRegex, "serviceId must be a valid MongoDB ObjectId"),
  eventDate: z.preprocess(parseDate, z.date()),
  eventType: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(120),
  budget: z.preprocess(parseOptionalNumber, z.number().min(0)).optional(),
  notes: z.string().trim().max(1000).optional()
});

export const listDecoratorBookingsQuerySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "cancelled", "completed"]).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const bookingParamsSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .regex(objectIdRegex, "bookingId must be a valid MongoDB ObjectId")
});

export const respondDecoratorBookingSchema = z
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

export const cancelDecoratorBookingSchema = z.object({
  cancelReason: z.string().trim().min(3).max(500).optional()
});
