import { z } from "zod";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const verificationDocumentTypes = [
  "police_verification",
  "government_id",
  "additional_optional_document",
  "law_degree",
  "decorator_owner_government_id",
  "decorator_police_noc"
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

function normalizeDocumentType(value) {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, "_");

  const aliasMap = new Map([
    ["police", "police_verification"],
    ["police_doc", "police_verification"],
    ["govt_id", "government_id"],
    ["id_proof", "government_id"],
    ["governmentid", "government_id"],
    ["optional_document", "additional_optional_document"],
    ["third_document", "additional_optional_document"],
    ["lawdegree", "law_degree"],
    ["owner_govt_id", "decorator_owner_government_id"],
    ["company_owner_id", "decorator_owner_government_id"],
    ["noc", "decorator_police_noc"],
    ["police_noc", "decorator_police_noc"]
  ]);

  return aliasMap.get(normalizedValue) || normalizedValue;
}

export const uploadVerificationDocumentSchema = z.object({
  documentType: z
    .preprocess(normalizeDocumentType, z.enum(verificationDocumentTypes))
    .default("police_verification")
});

export const policeVerificationUserParamsSchema = z.object({
  userId: z
    .string()
    .trim()
    .regex(objectIdRegex, "userId must be a valid MongoDB ObjectId")
});

export const reviewPoliceVerificationSchema = z
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

export const listPendingPoliceVerificationQuerySchema = z.object({
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});
