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
    }
  },
  { _id: false }
);

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: DAYS_OF_WEEK,
      required: true
    },
    startTime: {
      type: String,
      trim: true,
      required: true
    },
    endTime: {
      type: String,
      trim: true,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: true
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

const lawyerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    specialization: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one specialization is required"
      }
    },
    experienceYears: {
      type: Number,
      required: true,
      min: 0,
      max: 60
    },
    barCouncilId: {
      type: String,
      trim: true,
      maxlength: 80
    },
    firmName: {
      type: String,
      trim: true,
      maxlength: 120
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120
    },
    languages: {
      type: [String],
      default: []
    },
    consultationMode: {
      type: String,
      enum: ["online", "offline", "both"],
      default: "both"
    },
    availability: {
      type: availabilitySchema,
      default: {}
    },
    availabilitySlots: {
      type: [availabilitySlotSchema],
      default: []
    },
    pricing: {
      type: pricingSchema,
      required: true
    },
    about: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

lawyerProfileSchema.index({ isActive: 1, updatedAt: -1 });
lawyerProfileSchema.index({ specialization: 1, experienceYears: 1, isActive: 1 });
lawyerProfileSchema.index({ "availabilitySlots.day": 1, isActive: 1 });

lawyerProfileSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const LawyerProfile = mongoose.model("LawyerProfile", lawyerProfileSchema);

export default LawyerProfile;
