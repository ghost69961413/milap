import { z } from "zod";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const weekDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
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

const expertiseSchema = z.preprocess(
  parseStringArray,
  z.array(z.string().trim().min(2).max(60)).min(1).max(25)
);

const availabilityBaseSchema = z.object({
  days: z.preprocess(parseStringArray, z.array(z.enum(weekDays)).min(1).max(7)),
  startTime: z.string().trim().regex(timeRegex, "startTime must be in HH:mm format"),
  endTime: z.string().trim().regex(timeRegex, "endTime must be in HH:mm format"),
  mode: z.enum(["online", "offline", "both"]).default("online"),
  notes: z.string().trim().max(300).optional()
});

const availabilitySchema = availabilityBaseSchema.refine(
  (value) => value.startTime < value.endTime,
  {
    message: "availability startTime must be earlier than endTime",
    path: ["startTime"]
  }
);

const pricingBaseSchema = z.object({
  amount: z.preprocess(parseOptionalNumber, z.number().min(0)),
  currency: z.string().trim().min(1).max(10).default("INR"),
  unit: z.enum(["session", "hour"]).default("session")
});

const availabilityUpdateSchema = availabilityBaseSchema.partial().superRefine((value, ctx) => {
  if (value.startTime && value.endTime && value.startTime >= value.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startTime"],
      message: "availability startTime must be earlier than endTime"
    });
  }
});

const pricingUpdateSchema = pricingBaseSchema.partial();

export const createConsultantProfileSchema = z.object({
  expertise: expertiseSchema,
  availability: z.preprocess(parseJsonObject, availabilitySchema),
  pricing: z.preprocess(parseJsonObject, pricingBaseSchema),
  about: z.string().trim().max(800).optional(),
  isActive: z.preprocess(parseBoolean, z.boolean()).optional()
});

export const applyConsultantRoleSchema = z.object({
  note: z.string().trim().min(10).max(500).optional()
});

export const updateConsultantProfileSchema = z
  .object({
    expertise: expertiseSchema.optional(),
    availability: z.preprocess(parseJsonObject, availabilityUpdateSchema).optional(),
    pricing: z.preprocess(parseJsonObject, pricingUpdateSchema).optional(),
    about: z.string().trim().max(800).optional(),
    isActive: z.preprocess(parseBoolean, z.boolean()).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update"
  });

export const listConsultantsQuerySchema = z.object({
  expertise: z
    .preprocess(parseStringArray, z.array(z.string().trim().min(2).max(60)).max(10))
    .optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const requestConsultationSchema = z.object({
  consultantUserId: z
    .string()
    .trim()
    .regex(objectIdRegex, "consultantUserId must be a valid MongoDB ObjectId"),
  message: z.string().trim().min(5).max(500).optional(),
  preferredDate: z.preprocess(parseDate, z.date()).optional()
});

export const listConsultationRequestsQuerySchema = z.object({
  status: z.enum(["pending", "accepted", "rejected", "cancelled"]).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const consultationRequestParamsSchema = z.object({
  requestId: z
    .string()
    .trim()
    .regex(objectIdRegex, "requestId must be a valid MongoDB ObjectId")
});

export const consultantConnectionParamsSchema = z.object({
  connectionId: z
    .string()
    .trim()
    .regex(objectIdRegex, "connectionId must be a valid MongoDB ObjectId")
});

export const createConsultantConnectionSchema = z.object({
  consultantUserId: z
    .string()
    .trim()
    .regex(objectIdRegex, "consultantUserId must be a valid MongoDB ObjectId"),
  message: z.string().trim().min(3).max(1000).optional(),
  preferredDate: z.preprocess(parseDate, z.date()).optional()
});

export const listConsultantConnectionsQuerySchema = z.object({
  direction: z.enum(["incoming", "outgoing", "all"]).default("all"),
  status: z.enum(["pending", "accepted", "rejected", "completed"]).optional(),
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});

export const respondConsultantConnectionSchema = z
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

export const respondConsultationSchema = z
  .object({
    status: z.enum(["accepted", "rejected"]),
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
