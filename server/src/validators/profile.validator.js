import { z } from "zod";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return value;
    }

    const numberValue = Number(trimmedValue);

    if (!Number.isNaN(numberValue)) {
      return numberValue;
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

const stringArraySchema = z.array(z.string().trim().min(1)).max(30);
const interestsSchema = z.preprocess(
  parseStringArray,
  z.array(z.string().trim().min(2).max(40)).max(30)
);

const partnerPreferencesSchema = z
  .object({
    minAge: z.preprocess(parseNumber, z.number().int().min(18).max(80)).optional(),
    maxAge: z.preprocess(parseNumber, z.number().int().min(18).max(80)).optional(),
    gender: z.enum(["male", "female", "other", "any"]).optional(),
    religion: z.preprocess(parseStringArray, stringArraySchema).optional(),
    caste: z.preprocess(parseStringArray, stringArraySchema).optional(),
    education: z.preprocess(parseStringArray, stringArraySchema).optional(),
    profession: z.preprocess(parseStringArray, stringArraySchema).optional(),
    interests: interestsSchema.optional(),
    minIncome: z.preprocess(parseNumber, z.number().min(0)).optional(),
    location: z.string().trim().min(2).max(120).optional(),
    bio: z.string().trim().max(1000).optional()
  })
  .refine(
    (values) => {
      if (values.minAge === undefined || values.maxAge === undefined) {
        return true;
      }

      return values.minAge <= values.maxAge;
    },
    {
      message: "partnerPreferences minAge cannot be greater than maxAge",
      path: ["minAge"]
    }
  );

const profileBaseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  age: z.preprocess(parseNumber, z.number().int().min(18).max(80)),
  gender: z.enum(["male", "female", "other"]),
  religion: z.string().trim().min(2).max(60),
  caste: z.string().trim().min(2).max(60),
  education: z.string().trim().min(2).max(120),
  profession: z.string().trim().min(2).max(120),
  income: z.preprocess(parseNumber, z.number().min(0)),
  location: z.string().trim().min(2).max(120),
  bio: z.string().trim().min(10).max(1000),
  interests: interestsSchema.optional(),
  partnerPreferences: z.preprocess(parseJsonObject, partnerPreferencesSchema).optional()
});

export const createProfileSchema = profileBaseSchema;

export const updateProfileSchema = profileBaseSchema
  .partial()
  .extend({
    removeImagePublicIds: z.preprocess(parseStringArray, z.array(z.string().trim().min(1)).max(30)).optional(),
    partnerPreferences: z.preprocess(parseJsonObject, partnerPreferencesSchema).optional()
  });

export const profileUserParamsSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(objectIdRegex, "userId must be a valid MongoDB ObjectId")
});
