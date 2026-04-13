import { z } from "zod";

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

export const getMatchesQuerySchema = z.object({
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(50)).optional(),
  minScore: z.preprocess(parseOptionalNumber, z.number().int().min(0).max(100)).optional()
});
