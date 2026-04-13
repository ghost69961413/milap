import Razorpay from "razorpay";
import env from "./env.js";
import ApiError from "../utils/ApiError.js";

let razorpayClient = null;

export function getRazorpayClient() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new ApiError(500, "Razorpay credentials are not configured");
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret
    });
  }

  return razorpayClient;
}
