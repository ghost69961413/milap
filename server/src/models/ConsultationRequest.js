import mongoose from "mongoose";

const consultationHistoryEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["requested", "accepted", "rejected", "cancelled"],
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
      maxlength: 500
    }
  },
  { _id: false }
);

const consultationRequestSchema = new mongoose.Schema(
  {
    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },
    preferredDate: {
      type: Date
    },
    responseNote: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    },
    history: {
      type: [consultationHistoryEventSchema],
      default: []
    }
  },
  { timestamps: true }
);

consultationRequestSchema.index({ consultant: 1, status: 1, updatedAt: -1 });
consultationRequestSchema.index({ requester: 1, status: 1, updatedAt: -1 });
consultationRequestSchema.index(
  { consultant: 1, requester: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);

consultationRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const ConsultationRequest = mongoose.model(
  "ConsultationRequest",
  consultationRequestSchema
);

export default ConsultationRequest;
