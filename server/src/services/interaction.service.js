import mongoose from "mongoose";
import DailyUsage from "../models/DailyUsage.js";
import Interaction from "../models/Interaction.js";
import Profile from "../models/Profile.js";
import ApiError from "../utils/ApiError.js";
import {
  FREE_DAILY_INTEREST_LIMIT,
  isUserPremiumActive
} from "./premium.service.js";

function buildPairKey(userIdA, userIdB) {
  return [userIdA.toString(), userIdB.toString()].sort().join(":");
}

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} is invalid`);
  }
}

function isSameId(idA, idB) {
  return idA.toString() === idB.toString();
}

function toInteractionResponse(interaction, currentUserId) {
  const history = (interaction.history || []).map((event) => ({
    action: event.action,
    by: event.by.toString(),
    at: event.at,
    note: event.note || null
  }));

  const requesterUserId = interaction.requester.toString();
  const receiverUserId = interaction.receiver.toString();
  const counterpartUserId = isSameId(requesterUserId, currentUserId)
    ? receiverUserId
    : requesterUserId;

  return {
    interactionId: interaction._id.toString(),
    requesterUserId,
    receiverUserId,
    counterpartUserId,
    relationshipStatus: interaction.relationshipStatus,
    isIncomingPending:
      interaction.relationshipStatus === "pending" &&
      isSameId(interaction.receiver, currentUserId),
    isOutgoingPending:
      interaction.relationshipStatus === "pending" &&
      isSameId(interaction.requester, currentUserId),
    history,
    createdAt: interaction.createdAt,
    updatedAt: interaction.updatedAt
  };
}

async function assertProfilesExist(senderUserId, receiverUserId) {
  const [senderProfile, receiverProfile] = await Promise.all([
    Profile.findOne({ user: senderUserId }).select("_id user"),
    Profile.findOne({ user: receiverUserId }).select("_id user")
  ]);

  if (!senderProfile) {
    throw new ApiError(400, "Please create your profile before sending interests");
  }

  if (!receiverProfile) {
    throw new ApiError(404, "Receiver profile not found");
  }
}

function getUtcDateKey(date = new Date()) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

async function consumeInterestQuota(senderUserId) {
  const { isPremium } = await isUserPremiumActive(senderUserId);

  if (isPremium) {
    return;
  }

  const dateKey = getUtcDateKey();
  const quotaFilter = {
    user: senderUserId,
    dateKey,
    interestsSentCount: { $lt: FREE_DAILY_INTEREST_LIMIT }
  };

  const incrementedExistingUsage = await DailyUsage.findOneAndUpdate(
    quotaFilter,
    {
      $inc: {
        interestsSentCount: 1
      }
    },
    {
      new: true
    }
  );

  if (incrementedExistingUsage) {
    return;
  }

  try {
    await DailyUsage.create({
      user: senderUserId,
      dateKey,
      interestsSentCount: 1
    });
    return;
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  const incrementedAfterRace = await DailyUsage.findOneAndUpdate(
    quotaFilter,
    {
      $inc: {
        interestsSentCount: 1
      }
    },
    {
      new: true
    }
  );

  if (incrementedAfterRace) {
    return;
  }

  throw new ApiError(
    403,
    `Free daily interest limit reached (${FREE_DAILY_INTEREST_LIMIT}). Upgrade to premium for unlimited interests.`
  );
}

export async function sendInterestRequest(senderUserId, receiverUserId) {
  ensureObjectId(senderUserId, "senderUserId");
  ensureObjectId(receiverUserId, "receiverUserId");

  if (isSameId(senderUserId, receiverUserId)) {
    throw new ApiError(400, "You cannot send interest to yourself");
  }

  await assertProfilesExist(senderUserId, receiverUserId);

  const pairKey = buildPairKey(senderUserId, receiverUserId);
  const existingInteraction = await Interaction.findOne({ pairKey });

  if (!existingInteraction) {
    await consumeInterestQuota(senderUserId);

    const createdInteraction = await Interaction.create({
      pairKey,
      participants: [senderUserId, receiverUserId],
      requester: senderUserId,
      receiver: receiverUserId,
      relationshipStatus: "pending",
      history: [
        {
          action: "interest_sent",
          by: senderUserId,
          note: "Interest request sent"
        }
      ]
    });

    return toInteractionResponse(createdInteraction, senderUserId);
  }

  if (existingInteraction.relationshipStatus === "pending") {
    if (isSameId(existingInteraction.receiver, senderUserId)) {
      throw new ApiError(
        409,
        "You already have an incoming interest from this user. Please accept or reject it."
      );
    }

    throw new ApiError(409, "Interest request already pending for this user");
  }

  if (existingInteraction.relationshipStatus === "accepted") {
    throw new ApiError(409, "You are already connected with this user");
  }

  await consumeInterestQuota(senderUserId);

  existingInteraction.requester = senderUserId;
  existingInteraction.receiver = receiverUserId;
  existingInteraction.relationshipStatus = "pending";
  existingInteraction.history.push({
    action: "interest_sent",
    by: senderUserId,
    note: "Interest request re-opened"
  });

  await existingInteraction.save();

  return toInteractionResponse(existingInteraction, senderUserId);
}

async function resolvePendingInteractionForReceiver(userId, interactionId) {
  ensureObjectId(interactionId, "interactionId");

  const interaction = await Interaction.findById(interactionId);

  if (!interaction) {
    throw new ApiError(404, "Interaction not found");
  }

  const isParticipant = interaction.participants.some((participantId) =>
    isSameId(participantId, userId)
  );

  if (!isParticipant) {
    throw new ApiError(403, "You are not allowed to update this interaction");
  }

  if (interaction.relationshipStatus !== "pending") {
    throw new ApiError(
      400,
      `Interaction is already ${interaction.relationshipStatus}. Only pending interactions can be updated.`
    );
  }

  if (!isSameId(interaction.receiver, userId)) {
    throw new ApiError(403, "Only the receiver can accept or reject this interaction");
  }

  return interaction;
}

export async function acceptInterestRequest(userId, interactionId) {
  const interaction = await resolvePendingInteractionForReceiver(userId, interactionId);

  interaction.relationshipStatus = "accepted";
  interaction.history.push({
    action: "accepted",
    by: userId,
    note: "Interest accepted"
  });

  await interaction.save();

  return toInteractionResponse(interaction, userId);
}

export async function rejectInterestRequest(userId, interactionId) {
  const interaction = await resolvePendingInteractionForReceiver(userId, interactionId);

  interaction.relationshipStatus = "rejected";
  interaction.history.push({
    action: "rejected",
    by: userId,
    note: "Interest rejected"
  });

  await interaction.save();

  return toInteractionResponse(interaction, userId);
}

export async function listUserInteractions(userId, options = {}) {
  const limit = options.limit ?? 50;
  const query = {
    participants: userId
  };

  if (options.status) {
    query.relationshipStatus = options.status;
  }

  const interactions = await Interaction.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit);

  return {
    totalInteractions: interactions.length,
    interactions: interactions.map((interaction) =>
      toInteractionResponse(interaction, userId)
    )
  };
}
