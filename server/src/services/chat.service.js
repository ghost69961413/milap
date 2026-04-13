import mongoose from "mongoose";
import ConnectionRequest from "../models/ConnectionRequest.js";
import Interaction from "../models/Interaction.js";
import Message from "../models/Message.js";
import ServiceBooking from "../models/ServiceBooking.js";
import ApiError from "../utils/ApiError.js";

const MAX_CHAT_LIMIT = 100;

function buildPairKey(userIdA, userIdB) {
  return [userIdA.toString(), userIdB.toString()].sort().join(":");
}

function ensureObjectId(value, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${fieldName} is invalid`);
  }
}

function normalizeContent(content) {
  if (typeof content !== "string") {
    return "";
  }

  return content.trim();
}

function mapMessage(message, currentUserId) {
  return {
    messageId: message._id.toString(),
    interactionId: message.interaction ? message.interaction.toString() : null,
    connectionRequestId: message.connectionRequest
      ? message.connectionRequest.toString()
      : null,
    serviceBookingId: message.serviceBooking ? message.serviceBooking.toString() : null,
    chatAccessType:
      message.chatAccessType || (message.connectionRequest ? "service_connection" : "match"),
    serviceRole: message.serviceRole || null,
    senderUserId: message.sender.toString(),
    receiverUserId: message.receiver.toString(),
    content: message.content,
    deliveredAt: message.deliveredAt,
    readByReceiverAt: message.readByReceiverAt || null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    isMine: message.sender.toString() === currentUserId.toString()
  };
}

async function getAcceptedInteractionForPair(userIdA, userIdB) {
  const pairKey = buildPairKey(userIdA, userIdB);

  const interaction = await Interaction.findOne({
    pairKey,
    relationshipStatus: "accepted"
  }).select("_id pairKey participants relationshipStatus");

  return interaction;
}

async function getAcceptedServiceConnectionForPair(userIdA, userIdB) {
  const connectionRequest = await ConnectionRequest.findOne({
    status: "accepted",
    $or: [
      {
        requester: userIdA,
        provider: userIdB
      },
      {
        requester: userIdB,
        provider: userIdA
      }
    ]
  })
    .sort({ updatedAt: -1 })
    .select("_id providerRole status requester provider linkedServiceType linkedServiceId");

  return connectionRequest;
}

async function getAcceptedServiceBookingForPair(userIdA, userIdB) {
  const booking = await ServiceBooking.findOne({
    status: "accepted",
    $or: [
      {
        requester: userIdA,
        provider: userIdB
      },
      {
        requester: userIdB,
        provider: userIdA
      }
    ]
  })
    .sort({ updatedAt: -1 })
    .select("_id serviceType providerRole status requester provider");

  return booking;
}

async function getAcceptedChatAccessForPair(userIdA, userIdB) {
  const pairKey = buildPairKey(userIdA, userIdB);
  const interaction = await getAcceptedInteractionForPair(userIdA, userIdB);

  if (interaction) {
    return {
      pairKey,
      chatAccessType: "match",
      interactionId: interaction._id,
      connectionRequestId: null,
      serviceBookingId: null,
      serviceRole: null
    };
  }

  const connectionRequest = await getAcceptedServiceConnectionForPair(userIdA, userIdB);

  if (connectionRequest) {
    return {
      pairKey,
      chatAccessType: "service_connection",
      interactionId: null,
      connectionRequestId: connectionRequest._id,
      serviceBookingId: null,
      serviceRole: connectionRequest.providerRole || null
    };
  }

  const serviceBooking = await getAcceptedServiceBookingForPair(userIdA, userIdB);

  if (serviceBooking) {
    return {
      pairKey,
      chatAccessType: "service_connection",
      interactionId: null,
      connectionRequestId: null,
      serviceBookingId: serviceBooking._id,
      serviceRole: serviceBooking.providerRole || serviceBooking.serviceType || null
    };
  }

  throw new ApiError(
    403,
    "Chat is available only after accepted match interest or accepted service request"
  );
}

export async function sendChatMessage(senderUserId, receiverUserId, content) {
  ensureObjectId(senderUserId, "senderUserId");
  ensureObjectId(receiverUserId, "receiverUserId");

  if (senderUserId.toString() === receiverUserId.toString()) {
    throw new ApiError(400, "You cannot message yourself");
  }

  const normalizedContent = normalizeContent(content);

  if (!normalizedContent) {
    throw new ApiError(400, "Message content is required");
  }

  if (normalizedContent.length > 1000) {
    throw new ApiError(400, "Message content must be at most 1000 characters");
  }

  const chatAccess = await getAcceptedChatAccessForPair(senderUserId, receiverUserId);

  const message = await Message.create({
    conversationKey: chatAccess.pairKey,
    participants: [senderUserId, receiverUserId],
    interaction: chatAccess.interactionId,
    connectionRequest: chatAccess.connectionRequestId,
    serviceBooking: chatAccess.serviceBookingId,
    chatAccessType: chatAccess.chatAccessType,
    serviceRole: chatAccess.serviceRole,
    sender: senderUserId,
    receiver: receiverUserId,
    content: normalizedContent
  });

  return mapMessage(message, senderUserId);
}

export async function getConversationMessages(currentUserId, otherUserId, options = {}) {
  ensureObjectId(currentUserId, "currentUserId");
  ensureObjectId(otherUserId, "otherUserId");

  if (currentUserId.toString() === otherUserId.toString()) {
    throw new ApiError(400, "Invalid conversation target");
  }

  const chatAccess = await getAcceptedChatAccessForPair(currentUserId, otherUserId);

  const limit = Math.min(Math.max(options.limit ?? 30, 1), MAX_CHAT_LIMIT);

  const query = {
    conversationKey: chatAccess.pairKey
  };

  if (options.before) {
    const beforeDate = new Date(options.before);
    query.createdAt = { $lt: beforeDate };
  }

  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit);

  return {
    conversationWithUserId: otherUserId.toString(),
    interactionId: chatAccess.interactionId ? chatAccess.interactionId.toString() : null,
    connectionRequestId: chatAccess.connectionRequestId
      ? chatAccess.connectionRequestId.toString()
      : null,
    serviceBookingId: chatAccess.serviceBookingId
      ? chatAccess.serviceBookingId.toString()
      : null,
    chatAccessType: chatAccess.chatAccessType,
    serviceRole: chatAccess.serviceRole || null,
    totalMessages: messages.length,
    messages: messages.reverse().map((message) => mapMessage(message, currentUserId))
  };
}
