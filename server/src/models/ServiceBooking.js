import mongoose from "mongoose";

const BOOKING_SERVICE_TYPES = ["consultant", "lawyer", "decorator"];
const BOOKING_PROVIDER_ROLES = ["consultant", "lawyer", "decorator"];
const BOOKING_STATUS = ["pending", "accepted", "rejected", "completed"];
const BOOKING_SERVICE_MODELS = ["ConsultantProfile", "LawyerProfile", "DecoratorService"];

const serviceBookingHistoryEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["requested", "accepted", "rejected", "completed"],
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

const serviceBookingSchema = new mongoose.Schema(
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
      enum: BOOKING_PROVIDER_ROLES,
      required: true,
      index: true
    },
    serviceType: {
      type: String,
      enum: BOOKING_SERVICE_TYPES,
      required: true,
      index: true
    },
    serviceListingModel: {
      type: String,
      enum: BOOKING_SERVICE_MODELS,
      required: true
    },
    serviceListing: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "serviceListingModel",
      index: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    preferredDate: {
      type: Date
    },
    eventDate: {
      type: Date
    },
    eventType: {
      type: String,
      trim: true,
      maxlength: 80
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120
    },
    budget: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: BOOKING_STATUS,
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
    completedAt: {
      type: Date
    },
    history: {
      type: [serviceBookingHistoryEventSchema],
      default: []
    }
  },
  { timestamps: true }
);

serviceBookingSchema.index({ provider: 1, status: 1, updatedAt: -1 });
serviceBookingSchema.index({ requester: 1, status: 1, updatedAt: -1 });
serviceBookingSchema.index({ serviceType: 1, status: 1, updatedAt: -1 });
serviceBookingSchema.index(
  {
    requester: 1,
    provider: 1,
    serviceType: 1,
    serviceListing: 1,
    eventDate: 1,
    status: 1
  },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);

serviceBookingSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const ServiceBooking = mongoose.model("ServiceBooking", serviceBookingSchema);

export default ServiceBooking;

