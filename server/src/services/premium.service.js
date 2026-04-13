import crypto from "node:crypto";
import mongoose from "mongoose";
import env from "../config/env.js";
import { getRazorpayClient } from "../config/razorpay.js";
import Payment from "../models/Payment.js";
import Profile from "../models/Profile.js";
import ProfileView from "../models/ProfileView.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

export const PREMIUM_PLANS = {
  premium_monthly: {
    id: "premium_monthly",
    name: "Premium Monthly",
    amountInPaise: 49900,
    durationDays: 30
  },
  premium_quarterly: {
    id: "premium_quarterly",
    name: "Premium Quarterly",
    amountInPaise: 129900,
    durationDays: 90
  }
};

export const FREE_DAILY_INTEREST_LIMIT = 20;
const PROFILE_BOOST_DURATION_HOURS = 24;
const DEFAULT_VIEWER_LIMIT = 50;

function getPlanDetails(planId) {
  const plan = PREMIUM_PLANS[planId];

  if (!plan) {
    throw new ApiError(400, "Invalid premium plan");
  }

  return plan;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeSubscription(subscription) {
  if (!subscription) {
    return null;
  }

  return {
    planId: subscription.planId,
    status: subscription.status,
    validFrom: subscription.validFrom,
    validUntil: subscription.validUntil,
    isActive: subscription.status === "active" && subscription.validUntil > new Date()
  };
}

async function markSubscriptionExpiredIfNeeded(subscription) {
  if (!subscription) {
    return null;
  }

  if (subscription.status === "active" && subscription.validUntil <= new Date()) {
    subscription.status = "expired";
    await subscription.save();
  }

  return subscription;
}

export async function getUserSubscription(userId) {
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const subscription = await Subscription.findOne({ user: userId });
  await markSubscriptionExpiredIfNeeded(subscription);

  if (subscription?.status === "active" && subscription.validUntil > new Date()) {
    return subscription;
  }

  return subscription || null;
}

export async function isUserPremiumActive(userId) {
  const subscription = await getUserSubscription(userId);

  const isPremium =
    Boolean(subscription) &&
    subscription.status === "active" &&
    subscription.validUntil > new Date();

  return {
    isPremium,
    subscription
  };
}

export async function assertPremiumAccess(userId) {
  const { isPremium } = await isUserPremiumActive(userId);

  if (!isPremium) {
    throw new ApiError(403, "This feature is available only for premium users");
  }
}

export async function createPremiumOrder(userId, planId) {
  const plan = getPlanDetails(planId);
  const razorpay = getRazorpayClient();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const existingPendingPayment = await Payment.findOne({
    user: userId,
    planId,
    status: "created",
    createdAt: { $gte: tenMinutesAgo }
  }).sort({ createdAt: -1 });

  if (existingPendingPayment) {
    return {
      keyId: env.razorpayKeyId,
      orderId: existingPendingPayment.razorpayOrderId,
      amount: existingPendingPayment.amount,
      currency: existingPendingPayment.currency,
      plan: {
        id: plan.id,
        name: plan.name,
        durationDays: plan.durationDays
      }
    };
  }

  const order = await razorpay.orders.create({
    amount: plan.amountInPaise,
    currency: "INR",
    receipt: `premium_${userId.toString().slice(-8)}_${Date.now()}`,
    notes: {
      userId: userId.toString(),
      planId
    }
  });

  await Payment.create({
    user: userId,
    planId,
    amount: order.amount,
    currency: order.currency,
    razorpayOrderId: order.id,
    status: "created",
    notes: order.notes
  });

  return {
    keyId: env.razorpayKeyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    plan: {
      id: plan.id,
      name: plan.name,
      durationDays: plan.durationDays
    }
  };
}

function isValidSignature(orderId, paymentId, signature) {
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(payload)
    .digest("hex");

  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function buildPaymentAndSubscriptionResponse(payment, subscription) {
  return {
    payment: {
      orderId: payment.razorpayOrderId,
      paymentId: payment.razorpayPaymentId,
      status: payment.status,
      planId: payment.planId,
      amount: payment.amount,
      currency: payment.currency
    },
    subscription: normalizeSubscription(subscription)
  };
}

async function activateOrExtendSubscription(userId, payment) {
  const plan = getPlanDetails(payment.planId);
  const now = new Date();
  const existingSubscription = await Subscription.findOne({ user: userId });

  const validFrom =
    existingSubscription?.status === "active" && existingSubscription.validUntil > now
      ? new Date(existingSubscription.validUntil)
      : now;

  const validUntil = new Date(
    validFrom.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
  );

  if (existingSubscription) {
    existingSubscription.planId = plan.id;
    existingSubscription.status = "active";
    existingSubscription.validFrom = validFrom;
    existingSubscription.validUntil = validUntil;
    existingSubscription.lastPaymentId = payment.razorpayPaymentId;
    existingSubscription.lastOrderId = payment.razorpayOrderId;
    await existingSubscription.save();
    return existingSubscription;
  }

  const subscription = await Subscription.create({
    user: userId,
    planId: plan.id,
    status: "active",
    validFrom,
    validUntil,
    lastPaymentId: payment.razorpayPaymentId,
    lastOrderId: payment.razorpayOrderId
  });

  return subscription;
}

export async function verifyPremiumPayment(userId, paymentVerificationPayload) {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature
  } = paymentVerificationPayload;

  if (!env.razorpayKeySecret) {
    throw new ApiError(500, "Razorpay credentials are not configured");
  }

  const payment = await Payment.findOne({
    user: userId,
    razorpayOrderId: orderId
  });

  if (!payment) {
    throw new ApiError(404, "Payment order not found");
  }

  const existingPaidPayment = await Payment.findOne({
    razorpayPaymentId: paymentId,
    status: "paid"
  });

  if (
    existingPaidPayment &&
    existingPaidPayment.razorpayOrderId !== orderId
  ) {
    throw new ApiError(409, "Payment id already linked with another order");
  }

  if (payment.status === "paid") {
    const existingSubscription = await getUserSubscription(userId);

    return buildPaymentAndSubscriptionResponse(payment, existingSubscription);
  }

  if (!isValidSignature(orderId, paymentId, signature)) {
    payment.status = "failed";
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    await payment.save();
    throw new ApiError(400, "Invalid payment signature");
  }

  const paidPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: { $ne: "paid" }
    },
    {
      $set: {
        status: "paid",
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      }
    },
    {
      new: true
    }
  );

  if (!paidPayment) {
    const latestPayment = await Payment.findById(payment._id);

    if (!latestPayment) {
      throw new ApiError(404, "Payment order not found");
    }

    const existingSubscription = await getUserSubscription(userId);

    return buildPaymentAndSubscriptionResponse(latestPayment, existingSubscription);
  }

  const subscription = await activateOrExtendSubscription(userId, paidPayment);

  return buildPaymentAndSubscriptionResponse(paidPayment, subscription);
}

