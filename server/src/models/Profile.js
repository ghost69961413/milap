import mongoose from "mongoose";

const profileImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true
    },
    publicId: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const partnerPreferencesSchema = new mongoose.Schema(
  {
    minAge: {
      type: Number,
      min: 18,
      max: 80
    },
    maxAge: {
      type: Number,
      min: 18,
      max: 80
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "any"],
      default: "any"
    },
    religion: {
      type: [String],
      default: []
    },
    caste: {
      type: [String],
      default: []
    },
    education: {
      type: [String],
      default: []
    },
    profession: {
      type: [String],
      default: []
    },
    interests: {
      type: [String],
      default: []
    },
    minIncome: {
      type: Number,
      min: 0
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    age: {
      type: Number,
      required: true,
      min: 18,
      max: 80
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true
    },
    religion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    caste: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    education: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    profession: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    income: {
      type: Number,
      required: true,
      min: 0
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    bio: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000
    },
    interests: {
      type: [String],
      default: []
    },
    images: {
      type: [profileImageSchema],
      default: []
    },
    boostExpiresAt: {
      type: Date,
      default: null
    },
    boostCount: {
      type: Number,
      default: 0
    },
    lastBoostedAt: {
      type: Date,
      default: null
    },
    partnerPreferences: {
      type: partnerPreferencesSchema,
      default: {}
    }
  },
  { timestamps: true }
);

profileSchema.index({ gender: 1, age: 1, location: 1, religion: 1, caste: 1 });

profileSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;
