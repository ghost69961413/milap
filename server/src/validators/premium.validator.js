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

export const createPremiumOrderSchema = z.object({
  planId: z.enum(["premium_monthly", "premium_quarterly"])
});

export const verifyPremiumPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1)
});

export const premiumViewersQuerySchema = z.object({
  limit: z.preprocess(parseOptionalNumber, z.number().int().min(1).max(100)).optional()
});
