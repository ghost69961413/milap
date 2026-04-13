import mongoose from "mongoose";

const interactionHistoryEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["interest_sent", "accepted", "rejected"],
      required: true
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    at: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },
  { _id: false }
);

const interactionSchema = new mongoose.Schema(
  {
    pairKey: {
      type: String,
      required: true,
      unique: true,
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
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    relationshipStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true
    },
    history: {
      type: [interactionHistoryEventSchema],
      default: []
    }
  },
  { timestamps: true }
);

interactionSchema.index({ participants: 1, relationshipStatus: 1, updatedAt: -1 });

interactionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Interaction = mongoose.model("Interaction", interactionSchema);

export default Interaction;
