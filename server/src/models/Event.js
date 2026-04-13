import mongoose from "mongoose";

const eventServiceProviderSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["consultant", "lawyer", "decorator"],
      required: true
    },
    providerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true
    },
    eventType: {
      type: String,
      enum: ["engagement", "wedding"],
      required: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120
    },
    eventDate: {
      type: Date
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
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    status: {
      type: String,
      enum: ["planning", "confirmed", "completed", "cancelled"],
      default: "planning",
      index: true
    },
    serviceProviders: {
      type: [eventServiceProviderSchema],
      default: []
    }
  },
  { timestamps: true }
);

eventSchema.index({ user: 1, eventDate: 1, status: 1 });
eventSchema.index({ user: 1, eventType: 1, createdAt: -1 });

eventSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Event = mongoose.model("Event", eventSchema);

export default Event;
