import mongoose from "mongoose";

const DECORATOR_EVENT_TYPES = [
  "wedding",
  "engagement",
  "reception",
  "sangeet",
  "mehendi",
  "haldi"
];

const decoratorPortfolioImageSchema = new mongoose.Schema(
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
    pricingType: {
      type: String,
      enum: ["per_event", "per_day", "custom"],
      default: "per_event"
    }
  },
  { _id: false }
);

const pricingPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: 600
    },
    includes: {
      type: [String],
      default: []
    },
    isPopular: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const decoratorServiceSchema = new mongoose.Schema(
  {
    decorator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1200
    },
    eventTypes: {
      type: [String],
      enum: DECORATOR_EVENT_TYPES,
      required: true,
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one event type is required"
      }
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    pricing: {
      type: pricingSchema,
      required: true
    },
    pricingPackages: {
      type: [pricingPackageSchema],
      default: []
    },
    portfolioImages: {
      type: [decoratorPortfolioImageSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

decoratorServiceSchema.index({ decorator: 1, updatedAt: -1 });
decoratorServiceSchema.index({ eventTypes: 1, location: 1, isActive: 1 });
decoratorServiceSchema.index({ "pricingPackages.amount": 1, isActive: 1 });

decoratorServiceSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const DecoratorService = mongoose.model("DecoratorService", decoratorServiceSchema);

export default DecoratorService;
