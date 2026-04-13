import mongoose from "mongoose";

const connectionHistoryEventSchema = new mongoose.Schema(
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

const connectionRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    providerRole: {
      type: String,
      enum: ["consultant", "lawyer", "decorator"],
      required: true
    },
    linkedServiceType: {
      type: String,
      enum: ["consultant_profile", "lawyer_profile", "decorator_service"],
      required: true
    },
    linkedServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
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
    responseNote: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    },
    history: {
      type: [connectionHistoryEventSchema],
      default: []
    }
  },
  { timestamps: true }
);

connectionRequestSchema.index({ provider: 1, status: 1, updatedAt: -1 });
connectionRequestSchema.index({ requester: 1, status: 1, updatedAt: -1 });
connectionRequestSchema.index(
  {
    requester: 1,
    provider: 1,
    providerRole: 1,
    linkedServiceType: 1,
    linkedServiceId: 1,
    status: 1
  },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);

connectionRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const ConnectionRequest = mongoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequest;
