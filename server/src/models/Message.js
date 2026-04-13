import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: true,
      index: true
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        }
      ],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: "participants must contain exactly 2 users"
      }
    },
    interaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interaction",
      index: true
    },
    connectionRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectionRequest",
      index: true
    },
    serviceBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceBooking",
      index: true
    },
    chatAccessType: {
      type: String,
      enum: ["match", "service_connection"],
      required: true,
      index: true
    },
    serviceRole: {
      type: String,
      enum: ["consultant", "lawyer", "decorator"]
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    },
    readByReceiverAt: {
      type: Date
    }
  },
  { timestamps: true }
);

messageSchema.index({ conversationKey: 1, createdAt: -1 });

messageSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
