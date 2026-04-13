import mongoose from "mongoose";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const availabilitySchema = new mongoose.Schema(
  {
    days: {
      type: [String],
      enum: DAYS_OF_WEEK,
      default: []
    },
    startTime: {
      type: String,
      trim: true
    },
    endTime: {
      type: String,
      trim: true
    },
    mode: {
      type: String,
      enum: ["online", "offline", "both"],
      default: "online"
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300
    }
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      trim: true,
      default: "INR",
      maxlength: 10
    },
    unit: {
      type: String,
      enum: ["session", "hour"],
      default: "session"
    }
  },
  { _id: false }
);

const consultantProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    expertise: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one expertise value is required"
      }
    },
    availability: {
      type: availabilitySchema,
      required: true
    },
    pricing: {
      type: pricingSchema,
      required: true
    },
    about: {
      type: String,
      trim: true,
      maxlength: 800
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

consultantProfileSchema.index({ isActive: 1, updatedAt: -1 });
consultantProfileSchema.index({ expertise: 1, isActive: 1 });

consultantProfileSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const ConsultantProfile = mongoose.model("ConsultantProfile", consultantProfileSchema);

export default ConsultantProfile;
