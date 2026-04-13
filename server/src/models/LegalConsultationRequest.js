import mongoose from "mongoose";

const legalConsultationHistoryEventSchema = new mongoose.Schema(
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

const legalConsultationRequestSchema = new mongoose.Schema(
  {
    lawyer: {
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
    caseSummary: {
      type: String,
      trim: true,
      maxlength: 1000
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
      type: [legalConsultationHistoryEventSchema],
      default: []
    }
  },
  { timestamps: true }
);

legalConsultationRequestSchema.index({ lawyer: 1, status: 1, updatedAt: -1 });
legalConsultationRequestSchema.index({ requester: 1, status: 1, updatedAt: -1 });
legalConsultationRequestSchema.index(
  { lawyer: 1, requester: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);

legalConsultationRequestSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const LegalConsultationRequest = mongoose.model(
  "LegalConsultationRequest",
  legalConsultationRequestSchema
);

export default LegalConsultationRequest;
