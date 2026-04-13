import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    planId: {
      type: String,
      required: true,
      enum: ["premium_monthly", "premium_quarterly"]
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true
    },
    validFrom: {
      type: Date,
      required: true
    },
    validUntil: {
      type: Date,
      required: true,
      index: true
    },
    lastPaymentId: {
      type: String,
      trim: true
    },
    lastOrderId: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

subscriptionSchema.methods.isActive = function isActive() {
  return this.status === "active" && this.validUntil > new Date();
};

subscriptionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