export async function getPremiumStatus(userId) {
  const { isPremium, subscription } = await isUserPremiumActive(userId);

  return {
    isPremium,
    features: {
      profileViewers: isPremium,
      unlimitedInterests: isPremium,
      profileBoost: isPremium
    },
    freePlanLimits: {
      dailyInterestLimit: FREE_DAILY_INTEREST_LIMIT
    },
    subscription: normalizeSubscription(subscription),
    plans: Object.values(PREMIUM_PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      amountInPaise: plan.amountInPaise,
      durationDays: plan.durationDays
    }))
  };
}

export async function trackProfileView(ownerUserId, viewerUserId, profileId) {
  if (!isValidObjectId(ownerUserId) || !isValidObjectId(viewerUserId)) {
    return;
  }

  if (ownerUserId.toString() === viewerUserId.toString()) {
    return;
  }

  const now = new Date();
  const bucketKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}-${String(now.getUTCHours()).padStart(2, "0")}`;

  await ProfileView.updateOne(
    {
      ownerUser: ownerUserId,
      viewerUser: viewerUserId,
      bucketKey
    },
    {
      $set: {
        profile: profileId,
        viewedAt: now
      },
      $setOnInsert: {
        ownerUser: ownerUserId,
        viewerUser: viewerUserId,
        bucketKey
      }
    },
    {
      upsert: true
    }
  );
}

export async function getPremiumProfileViewers(userId, options = {}) {
  await assertPremiumAccess(userId);

  const limit = Math.min(Math.max(options.limit ?? DEFAULT_VIEWER_LIMIT, 1), 100);

  const aggregationResult = await ProfileView.aggregate([
    {
      $match: {
        ownerUser: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $sort: {
        viewedAt: -1
      }
    },
    {
      $group: {
        _id: "$viewerUser",
        lastViewedAt: { $first: "$viewedAt" },
        viewCount: { $sum: 1 }
      }
    },
    {
      $sort: {
        lastViewedAt: -1
      }
    },
    {
      $limit: limit
    }
  ]);

  const viewerIds = aggregationResult.map((item) => item._id);

  const [viewerUsers, viewerProfiles] = await Promise.all([
    User.find({ _id: { $in: viewerIds } }).select("_id fullName"),
    Profile.find({ user: { $in: viewerIds } }).select("_id user name age location profession images")
  ]);

  const usersById = new Map(
    viewerUsers.map((user) => [user._id.toString(), user])
  );
  const profilesByUserId = new Map(
    viewerProfiles.map((profile) => [profile.user.toString(), profile])
  );

  const viewers = aggregationResult.map((item) => {
    const viewerId = item._id.toString();
    const user = usersById.get(viewerId);
    const profile = profilesByUserId.get(viewerId);

    return {
      viewerUserId: viewerId,
      fullName: user?.fullName || profile?.name || "Unknown",
      profile: profile
        ? {
            profileId: profile._id.toString(),
            name: profile.name,
            age: profile.age,
            location: profile.location,
            profession: profile.profession,
            primaryImage: profile.images?.[0]?.url || null
          }
        : null,
      lastViewedAt: item.lastViewedAt,
      viewCount: item.viewCount
    };
  });

  return {
    totalViewers: viewers.length,
    viewers
  };
}

export async function boostProfileForPremium(userId) {
  await assertPremiumAccess(userId);

  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  const now = new Date();

  if (profile.boostExpiresAt && profile.boostExpiresAt > now) {
    throw new ApiError(
      409,
      `Profile is already boosted until ${profile.boostExpiresAt.toISOString()}`
    );
  }

  const boostExpiresAt = new Date(
    now.getTime() + PROFILE_BOOST_DURATION_HOURS * 60 * 60 * 1000
  );

  profile.boostExpiresAt = boostExpiresAt;
  profile.lastBoostedAt = now;
  profile.boostCount += 1;
  await profile.save();

  return {
    profileId: profile._id.toString(),
    boostCount: profile.boostCount,
    boostedAt: now,
    boostExpiresAt
  };
}
