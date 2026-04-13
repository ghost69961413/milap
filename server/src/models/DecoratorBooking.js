import mongoose from "mongoose";

const decoratorBookingHistoryEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["requested", "accepted", "rejected", "cancelled", "completed"],
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

const decoratorBookingSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DecoratorService",
      required: true,
      index: true
    },
    decorator: {
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
    eventDate: {
      type: Date,
      required: true
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    budget: {
      type: Number,
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
      default: "pending",
      index: true
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
      type: [decoratorBookingHistoryEventSchema],
      default: []
    }
  },
  { timestamps: true }
);

decoratorBookingSchema.index({ decorator: 1, status: 1, updatedAt: -1 });
decoratorBookingSchema.index({ requester: 1, status: 1, updatedAt: -1 });
decoratorBookingSchema.index(
  { service: 1, requester: 1, eventDate: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);

decoratorBookingSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const DecoratorBooking = mongoose.model("DecoratorBooking", decoratorBookingSchema);

export default DecoratorBooking;
